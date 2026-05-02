import { useFeatureFlag } from '@corredor/telemetry/browser';

export function useAiDescriptionEnabled(): boolean {
  const flag = useFeatureFlag('ai_property_description');
  if (import.meta.env.DEV) return true;
  return flag ?? false;
}
