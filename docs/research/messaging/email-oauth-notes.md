# Email OAuth Research Notes: Gmail API + Microsoft Graph API

**Prepared:** 2026-04-20
**Author:** Researcher Agent (RENA-15)
**Purpose:** Pre-Phase D email inbox integration reference for Corredor CRM

---

## Summary

Both Gmail API and Microsoft Graph API are viable for a CRM inbox integration. Gmail is simpler to implement; Graph API covers the Microsoft 365/Exchange ecosystem critical for enterprise real estate agencies. Both require OAuth 2.0 and tenant admin approval for enterprise deployments.

---

## 1. Gmail API

### OAuth Scopes

Choose the narrowest scope that satisfies the use case:

| Scope | Access level | Classification |
|---|---|---|
| `https://www.googleapis.com/auth/gmail.send` | Send email only | Non-sensitive |
| `https://www.googleapis.com/auth/gmail.readonly` | Read messages + metadata | Sensitive |
| `https://www.googleapis.com/auth/gmail.modify` | Read, archive, label (no permanent delete) | Sensitive |
| `https://www.googleapis.com/auth/gmail.labels` | Manage labels only | Non-sensitive |
| `https://mail.google.com/` | Full mailbox access | Restricted |

**Recommended scope set for CRM inbox:**
- `gmail.readonly` — to ingest incoming client emails
- `gmail.send` — to send responses
- `gmail.modify` — if labeling/archiving read messages is needed (cleaner UX)

**Avoid** `mail.google.com` (full access scope) — it triggers Google's restricted OAuth app review process, which requires an expensive security audit (~$15–75k USD via an approved assessor). `gmail.modify` is sufficient and is a *sensitive* (not restricted) scope.

### Rate Limits

Gmail API quota operates on two layers simultaneously:

| Layer | Limit |
|---|---|
| Per user per second | 250 quota units |
| Per project per day | 1,000,000,000 quota units (1B) |

**Quota unit costs by operation (approximate):**

| Operation | Units |
|---|---|
| `messages.list` | 5 |
| `messages.get` | 5 |
| `messages.send` | 100 |
| `messages.modify` | 5 |
| `threads.list` | 5 |
| History / watch | 2 |

At 1,000 messages/day per user, well within limits. Pooling multiple tenants under one GCP project — check per-project daily cap.

HTTP 429 is returned when throttled; implement exponential backoff.

### New Message Detection: Webhook vs Polling

**Option A — Push notifications (preferred):**
Gmail API supports push via Google Cloud Pub/Sub:
1. Create a Pub/Sub topic in GCP
2. Call `gmail.users.watch()` to subscribe a mailbox to that topic
3. Gmail delivers a notification (not the message content — just a `historyId`) to Pub/Sub whenever the mailbox changes
4. Your service fetches the delta using `gmail.users.history.list(startHistoryId=…)`

This is effectively a webhook but routed through Pub/Sub. Requires a GCP project and Pub/Sub setup. Watch subscriptions expire every 7 days — renew via a scheduled job.

**Option B — Polling:**
Use `gmail.users.history.list` with a stored `historyId`. Poll on a schedule (e.g., every 60 seconds). Simpler to implement; less real-time. Sufficient for most CRM inbox use cases.

**Recommendation:** Start with polling in Phase D; add Pub/Sub push in a follow-up sprint.

### Enterprise Google Workspace Considerations

- Personal Gmail accounts can authorize your app immediately
- **Google Workspace (enterprise/agency) accounts:** domain admin must explicitly allow the OAuth app in Google Admin Console (Apps > Google Workspace Marketplace or OAuth consent screen management)
- For high-trust enterprise use cases, consider Google Workspace service accounts with domain-wide delegation — allows server-to-server access without per-user OAuth prompts (requires domain admin setup per tenant)
- Workspace app publishing: if the CRM OAuth app is published as an "Internal" app, only users within the same Workspace domain can authorize it; publish as "External" for multi-tenant SaaS use

### Argentina-Specific Notes

No AFIP or Argentine-specific restrictions on Gmail API usage found. Standard Ley 25.326 (data protection) applies to how email content is stored and processed. No data residency requirement mandating data to remain in Argentina.

---

## 2. Microsoft Graph API (Outlook / M365 / Exchange)

### OAuth Scopes (Permissions)

Microsoft Graph uses Microsoft Entra ID (formerly Azure AD) for OAuth. Two permission types:

- **Delegated** — acts as the signed-in user; requires user to be present for auth
- **Application** — acts as the app itself; admin consent required; good for background sync

**Recommended permissions for CRM inbox:**

| Permission | Type | Access |
|---|---|---|
| `Mail.Read` | Delegated / Application | Read emails |
| `Mail.ReadWrite` | Delegated / Application | Read + mark as read, move |
| `Mail.Send` | Delegated / Application | Send email as user |
| `offline_access` | Delegated | Refresh token for long-lived sessions |
| `User.Read` | Delegated | Fetch user profile |

