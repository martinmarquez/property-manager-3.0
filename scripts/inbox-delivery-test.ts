#!/usr/bin/env npx tsx
/**
 * Inbox Delivery Test Script
 *
 * Sends test messages across inbox channels via the tRPC API and verifies
 * delivery status transitions (queued -> sent -> delivered).
 *
 * Environment variables:
 *   BASE_URL              — API base URL (required)
 *   API_TOKEN             — Bearer token for auth (required)
 *   CHANNELS              — Comma-separated channel list (default: all 8)
 *   MESSAGES_PER_CHANNEL  — Messages to send per channel (default: 1000)
 *   CONCURRENCY           — Max concurrent requests (default: 50)
 *   DELIVERY_TIMEOUT_MS   — Max ms to wait for delivery per message (default: 30000)
 *   POLL_INTERVAL_MS      — Polling interval for delivery status (default: 500)
 *   DELIVERY_OUTPUT_FILE  — Write JSON summary to this path if set
 *
 * Exit codes:
 *   0 — All channels at or above 99.9% delivery rate
 *   1 — At least one channel below 99.9% delivery rate
 */

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------

const BASE_URL = process.env.BASE_URL;
const API_TOKEN = process.env.API_TOKEN;

if (!BASE_URL) {
  console.error("ERROR: BASE_URL env var is required");
  process.exit(1);
}
if (!API_TOKEN) {
  console.error("ERROR: API_TOKEN env var is required");
  process.exit(1);
}

const ALL_CHANNELS = [
  "email_gmail",
  "email_outlook",
  "email_imap",
  "whatsapp",
  "sms",
  "portal",
  "webchat",
  "instagram",
] as const;

type Channel = (typeof ALL_CHANNELS)[number];

/**
 * Maps the 8 product-brief channel names to the DB channel_type enum values.
 * The DB enum has: whatsapp, email, sms, webchat, instagram, facebook.
 * The three email variants all map to 'email' in the DB.
 */
const CHANNEL_TO_DB_TYPE: Record<Channel, string> = {
  email_gmail: "email",
  email_outlook: "email",
  email_imap: "email",
  whatsapp: "whatsapp",
  sms: "sms",
  portal: "webchat", // portal adapter uses webchat channel type
  webchat: "webchat",
  instagram: "instagram",
};

const CHANNELS: Channel[] = process.env.CHANNELS
  ? (process.env.CHANNELS.split(",").map((c) => c.trim()) as Channel[])
  : ([...ALL_CHANNELS] as Channel[]);

const MESSAGES_PER_CHANNEL = parseInt(
  process.env.MESSAGES_PER_CHANNEL || "1000",
  10,
);
const CONCURRENCY = parseInt(process.env.CONCURRENCY || "50", 10);
const DELIVERY_TIMEOUT_MS = parseInt(
  process.env.DELIVERY_TIMEOUT_MS || "30000",
  10,
);
const POLL_INTERVAL_MS = parseInt(process.env.POLL_INTERVAL_MS || "500", 10);
const DELIVERY_OUTPUT_FILE = process.env.DELIVERY_OUTPUT_FILE;
const DELIVERY_RATE_THRESHOLD = 0.999; // 99.9%

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ChannelResult {
  channel: string;
  sent: number;
  delivered: number;
  failed: number;
  deliveryRate: number;
  avgDeliveryMs: number;
  passed: boolean;
}

interface DeliveryTestResult {
  timestamp: string;
  channels: ChannelResult[];
  totalSent: number;
  totalDelivered: number;
  overallDeliveryRate: number;
  overallPassed: boolean;
}

interface MessageRecord {
  id: string;
  status: string;
  sentAtMs: number;
  deliveredAtMs: number | null;
}

// ---------------------------------------------------------------------------
// Concurrency limiter (p-limit style, no external deps)
// ---------------------------------------------------------------------------

function createLimiter(concurrency: number) {
  let active = 0;
  const queue: Array<() => void> = [];

  function next() {
    if (queue.length > 0 && active < concurrency) {
      active++;
      const resolve = queue.shift()!;
      resolve();
    }
  }

  return async function limit<T>(fn: () => Promise<T>): Promise<T> {
    if (active >= concurrency) {
      await new Promise<void>((resolve) => {
        queue.push(resolve);
      });
    } else {
      active++;
    }

    try {
      return await fn();
    } finally {
      active--;
      next();
    }
  };
}

// ---------------------------------------------------------------------------
// tRPC helpers
// ---------------------------------------------------------------------------

const headers: Record<string, string> = {
  "Content-Type": "application/json",
  Authorization: `Bearer ${API_TOKEN}`,
};

