import { describe, it, expect } from "vitest";
import {
  computeSlaDeadlineForSchedule,
  normalizePhone,
  computeScore,
  DEFAULT_SCHEDULE,
} from "./leadLogic";

// NOTE: these assume the default working-hours TZ offset (UTC+6, Asia/Bishkek).
// 2026-06-14 is a Sunday, 06-15 Monday, 06-19 Friday, 06-22 Monday.

describe("normalizePhone (dedup key)", () => {
  it("keeps the last 10 digits, dropping all non-digits", () => {
    expect(normalizePhone("+996 700 111 222")).toBe("6700111222");
    expect(normalizePhone("0700-12-34-56")).toBe("0700123456");
  });
  it("is empty for empty/nullish input", () => {
    expect(normalizePhone("")).toBe("");
    expect(normalizePhone(null)).toBe("");
    expect(normalizePhone(undefined)).toBe("");
  });
  it("two formats of the same number normalise equal (so dedup matches)", () => {
    expect(normalizePhone("+996700111222")).toBe(normalizePhone("996 700 111 222"));
  });
  it("keeps a short number as-is (fewer than 10 digits)", () => {
    expect(normalizePhone("12345")).toBe("12345");
  });
  it("a different number does NOT collide on the 10-digit key", () => {
    expect(normalizePhone("+996700111222")).not.toBe(normalizePhone("+996700999888"));
  });
});

describe("computeScore (lead hotness 0..100)", () => {
  it("is 0 for an empty lead", () => {
    expect(computeScore({})).toBe(0);
  });
  it("forces 100 for a won deal regardless of other fields", () => {
    expect(computeScore({ status_code: "closed_won" })).toBe(100);
  });
  it("forces 0 for a lost deal even with strong signals", () => {
    expect(computeScore({ status_code: "closed_lost", budget: 1, phone: "x", deal_value: 50000 })).toBe(0);
  });
  it("adds contact-channel points", () => {
    expect(computeScore({ phone: "x", email: "x" })).toBe(12); // 8 + 4
  });
  it("gives no engagement point for status 'new'", () => {
    expect(computeScore({ status_code: "new" })).toBe(0);
    expect(computeScore({ status_code: "in_progress" })).toBe(15);
  });
  it("requires 2+ comments for the engagement bonus", () => {
    expect(computeScore({ comment_count: 1 })).toBe(0);
    expect(computeScore({ comment_count: 2 })).toBe(10);
  });
  it("tiers deal value: <15k → 5, 15k → 10, 30k → 15", () => {
    expect(computeScore({ deal_value: 5000 })).toBe(5);
    expect(computeScore({ deal_value: 15000 })).toBe(10);
    expect(computeScore({ deal_value: 30000 })).toBe(15);
  });
  it("sums the profile-completeness bucket (max 40)", () => {
    expect(computeScore({
      budget: 1, english_level: "B2", desired_university: "MIT",
      study_level: "bachelor", intake_term: "2026",
    })).toBe(40); // 10 + 8 + 8 + 6 + 8
  });
  it("clamps a fully-loaded lead to 100", () => {
    const score = computeScore({
      budget: 1, english_level: "B2", desired_university: "MIT", study_level: "bachelor",
      intake_term: "2026", phone: "x", email: "x", parent_contact: "x",
      status_code: "in_progress", comment_count: 3, appointment_at: "x", deal_value: 40000,
    });
    expect(score).toBe(100);
  });
});

describe("computeSlaDeadlineForSchedule (working-hours SLA)", () => {
  it("with no schedule (24/7) just adds the minutes", () => {
    const got = computeSlaDeadlineForSchedule(new Date("2026-06-14T00:00:00Z"), null, 180);
    expect(got.toISOString()).toBe("2026-06-14T03:00:00.000Z");
  });

  it("within working hours adds minutes directly", () => {
    // Mon 10:00 Bishkek = 04:00 UTC; +60min stays inside 09:00–18:00 → 11:00 Bishkek = 05:00 UTC
    const got = computeSlaDeadlineForSchedule(new Date("2026-06-15T04:00:00Z"), DEFAULT_SCHEDULE, 60);
    expect(got.toISOString()).toBe("2026-06-15T05:00:00.000Z");
  });

  it("carries remaining minutes across the weekend", () => {
    // Fri 17:30 Bishkek = 11:30 UTC; 30 min left Fri, 30 min carry to Mon 09:00 → Mon 09:30 Bishkek = 03:30 UTC
    const got = computeSlaDeadlineForSchedule(new Date("2026-06-19T11:30:00Z"), DEFAULT_SCHEDULE, 60);
    expect(got.toISOString()).toBe("2026-06-22T03:30:00.000Z");
  });

  it("received BEFORE opening waits until the day starts", () => {
    // Mon 07:00 Bishkek = 01:00 UTC; timer starts at 09:00, +60 → Mon 10:00 Bishkek = 04:00 UTC
    const got = computeSlaDeadlineForSchedule(new Date("2026-06-15T01:00:00Z"), DEFAULT_SCHEDULE, 60);
    expect(got.toISOString()).toBe("2026-06-15T04:00:00.000Z");
  });

  it("received AFTER closing rolls to the next working day", () => {
    // Mon 19:00 Bishkek = 13:00 UTC; rolls to Tue 09:00, +60 → Tue 10:00 Bishkek = 04:00 UTC
    const got = computeSlaDeadlineForSchedule(new Date("2026-06-15T13:00:00Z"), DEFAULT_SCHEDULE, 60);
    expect(got.toISOString()).toBe("2026-06-16T04:00:00.000Z");
  });

  it("received on a closed day (Sunday) starts Monday morning", () => {
    // Sun 12:00 Bishkek = 06:00 UTC; first working time is Mon 09:00, +120 → Mon 11:00 Bishkek = 05:00 UTC
    const got = computeSlaDeadlineForSchedule(new Date("2026-06-14T06:00:00Z"), DEFAULT_SCHEDULE, 120);
    expect(got.toISOString()).toBe("2026-06-15T05:00:00.000Z");
  });
});
