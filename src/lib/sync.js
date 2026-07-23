// Whole-document last-write-wins conflict resolution: given the local and
// remote updated_at timestamps for one synced table, decide which document
// should win. Ties favor local (a device mid-sync with a genuinely
// simultaneous remote write is rare, and favoring local avoids discarding
// a change the current device just made).
export function pickWinner(localUpdatedAt, remoteUpdatedAt) {
  if (!remoteUpdatedAt) return "local";
  if (!localUpdatedAt) return "remote";
  return new Date(localUpdatedAt).getTime() >= new Date(remoteUpdatedAt).getTime()
    ? "local"
    : "remote";
}