async function trpcMutation<T = unknown>(
  procedure: string,
  input: unknown,
): Promise<T> {
  const url = `${BASE_URL}/api/trpc/${procedure}`;
  const res = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify({ json: input }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable)");
    throw new Error(
      `tRPC mutation ${procedure} failed: ${res.status} ${res.statusText} — ${body}`,
    );
  }

  const json = (await res.json()) as { result?: { data?: { json?: T } } };
  return json?.result?.data?.json as T;
}

async function trpcQuery<T = unknown>(
  procedure: string,
  input: unknown,
): Promise<T> {
  const encoded = encodeURIComponent(JSON.stringify({ json: input }));
  const url = `${BASE_URL}/api/trpc/${procedure}?input=${encoded}`;
  const res = await fetch(url, {
    method: "GET",
    headers,
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "(unreadable)");
    throw new Error(
      `tRPC query ${procedure} failed: ${res.status} ${res.statusText} — ${body}`,
    );
  }

  const json = (await res.json()) as { result?: { data?: { json?: T } } };
  return json?.result?.data?.json as T;
}

// ---------------------------------------------------------------------------
// Sleep helper
// ---------------------------------------------------------------------------

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Find or identify test conversation for a channel
// ---------------------------------------------------------------------------

/**
 * Finds an existing open conversation for the given channel, or returns the
 * first conversation available. The test expects that test conversations have
 * been pre-provisioned for each channel (e.g. via a seed script).
 *
 * It looks up conversations by listing all open conversations and matching
 * by channelId. If CONVERSATION_ID_{CHANNEL} env var is set, it uses that
 * directly.
 */
async function findTestConversation(channel: Channel): Promise<string> {
  // Allow explicit override per channel
  const envKey = `CONVERSATION_ID_${channel.toUpperCase()}`;
  const explicit = process.env[envKey];
  if (explicit) {
    return explicit;
  }

  // List open conversations and find one whose channel type matches
  const result = await trpcQuery<{
    items: Array<{
      conversation: { id: string; channelId: string };
      channelType: string;
      channelName: string;
    }>;
  }>("inbox.conversations.list", {
    status: "open",
    limit: 100,
  });

  const dbType = CHANNEL_TO_DB_TYPE[channel];
  const channelSuffix = channel; // e.g. "email_gmail"

  // Try exact channel name match first (channel name often contains the sub-type)
  let match = result.items.find(
    (item) =>
      item.channelType === dbType &&
      item.channelName?.toLowerCase().includes(channelSuffix.replace("_", " ")),
  );

  // Fallback: any conversation with matching DB channel type
  if (!match) {
    match = result.items.find((item) => item.channelType === dbType);
  }

  if (!match) {
    throw new Error(
      `No test conversation found for channel "${channel}" (DB type: ${dbType}). ` +
        `Set ${envKey} env var or provision a test conversation.`,
    );
  }

  return match.conversation.id;
}

// ---------------------------------------------------------------------------
// Send a single message and track delivery
// ---------------------------------------------------------------------------

async function sendAndTrackMessage(
  conversationId: string,
  channel: Channel,
  messageIndex: number,
): Promise<MessageRecord> {
  const sentAtMs = Date.now();

  const result = await trpcMutation<{ id: string; status: string }>(
    "inbox.messages.send",
    {
      conversationId,
      contentType: "text",
      content: {
        text: `[delivery-test] channel=${channel} index=${messageIndex} ts=${sentAtMs}`,
      },
    },
  );

  return {
    id: result.id,
    status: result.status,
    sentAtMs,
    deliveredAtMs: null,
  };
}

// ---------------------------------------------------------------------------
// Poll for delivery status
// ---------------------------------------------------------------------------

async function pollDeliveryStatus(
  conversationId: string,
  messageIds: string[],
  records: Map<string, MessageRecord>,
): Promise<void> {
  const pending = new Set(messageIds);
  const deadline = Date.now() + DELIVERY_TIMEOUT_MS;

  while (pending.size > 0 && Date.now() < deadline) {
    await sleep(POLL_INTERVAL_MS);

    // Fetch latest messages from the conversation
    const result = await trpcQuery<{
      items: Array<{ id: string; status: string }>;
    }>("inbox.messages.list", {
      conversationId,
      limit: 100,
    });

    for (const msg of result.items) {
      if (!pending.has(msg.id)) continue;

      const record = records.get(msg.id);
      if (!record) continue;

      if (msg.status === "delivered" || msg.status === "read") {
        record.status = "delivered";
        record.deliveredAtMs = Date.now();
        pending.delete(msg.id);
      } else if (msg.status === "failed") {
        record.status = "failed";
        pending.delete(msg.id);
      } else if (msg.status === "sent") {
        // Intermediate state — keep polling
        record.status = "sent";
      }
    }
  }

  // Mark any remaining pending messages as timed-out failures
  for (const id of pending) {
    const record = records.get(id);
    if (record) {
      record.status = "failed";
    }
  }
}

