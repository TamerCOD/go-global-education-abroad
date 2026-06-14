// Pure, dependency-free lead logic — extracted from server.ts so it can be
// unit-tested without booting the server (server.ts calls startServer() on import).
// Keep these functions side-effect-free (no DB, no I/O).

// Working-hours timezone offset (minutes). Asia/Bishkek = UTC+6 = 360 by default.
const TZ_OFFSET_MIN = Number(process.env.WORKING_HOURS_TZ_OFFSET_MIN || 360);

export type WorkingDay = { from: string; to: string } | null;
export type WorkingSchedule = WorkingDay[]; // index 0=Sun..6=Sat

export const DEFAULT_SCHEDULE: WorkingSchedule = [
  null,                           // Sun
  { from: "09:00", to: "18:00" }, // Mon
  { from: "09:00", to: "18:00" }, // Tue
  { from: "09:00", to: "18:00" }, // Wed
  { from: "09:00", to: "18:00" }, // Thu
  { from: "09:00", to: "18:00" }, // Fri
  null,                           // Sat
];

export function parseHm(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function tzPartsFromUtc(utc: Date) {
  const adjusted = new Date(utc.getTime() + TZ_OFFSET_MIN * 60_000);
  return {
    dow: adjusted.getUTCDay(),
    minOfDay: adjusted.getUTCHours() * 60 + adjusted.getUTCMinutes(),
  };
}

function tzMidnightUtc(utc: Date, addDays = 0): Date {
  // Returns a UTC Date that corresponds to 00:00 on (date-in-tz + addDays).
  const adjusted = new Date(utc.getTime() + TZ_OFFSET_MIN * 60_000);
  adjusted.setUTCHours(0, 0, 0, 0);
  if (addDays) adjusted.setUTCDate(adjusted.getUTCDate() + addDays);
  return new Date(adjusted.getTime() - TZ_OFFSET_MIN * 60_000);
}

// Add `slaMinutes` of *working time* to receivedAt, honouring the weekly schedule.
// A null/empty schedule means 24/7 (just add the minutes).
export function computeSlaDeadlineForSchedule(
  receivedAt: Date,
  schedule: WorkingSchedule | null,
  slaMinutes: number
): Date {
  if (!schedule || !Array.isArray(schedule) || schedule.every(d => d === null)) {
    return new Date(receivedAt.getTime() + slaMinutes * 60_000);
  }

  let remaining = slaMinutes;
  let cursor = new Date(receivedAt);

  for (let safety = 0; safety < 60; safety++) {
    const { dow, minOfDay } = tzPartsFromUtc(cursor);
    const window = schedule[dow] ?? null;

    if (!window) {
      cursor = tzMidnightUtc(cursor, 1);
      continue;
    }

    const fromMin = parseHm(window.from);
    const toMin = parseHm(window.to);

    if (minOfDay < fromMin) {
      const dayStart = tzMidnightUtc(cursor, 0);
      cursor = new Date(dayStart.getTime() + fromMin * 60_000);
      continue;
    }
    if (minOfDay >= toMin) {
      cursor = tzMidnightUtc(cursor, 1);
      continue;
    }

    const availableToday = toMin - minOfDay;
    if (availableToday >= remaining) {
      return new Date(cursor.getTime() + remaining * 60_000);
    }
    remaining -= availableToday;
    cursor = tzMidnightUtc(cursor, 1);
  }

  return new Date(cursor.getTime() + remaining * 60_000);
}

// Normalise a phone to its last 10 digits — the dedup match key.
export function normalizePhone(phone?: string | null): string {
  return (phone || "").replace(/\D/g, "").slice(-10);
}

// Lead hotness score, 0..100. Pure: derived only from the passed-in fields.
export interface ScoreableLead {
  budget?: unknown;
  english_level?: unknown;
  desired_university?: unknown;
  study_level?: unknown;
  intake_term?: unknown;
  phone?: unknown;
  email?: unknown;
  parent_contact?: unknown;
  status_code?: string | null;
  comment_count?: number;
  appointment_at?: unknown;
  deal_value?: unknown;
}
export function computeScore(l: ScoreableLead): number {
  let score = 0;
  // Profile completeness (max 40)
  if (l.budget) score += 10;
  if (l.english_level) score += 8;
  if (l.desired_university) score += 8;
  if (l.study_level) score += 6;
  if (l.intake_term) score += 8;
  // Contact channels (max 15)
  if (l.phone) score += 8;
  if (l.email) score += 4;
  if (l.parent_contact) score += 3;
  // Engagement (max 30)
  if (l.status_code && l.status_code !== "new") score += 15;
  if ((l.comment_count ?? 0) >= 2) score += 10;
  if (l.appointment_at) score += 5;
  // Deal value (max 15)
  if (l.deal_value) {
    if (Number(l.deal_value) >= 30000) score += 15;
    else if (Number(l.deal_value) >= 15000) score += 10;
    else score += 5;
  }
  if (l.status_code === "closed_lost") score = 0;
  if (l.status_code === "closed_won") score = 100;
  return Math.min(100, Math.max(0, score));
}
