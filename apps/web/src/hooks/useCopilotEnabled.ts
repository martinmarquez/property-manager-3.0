import { useFeatureFlag } from '@corredor/telemetry/browser';

export function useCopilotEnabled(): boolean {
  const flag = useFeatureFlag('ai_copilot');
  if (import.meta.env.DEV) return true;
  return flag ?? false;
}