// ---------------------------------------------------------------------------
// Run delivery test for a single channel
// ---------------------------------------------------------------------------

async function testChannel(channel: Channel): Promise<ChannelResult> {
  console.log(
    `\n--- Channel: ${channel} (${MESSAGES_PER_CHANNEL} messages) ---`,
  );

  let conversationId: string;
  try {
    conversationId = await findTestConversation(channel);
    console.log(`  Conversation: ${conversationId}`);
  } catch (err) {
    console.error(
      `  SKIP: ${err instanceof Error ? err.message : String(err)}`,
    );
    return {
      channel,
      sent: 0,
      delivered: 0,
      failed: MESSAGES_PER_CHANNEL,
      deliveryRate: 0,
      avgDeliveryMs: 0,
      passed: false,
    };
  }

  const limit = createLimiter(CONCURRENCY);
  const records = new Map<string, MessageRecord>();

  // Phase 1: Send all messages with concurrency limit
  console.log(`  Sending ${MESSAGES_PER_CHANNEL} messages (concurrency: ${CONCURRENCY})...`);
  const sendStart = Date.now();

  const sendPromises: Promise<void>[] = [];
  for (let i = 0; i < MESSAGES_PER_CHANNEL; i++) {
    sendPromises.push(
      limit(async () => {
        try {
          const record = await sendAndTrackMessage(conversationId, channel, i);
          records.set(record.id, record);
        } catch (err) {
          // Count send failures immediately
          const failId = `send-fail-${channel}-${i}`;
          records.set(failId, {
            id: failId,
            status: "failed",
            sentAtMs: Date.now(),
            deliveredAtMs: null,
          });
          console.error(
            `  Send error [${i}]: ${err instanceof Error ? err.message : String(err)}`,
          );
        }
      }),
    );
  }

  await Promise.all(sendPromises);
  const sendDuration = Date.now() - sendStart;
  console.log(
    `  Sent ${records.size} messages in ${(sendDuration / 1000).toFixed(1)}s`,
  );

  // Phase 2: Poll for delivery status in batches
  const pendingIds = Array.from(records.entries())
    .filter(([, r]) => r.status === "queued" || r.status === "sent")
    .map(([id]) => id);

  if (pendingIds.length > 0) {
    console.log(
      `  Polling delivery status for ${pendingIds.length} messages (timeout: ${DELIVERY_TIMEOUT_MS}ms)...`,
    );

    // Poll in batches of 100 (matching the messages.list limit)
    const pollBatchSize = 100;
    const pollPromises: Promise<void>[] = [];

    for (let i = 0; i < pendingIds.length; i += pollBatchSize) {
      const batch = pendingIds.slice(i, i + pollBatchSize);
      pollPromises.push(
        pollDeliveryStatus(conversationId, batch, records),
      );
    }

    await Promise.all(pollPromises);
  }

  // Phase 3: Compute results
  let delivered = 0;
  let failed = 0;
  let totalDeliveryMs = 0;
  let deliveredCount = 0;

  for (const record of records.values()) {
    if (record.status === "delivered") {
      delivered++;
      if (record.deliveredAtMs !== null) {
        totalDeliveryMs += record.deliveredAtMs - record.sentAtMs;
        deliveredCount++;
      }
    } else {
      failed++;
    }
  }

  const sent = records.size;
  const deliveryRate = sent > 0 ? delivered / sent : 0;
  const avgDeliveryMs = deliveredCount > 0 ? totalDeliveryMs / deliveredCount : 0;
  const passed = deliveryRate >= DELIVERY_RATE_THRESHOLD;

  console.log(
    `  Result: ${delivered}/${sent} delivered (${(deliveryRate * 100).toFixed(2)}%) — ${passed ? "PASS" : "FAIL"}`,
  );

  return {
    channel,
    sent,
    delivered,
    failed,
    deliveryRate,
    avgDeliveryMs: Math.round(avgDeliveryMs),
    passed,
  };
}

// ---------------------------------------------------------------------------
// Output formatting
// ---------------------------------------------------------------------------

