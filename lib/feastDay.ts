// Parses a freeform feast-day string like "March 19" or "October 4" and
// returns a human-friendly countdown to the next occurrence. Falls back
// to `null` when the date cannot be parsed (e.g. movable feasts like
// "the Sunday after Pentecost").

const MONTHS: Record<string, number> = {
  january: 0,
  february: 1,
  march: 2,
  april: 3,
  may: 4,
  june: 5,
  july: 6,
  august: 7,
  september: 8,
  october: 9,
  november: 10,
  december: 11,
};

const DAY_MS = 1000 * 60 * 60 * 24;

const parseFeastDate = (raw: string, today: Date = new Date()): Date | null => {
  const m = raw.trim().toLowerCase().match(/^([a-z]+)\s+(\d{1,2})/);
  if (!m) return null;
  const monthIdx = MONTHS[m[1]];
  const day = parseInt(m[2], 10);
  if (monthIdx === undefined || Number.isNaN(day) || day < 1 || day > 31) return null;
  const year = today.getFullYear();
  const candidate = new Date(year, monthIdx, day, 0, 0, 0, 0);
  const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  if (candidate.getTime() < todayMidnight.getTime()) {
    return new Date(year + 1, monthIdx, day, 0, 0, 0, 0);
  }
  return candidate;
};

export const feastCountdown = (raw: string, now: Date = new Date()): string | null => {
  const date = parseFeastDate(raw, now);
  if (!date) return null;
  const todayMidnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const days = Math.round((date.getTime() - todayMidnight.getTime()) / DAY_MS);
  if (days === 0) return "Feast today";
  if (days === 1) return "Feast tomorrow";
  if (days < 14) return `Feast in ${days} days`;
  if (days < 60) return `Feast in ${Math.round(days / 7)} weeks`;
  if (days < 330) return `Feast in ${Math.round(days / 30)} months`;
  return "Feast next year";
};
