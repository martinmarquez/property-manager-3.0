import { useCallback, useRef, useState } from 'react';

export interface StreamCitation {
  entityType: string;
  entityId: string;
  content: string;
  score: number;
}

export interface StreamActionSuggestion {
  type: 'send_message' | 'create_task';
  summary: string;
  detail: string;
  payload: Record<string, unknown>;
}

export interface StreamResult {
  text: string;
  citations: StreamCitation[];
  actionSuggestion: StreamActionSuggestion | null;
  turnId: string | null;
  intentType: string | null;
}

interface StreamState {
  isStreaming: boolean;
  streamedText: string;
  error: string | null;
}

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export function useCopilotStream() {
  const [state, setState] = useState<StreamState>({
    isStreaming: false,
    streamedText: '',
    error: null,
  });
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (
      sessionId: string,
      message: string,
      onDelta?: (text: string) => void,
    ): Promise<StreamResult> => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;

      setState({ isStreaming: true, streamedText: '', error: null });

      let fullText = '';
      let citations: StreamCitation[] = [];
      let actionSuggestion: StreamActionSuggestion | null = null;
      let turnId: string | null = null;
      let intentType: string | null = null;

      try {
        const res = await fetch(`${API_BASE}/api/copilot/turn`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'include',
          body: JSON.stringify({ sessionId, message }),
          signal: controller.signal,
        });

        if (!res.ok) {
          const err = await res.json().catch(() => ({ error: 'Stream failed' }));
          throw new Error((err as { error?: string }).error ?? `HTTP ${res.status}`);
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error('No readable stream');

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() ?? '';

          let currentEvent = '';

          for (const line of lines) {
            if (line.startsWith('event:')) {
              currentEvent = line.slice(6).trim();
            } else if (line.startsWith('data:')) {
              const data = line.slice(5).trim();
              switch (currentEvent) {
                case 'intent': {
                  const parsed = JSON.parse(data) as { type: string };
                  intentType = parsed.type;
                  break;
                }
                case 'text_delta': {
                  fullText += data;
                  setState((s) => ({ ...s, streamedText: fullText }));
                  onDelta?.(fullText);
                  break;
                }
                case 'citations': {
                  citations = JSON.parse(data) as StreamCitation[];
                  break;
                }
                case 'action_suggestion': {
                  actionSuggestion = JSON.parse(data) as StreamActionSuggestion;
                  break;
                }
                case 'done': {
                  const meta = JSON.parse(data) as { turnId?: string };
                  turnId = meta.turnId ?? null;
                  break;
                }
                case 'error': {
                  const errData = JSON.parse(data) as { message?: string };
                  throw new Error(errData.message ?? 'Stream error');
                }
              }
              currentEvent = '';
            }
          }
        }

        setState({ isStreaming: false, streamedText: fullText, error: null });
        return { text: fullText, citations, actionSuggestion, turnId, intentType };
      } catch (err) {
        if ((err as Error).name === 'AbortError') {
          setState((s) => ({ ...s, isStreaming: false }));
          return { text: fullText, citations, actionSuggestion, turnId, intentType };
        }
        const msg = (err as Error).message ?? 'Unknown error';
        setState({ isStreaming: false, streamedText: '', error: msg });
        throw err;
      }
    },
    [],
  );

  const abort = useCallback(() => {
    abortRef.current?.abort();
    setState((s) => ({ ...s, isStreaming: false }));
  }, []);

  return { ...state, sendMessage, abort };
}