function printTable(results: ChannelResult[]): void {
  const colWidths = {
    channel: 16,
    sent: 8,
    delivered: 10,
    failed: 8,
    rate: 10,
    avgMs: 10,
    status: 8,
  };

  const hr =
    "+" +
    "-".repeat(colWidths.channel + 2) +
    "+" +
    "-".repeat(colWidths.sent + 2) +
    "+" +
    "-".repeat(colWidths.delivered + 2) +
    "+" +
    "-".repeat(colWidths.failed + 2) +
    "+" +
    "-".repeat(colWidths.rate + 2) +
    "+" +
    "-".repeat(colWidths.avgMs + 2) +
    "+" +
    "-".repeat(colWidths.status + 2) +
    "+";

  const pad = (s: string, w: number) => s.padEnd(w);
  const rpad = (s: string, w: number) => s.padStart(w);

  console.log("\n" + hr);
  console.log(
    `| ${pad("Channel", colWidths.channel)} | ${rpad("Sent", colWidths.sent)} | ${rpad("Delivered", colWidths.delivered)} | ${rpad("Failed", colWidths.failed)} | ${rpad("Rate", colWidths.rate)} | ${rpad("Avg ms", colWidths.avgMs)} | ${pad("Status", colWidths.status)} |`,
  );
  console.log(hr);

  for (const r of results) {
    const rateStr = (r.deliveryRate * 100).toFixed(2) + "%";
    const statusStr = r.passed ? "PASS" : "FAIL";
    console.log(
      `| ${pad(r.channel, colWidths.channel)} | ${rpad(String(r.sent), colWidths.sent)} | ${rpad(String(r.delivered), colWidths.delivered)} | ${rpad(String(r.failed), colWidths.failed)} | ${rpad(rateStr, colWidths.rate)} | ${rpad(String(r.avgDeliveryMs), colWidths.avgMs)} | ${pad(statusStr, colWidths.status)} |`,
    );
  }

  console.log(hr);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main(): Promise<void> {
  console.log("=== Inbox Delivery Test ===");
  console.log(`Base URL:             ${BASE_URL}`);
  console.log(`Channels:             ${CHANNELS.join(", ")}`);
  console.log(`Messages per channel: ${MESSAGES_PER_CHANNEL}`);
  console.log(`Total messages:       ${CHANNELS.length * MESSAGES_PER_CHANNEL}`);
  console.log(`Concurrency:          ${CONCURRENCY}`);
  console.log(`Delivery timeout:     ${DELIVERY_TIMEOUT_MS}ms`);
  console.log(`Success threshold:    ${(DELIVERY_RATE_THRESHOLD * 100).toFixed(1)}%`);

  // Validate channels
  for (const ch of CHANNELS) {
    if (!ALL_CHANNELS.includes(ch as Channel)) {
      console.error(`ERROR: Unknown channel "${ch}". Valid channels: ${ALL_CHANNELS.join(", ")}`);
      process.exit(1);
    }
  }

  const channelResults: ChannelResult[] = [];

  // Run channels sequentially to avoid overwhelming the API
  for (const channel of CHANNELS) {
    const result = await testChannel(channel);
    channelResults.push(result);
  }

  // Compute totals
  const totalSent = channelResults.reduce((sum, r) => sum + r.sent, 0);
  const totalDelivered = channelResults.reduce((sum, r) => sum + r.delivered, 0);
  const overallDeliveryRate = totalSent > 0 ? totalDelivered / totalSent : 0;
  const overallPassed = channelResults.every((r) => r.passed);

  // Print table
  printTable(channelResults);

  console.log(`\nTotal: ${totalDelivered}/${totalSent} delivered (${(overallDeliveryRate * 100).toFixed(2)}%)`);
  console.log(`Overall: ${overallPassed ? "PASS" : "FAIL"}`);

  // Build JSON summary
  const summary: DeliveryTestResult = {
    timestamp: new Date().toISOString(),
    channels: channelResults,
    totalSent,
    totalDelivered,
    overallDeliveryRate,
    overallPassed,
  };

  // Write JSON if output file specified
  if (DELIVERY_OUTPUT_FILE) {
    const { writeFileSync } = await import("node:fs");
    writeFileSync(DELIVERY_OUTPUT_FILE, JSON.stringify(summary, null, 2) + "\n");
    console.log(`\nJSON summary written to ${DELIVERY_OUTPUT_FILE}`);
  }

  // Always print JSON summary to stdout
  console.log("\n--- JSON Summary ---");
  console.log(JSON.stringify(summary, null, 2));

  // Exit with appropriate code
  process.exit(overallPassed ? 0 : 1);
}

// Handle unhandled rejections gracefully
process.on("unhandledRejection", (reason) => {
  console.error("Unhandled rejection:", reason);
  process.exit(1);
});

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