For multi-tenant CRM SaaS:
- Use **Delegated** + `offline_access` for user-authorized flows (user logs in once, refresh token enables long-lived access)
- Use **Application** permissions for unattended sync — requires each tenant's M365 admin to grant consent

### Rate Limits

| Resource | Limit |
|---|---|
| Per app + per mailbox | 10,000 requests per 10 minutes |
| Per tenant | ~200 requests per second |
| Mail send limit | 10,000 requests per 10 min per app per mailbox |

Starting **September 30, 2025**: per-app/per-user/per-tenant throttling limit reduced to half the total per-tenant limit — plan capacity accordingly.

HTTP 429 returned when throttled; read `Retry-After` header and back off.

**Message size limit:** 4 MB per message via standard `/sendMail` endpoint; use upload sessions for larger messages (up to 150 MB).

### New Message Detection: Webhook vs Polling

**Option A — Change Notifications (webhook equivalent, preferred):**
Graph API supports `subscriptions` on the `/me/mailFolders/inbox/messages` resource:
1. POST to `/subscriptions` with your notification URL and resource path
2. Graph sends a validation request to your URL (must respond with `validationToken` within 10 seconds)
3. On new message: Graph POSTs a notification to your URL with the change type and message ID
4. Fetch the actual message content via a separate GET

Subscription lifetime: up to 4,230 minutes (~3 days) depending on resource type. Must renew before expiry.

**Option B — Delta Query (polling with state):**
`GET /me/mailFolders/inbox/messages/delta` returns a `deltaToken` on first call; subsequent calls with `deltaToken` return only changes since last poll. Efficient for scheduled polling.

**Recommendation:** Use change notifications for real-time; delta query as fallback or for initial sync.

### Enterprise M365 / Exchange Tenant Requirements

- Each real estate agency's M365 tenant must grant admin consent for the app's Application permissions
- For Delegated flows: individual users authorize via standard OAuth; admin can pre-consent for all users in the tenant
- **Exchange On-Premises:** Requires Exchange Web Services (EWS) or Hybrid connector — not covered by Graph API natively. Flag if any agencies use on-prem Exchange.
- Multi-tenant Azure AD app registration: register as a multi-tenant app in Azure Portal; each tenant's admin approves on first use via the standard consent flow

### Argentina-Specific Notes

No AFIP or Argentine-specific restrictions on Microsoft Graph API usage found. Ley 25.326 applies. Microsoft's data centers serving Argentina are in Brazil and the USA; no Argentina-local residency option. Clarify with enterprise customers if this is a concern.

---

## 3. Comparison Summary

| Dimension | Gmail API | Microsoft Graph API |
|---|---|---|
| Market coverage (AR real estate) | Consumer Gmail + Workspace | M365 / Exchange — dominant in mid/large agencies |
| Auth flow | OAuth 2.0 (Google) | OAuth 2.0 (Microsoft Entra ID) |
| Scopes needed | `gmail.readonly` + `gmail.send` | `Mail.Read` + `Mail.Send` + `offline_access` |
| Rate limit (per user) | 250 units/sec; 1B units/day/project | 10,000 req/10min per mailbox |
| Real-time events | Pub/Sub push (needs GCP) | Change notification subscriptions |
| Polling fallback | `history.list` with historyId | Delta query with deltaToken |
| Subscription renewal | 7 days (watch) | Up to 3 days (varies by resource) |
| Enterprise admin consent | Google Admin Console per domain | Azure AD admin consent per tenant |
| On-prem Exchange | No | EWS / Hybrid only |
| Argentina restrictions | None | None |

---

## 4. Implementation Recommendations

1. **Build a unified email adapter interface** in the CRM backend — abstract over Gmail and Graph so the inbox service calls `adapter.fetchNewMessages()` and `adapter.sendMessage()` regardless of provider.

2. **Start with polling + delta in Phase D**, add push notifications (Pub/Sub for Gmail; Graph subscriptions for Outlook) in a follow-up sprint. Polling is simpler to validate correctness; push is a performance upgrade.

3. **Token storage:** Store access tokens and refresh tokens encrypted at rest per user/tenant. Use refresh token rotation — both Google and Microsoft rotate refresh tokens on use.

4. **Scope creep warning:** Do not request `mail.google.com` (Gmail) or `Mail.ReadWrite.All` (Graph) unless required — these trigger security reviews and erode user trust.

5. **Renewal jobs:** Implement background jobs for:
   - Gmail watch subscription renewal (every 7 days)
   - Graph change notification subscription renewal (every 2–3 days)

6. **Phase D external account provisioning needed:**
   - GCP project for Gmail API credentials + Pub/Sub (if using push)
   - Azure AD app registration for Microsoft Graph (multi-tenant)

---

## 5. Open Questions

- [ ] What percentage of target Argentine real estate agencies use Gmail vs M365? Survey sample needed to prioritize implementation order.
- [ ] Do any agencies use on-premise Exchange servers? If yes, scope EWS adapter separately.
- [ ] Does Corredor require email threading / conversation grouping? Gmail threads natively; Graph API uses `conversationId` for threading — validate UX expectations before choosing data model.
