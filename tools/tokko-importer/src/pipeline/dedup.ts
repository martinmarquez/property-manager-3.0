// Deduplicates records by external_id, keeping the first occurrence.
// Primarily guards against duplicate rows in CSV exports.

export function dedupById<T extends { external_id: string }>(records: T[]): T[] {
  const seen = new Set<string>();
  return records.filter((r) => {
    if (seen.has(r.external_id)) return false;
    seen.add(r.external_id);
    return true;
  });
}
