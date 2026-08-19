export function timelineRange(day, timezoneOffsetMinutes = new Date().getTimezoneOffset()) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) throw new Error("Invalid date");
  const utcMidnight = Date.parse(`${day}T00:00:00.000Z`);
  const from = utcMidnight + timezoneOffsetMinutes * 60_000;
  return { from, to: from + 86_400_000 };
}

export function formatDuration(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds) || 0));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  return hours ? `${hours}h ${minutes}m` : minutes ? `${minutes}m ${secs}s` : `${secs}s`;
}
