import express from "express";
import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import pg from "pg";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import cookieParser from "cookie-parser";
import ExcelJS from "exceljs";

const { Pool } = pg;

const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const DATABASE_URL = process.env.DATABASE_URL;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const VISITOR_SECRET = process.env.VISITOR_SECRET || ADMIN_PASSWORD;
const JWT_SECRET = process.env.JWT_SECRET || ADMIN_PASSWORD + "_jwt";
const LEAD_INTAKE_SECRET = process.env.LEAD_INTAKE_SECRET || "";
const LEAD_SLA_HOURS = Number(process.env.LEAD_SLA_HOURS || 3);
const WORKING_HOURS_TZ_OFFSET_MIN = Number(process.env.WORKING_HOURS_TZ_OFFSET_MIN || 360); // Default Asia/Bishkek = UTC+6
const SLA_CRON_INTERVAL_MS = Number(process.env.SLA_CRON_INTERVAL_MS || 60_000);
const PUBLIC_BASE_URL =
  process.env.PUBLIC_BASE_URL || "https://goglobal.su";
const UPLOADS_DIR =
  process.env.UPLOADS_DIR || path.join(process.cwd(), "uploads");

const storePath = path.join(process.cwd(), "store.json");

const fallbackDefaults = {
  countries: [],
  testimonials: [],
  faqs: [],
  contactInfo: {
    phone: "+996 (999) 53-00-92",
    email: "info@goglobal.education",
    address: "г. Бишкек, ул Юнусалиева 80 (ololoPlanet)",
    addressLink: "https://go.2gis.com/EQmnC",
    instagram: "https://www.instagram.com/go_global_official/",
    whatsappNumber: "996999530092",
    whatsappMessage: "Добрый день! Пишу с сайта GoGlobal!",
  },
  siteConfig: {
    heroImage:
      "https://images.unsplash.com/photo-1529390079861-591de354faf5?q=80&w=1920&auto=format&fit=crop",
    aboutImage1:
      "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=600&auto=format&fit=crop",
    aboutImage2:
      "https://images.unsplash.com/photo-1543269664-7eef42226a21?q=80&w=600&auto=format&fit=crop",
    partnerUniversities: [
      { name: "Arizona State University", highlighted: true, highlightColor: "text-accent-500" },
      { name: "University of Canada West" },
      { name: "EU Business School" },
    ],
    loaderTagline: "Образование за рубежом",
    visibility: {
      hero: true, about: true, destinations: true,
      calculator: true, testimonials: true, faq: true, contact: true,
    },
    regions: [
      { id: "Asia", name: "Азия" },
      { id: "Europe", name: "Европа" },
      { id: "USA", name: "США" },
    ],
    workSchedule: [
      { day: "Пн–Пт", hours: "09:00 – 18:00" },
      { day: "Сб", hours: "10:00 – 15:00" },
      { day: "Вс", hours: "Выходной" },
    ],
    attributionOptions: [
      "Сайт",
      "Instagram",
      "WhatsApp",
      "Email",
      "Друзья / знакомые",
      "Реклама",
      "Поиск Google",
      "Другое",
    ],
    adminBgUrl: "",
    calculatorConfig: {
      title: "Планируйте бюджет",
      subtitle: "Узнайте примерную минимальную стоимость года обучения и проживания.",
      companyServicesCost: 1000,
      checklistItems: [
        "Включает проживание и питание",
        "Включает минимальную стоимость контракта",
        "Страховка и учебные материалы",
        "Сопровождение GoGlobal",
      ],
      disclaimer: "*Не является публичной офертой. Точный расчёт возможен только после консультации.",
      grantToggleLabel: "Рассматриваю гранты / Бюджет",
      grantToggleHint: "Учитывать возможность бесплатного обучения (только проживание + услуги)",
    },
  },
};

const DEFAULT_LEAD_STATUSES = [
  { code: "new", label: "Новый", color: "#3b82f6", is_terminal: false, sort: 0 },
  { code: "in_progress", label: "В работе", color: "#f59e0b", is_terminal: false, sort: 10 },
  { code: "callback", label: "Перезвонить", color: "#8b5cf6", is_terminal: false, sort: 20 },
  { code: "no_answer", label: "Не ответил", color: "#94a3b8", is_terminal: false, sort: 30 },
  { code: "office_visit", label: "Подойдёт в офис", color: "#06b6d4", is_terminal: false, sort: 40 },
  { code: "closed_won", label: "Закрыт ✅", color: "#10b981", is_terminal: true, sort: 90 },
  { code: "closed_lost", label: "Отказ ❌", color: "#ef4444", is_terminal: true, sort: 95 },
];

async function loadSeedData() {
  try {
    const raw = await fs.readFile(storePath, "utf-8");
    const parsed = JSON.parse(raw);
    if (!parsed.siteConfig) parsed.siteConfig = fallbackDefaults.siteConfig;
    return parsed;
  } catch {
    return fallbackDefaults;
  }
}

// ---------- Telegram ----------
async function sendTelegram(text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn("[telegram] Missing TELEGRAM_BOT_TOKEN or TELEGRAM_CHAT_ID");
    return false;
  }
  try {
    const res = await fetch(
      `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: TELEGRAM_CHAT_ID,
          text,
          parse_mode: "HTML",
          disable_web_page_preview: true,
        }),
      }
    );
    if (!res.ok) {
      console.error("[telegram] sendMessage failed:", res.status, await res.text());
      return false;
    }
    return true;
  } catch (err) {
    console.error("[telegram] error:", err);
    return false;
  }
}

function escapeHtml(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ---------- DB pool ----------
let pool: pg.Pool | null = null;
let dbReady: Promise<void> | null = null;

if (DATABASE_URL) {
  const needsSsl = /\b(railway|render|amazonaws|supabase|neon)\b/i.test(DATABASE_URL);
  pool = new Pool({
    connectionString: DATABASE_URL,
    ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
  });
  dbReady = (async () => {
    await pool!.query(`
      CREATE TABLE IF NOT EXISTS site_data (
        id INTEGER PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await pool!.query(`
      CREATE TABLE IF NOT EXISTS site_visits (
        id BIGSERIAL PRIMARY KEY,
        visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        path TEXT NOT NULL,
        visitor_id TEXT NOT NULL,
        ua TEXT,
        ref TEXT
      );
    `);
    await pool!.query(`CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON site_visits (visited_at DESC);`);
    await pool!.query(`CREATE INDEX IF NOT EXISTS idx_visits_visitor_id ON site_visits (visitor_id);`);

    // CRM tables
    await pool!.query(`
      CREATE TABLE IF NOT EXISTS managers (
        id BIGSERIAL PRIMARY KEY,
        login TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        full_name TEXT NOT NULL,
        telegram_tag TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        last_assigned_at TIMESTAMPTZ,
        working_hours JSONB,
        role TEXT NOT NULL DEFAULT 'manager',
        is_online BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    // Idempotent column migrations (existing DBs)
    await pool!.query(`ALTER TABLE managers ADD COLUMN IF NOT EXISTS working_hours JSONB;`);
    await pool!.query(`ALTER TABLE managers ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'manager';`);
    await pool!.query(`ALTER TABLE managers ADD COLUMN IF NOT EXISTS is_online BOOLEAN NOT NULL DEFAULT TRUE;`);
    await pool!.query(`ALTER TABLE managers ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;`);
    // Transfer (handoff) columns on leads
    await pool!.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS pending_transfer_to_id BIGINT REFERENCES managers(id) ON DELETE SET NULL;`);
    await pool!.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS pending_transfer_at TIMESTAMPTZ;`);
    await pool!.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS pending_transfer_by_id BIGINT REFERENCES managers(id) ON DELETE SET NULL;`);
    // Rejection reason + requires_reason flag on lead_statuses
    await pool!.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS rejection_reason TEXT;`);
    await pool!.query(`ALTER TABLE lead_statuses ADD COLUMN IF NOT EXISTS requires_reason BOOLEAN NOT NULL DEFAULT FALSE;`);
    await pool!.query(`UPDATE lead_statuses SET requires_reason = TRUE WHERE code = 'closed_lost'`);

    // Events table
    await pool!.query(`
      CREATE TABLE IF NOT EXISTS events (
        id BIGSERIAL PRIMARY KEY,
        slug TEXT UNIQUE NOT NULL,
        name TEXT NOT NULL,
        description TEXT,
        active BOOLEAN NOT NULL DEFAULT TRUE,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    // Extended lead fields
    await pool!.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS event_id BIGINT REFERENCES events(id) ON DELETE SET NULL;`);
    await pool!.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS event_name_snapshot TEXT;`);
    await pool!.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS desired_university TEXT;`);
    await pool!.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS study_level TEXT;`);
    await pool!.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS intake_term TEXT;`);
    await pool!.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS budget TEXT;`);
    await pool!.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS english_level TEXT;`);
    await pool!.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS birth_year INTEGER;`);
    await pool!.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS current_education TEXT;`);
    // Appointment / semi-closed status fields
    await pool!.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS appointment_at TIMESTAMPTZ;`);
    await pool!.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS appointment_until TIMESTAMPTZ;`);
    await pool!.query(`ALTER TABLE leads ADD COLUMN IF NOT EXISTS appointment_kind TEXT;`);
    await pool!.query(`ALTER TABLE lead_statuses ADD COLUMN IF NOT EXISTS requires_appointment BOOLEAN NOT NULL DEFAULT FALSE;`);
    await pool!.query(`ALTER TABLE lead_statuses ADD COLUMN IF NOT EXISTS is_semi_closed BOOLEAN NOT NULL DEFAULT FALSE;`);
    await pool!.query(`ALTER TABLE lead_statuses ADD COLUMN IF NOT EXISTS is_client_stage BOOLEAN NOT NULL DEFAULT FALSE;`);
    // Mark office_visit as the canonical "semi-closed with appointment" status
    await pool!.query(`UPDATE lead_statuses SET requires_appointment = TRUE, is_semi_closed = TRUE WHERE code = 'office_visit'`);
    // Seed post-win client pipeline stages (idempotent — only inserts if missing)
    const POST_WIN_STAGES = [
      { code: "stage_contract", label: "📜 Контракт подписан", color: "#0ea5e9", sort: 100 },
      { code: "stage_payment_1", label: "💰 Оплата 1 (предоплата)", color: "#06b6d4", sort: 110 },
      { code: "stage_documents", label: "📂 Сбор документов", color: "#0891b2", sort: 120 },
      { code: "stage_language_exam", label: "🇬🇧 Языковой экзамен", color: "#22c55e", sort: 130 },
      { code: "stage_interview", label: "🎤 Собеседование", color: "#8b5cf6", sort: 140 },
      { code: "stage_admission", label: "🎓 Зачисление", color: "#a855f7", sort: 150 },
      { code: "stage_visa", label: "🛂 Виза", color: "#3b82f6", sort: 160 },
      { code: "stage_payment_final", label: "💵 Окончательная оплата", color: "#10b981", sort: 170 },
      { code: "stage_departure", label: "✈️ Отъезд / прибытие", color: "#14b8a6", sort: 180 },
    ];
    for (const s of POST_WIN_STAGES) {
      await pool!.query(
        `INSERT INTO lead_statuses (code, label, color, is_terminal, is_client_stage, sort)
         VALUES ($1,$2,$3,FALSE,TRUE,$4)
         ON CONFLICT (code) DO UPDATE SET is_client_stage = TRUE`,
        [s.code, s.label, s.color, s.sort]
      );
    }
    // Normalize all manager passwords to a known default (qwe123!@#) on every boot.
    // The user explicitly asked for this — all manager + teamlead logins use the same password.
    try {
      const STD_PWD_HASH = await bcrypt.hash("qwe123!@#", 10);
      await pool!.query(`UPDATE managers SET password_hash = $1`, [STD_PWD_HASH]);
      console.log("[db] Manager passwords normalized to default (qwe123!@#)");
    } catch (err) {
      console.error("[db] Failed to normalize passwords:", err);
    }
    // Named comments (each manager/teamlead leaves a comment with their name)
    await pool!.query(`
      CREATE TABLE IF NOT EXISTS lead_comments (
        id BIGSERIAL PRIMARY KEY,
        lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        manager_id BIGINT REFERENCES managers(id) ON DELETE SET NULL,
        author_name TEXT NOT NULL,
        author_role TEXT,
        body TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await pool!.query(`CREATE INDEX IF NOT EXISTS idx_lead_comments_lead_id ON lead_comments (lead_id, created_at);`);
    await pool!.query(`
      CREATE TABLE IF NOT EXISTS lead_statuses (
        code TEXT PRIMARY KEY,
        label TEXT NOT NULL,
        color TEXT,
        is_terminal BOOLEAN NOT NULL DEFAULT FALSE,
        sort INTEGER NOT NULL DEFAULT 0
      );
    `);
    await pool!.query(`
      CREATE TABLE IF NOT EXISTS leads (
        id BIGSERIAL PRIMARY KEY,
        received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        name TEXT,
        phone TEXT,
        email TEXT,
        country TEXT,
        comment TEXT,
        source TEXT,
        raw JSONB,
        assigned_manager_id BIGINT REFERENCES managers(id) ON DELETE SET NULL,
        status_code TEXT REFERENCES lead_statuses(code) ON DELETE SET NULL,
        notes TEXT,
        sla_deadline_at TIMESTAMPTZ,
        sla_warned BOOLEAN NOT NULL DEFAULT FALSE,
        processed_at TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await pool!.query(`CREATE INDEX IF NOT EXISTS idx_leads_assigned ON leads (assigned_manager_id, received_at DESC);`);
    await pool!.query(`CREATE INDEX IF NOT EXISTS idx_leads_status ON leads (status_code);`);
    await pool!.query(`CREATE INDEX IF NOT EXISTS idx_leads_received ON leads (received_at DESC);`);
    await pool!.query(`
      CREATE TABLE IF NOT EXISTS lead_status_history (
        id BIGSERIAL PRIMARY KEY,
        lead_id BIGINT NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
        from_status TEXT,
        to_status TEXT,
        manager_id BIGINT REFERENCES managers(id) ON DELETE SET NULL,
        note TEXT,
        changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // Seed lead_statuses if empty
    const { rows: lsRows } = await pool!.query("SELECT 1 FROM lead_statuses LIMIT 1");
    if (lsRows.length === 0) {
      for (const s of DEFAULT_LEAD_STATUSES) {
        await pool!.query(
          "INSERT INTO lead_statuses (code, label, color, is_terminal, sort) VALUES ($1,$2,$3,$4,$5)",
          [s.code, s.label, s.color, s.is_terminal, s.sort]
        );
      }
      console.log("[db] Seeded default lead_statuses");
    }

    // Seed site_data if empty
    const { rows } = await pool!.query("SELECT 1 FROM site_data WHERE id = 1 LIMIT 1");
    if (rows.length === 0) {
      const seed = await loadSeedData();
      await pool!.query(
        "INSERT INTO site_data (id, data) VALUES (1, $1)",
        [JSON.stringify(seed)]
      );
      console.log("[db] Seeded site_data");
    }
  })();
}

function pq() {
  if (!pool) throw new Error("Database not configured");
  return pool;
}

// ---------- Site data API ----------
async function getStore() {
  if (pool) {
    await dbReady!;
    const { rows } = await pool.query("SELECT data FROM site_data WHERE id = 1");
    if (rows.length === 0) return fallbackDefaults;
    const d = rows[0].data;
    if (!d.siteConfig) d.siteConfig = fallbackDefaults.siteConfig;
    return d;
  }
  try {
    const raw = await fs.readFile(storePath, "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallbackDefaults;
  }
}

async function setStore(data: any) {
  if (pool) {
    await dbReady!;
    await pool.query(
      `INSERT INTO site_data (id, data, updated_at)
       VALUES (1, $1, NOW())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [JSON.stringify(data)]
    );
  } else {
    await fs.writeFile(storePath, JSON.stringify(data, null, 2));
  }
}

async function recordVisit(args: { visitorId: string; path: string; ua?: string; ref?: string }) {
  if (!pool) return;
  await dbReady!;
  await pool.query(
    `INSERT INTO site_visits (visitor_id, path, ua, ref) VALUES ($1, $2, $3, $4)`,
    [args.visitorId, args.path, args.ua || null, args.ref || null]
  );
}

async function getAnalytics() {
  if (!pool) {
    return { today: 0, last7Days: 0, last30Days: 0, uniqueToday: 0, uniqueLast7: 0, daily: [], topPaths: [] };
  }
  await dbReady!;
  const today = await pool.query(
    `SELECT COUNT(*)::int AS visits, COUNT(DISTINCT visitor_id)::int AS unique
     FROM site_visits WHERE visited_at >= NOW() - INTERVAL '24 hours'`
  );
  const last7 = await pool.query(
    `SELECT COUNT(*)::int AS visits, COUNT(DISTINCT visitor_id)::int AS unique
     FROM site_visits WHERE visited_at >= NOW() - INTERVAL '7 days'`
  );
  const last30 = await pool.query(
    `SELECT COUNT(*)::int AS visits FROM site_visits WHERE visited_at >= NOW() - INTERVAL '30 days'`
  );
  const daily = await pool.query(
    `SELECT to_char(date_trunc('day', visited_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
            COUNT(*)::int AS visits, COUNT(DISTINCT visitor_id)::int AS unique
     FROM site_visits WHERE visited_at >= NOW() - INTERVAL '30 days'
     GROUP BY 1 ORDER BY 1 ASC`
  );
  const topPaths = await pool.query(
    `SELECT path, COUNT(*)::int AS visits FROM site_visits
     WHERE visited_at >= NOW() - INTERVAL '30 days'
     GROUP BY path ORDER BY visits DESC LIMIT 10`
  );
  // Hourly distribution over the last 7 days (when do visitors come?)
  const hourly = await pool.query(
    `SELECT EXTRACT(hour FROM (visited_at AT TIME ZONE 'Asia/Bishkek'))::int AS hour,
            COUNT(*)::int AS visits
     FROM site_visits
     WHERE visited_at >= NOW() - INTERVAL '7 days'
     GROUP BY 1
     ORDER BY 1`
  );
  // Top referrer domains (where do visitors come from?)
  const topRefs = await pool.query(
    `SELECT
       CASE
         WHEN ref IS NULL OR ref = '' THEN '(прямой заход)'
         ELSE COALESCE(
           NULLIF((regexp_match(ref, '^https?://([^/]+)'))[1], ''),
           'прочее'
         )
       END AS source,
       COUNT(*)::int AS visits
     FROM site_visits
     WHERE visited_at >= NOW() - INTERVAL '30 days'
     GROUP BY 1
     ORDER BY visits DESC
     LIMIT 10`
  );
  return {
    today: today.rows[0]?.visits ?? 0,
    uniqueToday: today.rows[0]?.unique ?? 0,
    last7Days: last7.rows[0]?.visits ?? 0,
    uniqueLast7: last7.rows[0]?.unique ?? 0,
    last30Days: last30.rows[0]?.visits ?? 0,
    daily: daily.rows,
    topPaths: topPaths.rows,
    hourly: hourly.rows,
    topRefs: topRefs.rows,
  };
}

// ---------- CRM helpers ----------
type WorkingDay = { from: string; to: string } | null;
type WorkingSchedule = WorkingDay[]; // index 0=Sun..6=Sat

const DEFAULT_SCHEDULE: WorkingSchedule = [
  null,                           // Sun
  { from: "09:00", to: "18:00" }, // Mon
  { from: "09:00", to: "18:00" }, // Tue
  { from: "09:00", to: "18:00" }, // Wed
  { from: "09:00", to: "18:00" }, // Thu
  { from: "09:00", to: "18:00" }, // Fri
  null,                           // Sat
];

function parseHm(s: string): number {
  const [h, m] = s.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
}

function tzPartsFromUtc(utc: Date) {
  const adjusted = new Date(utc.getTime() + WORKING_HOURS_TZ_OFFSET_MIN * 60_000);
  return {
    dow: adjusted.getUTCDay(),
    minOfDay: adjusted.getUTCHours() * 60 + adjusted.getUTCMinutes(),
  };
}

function tzMidnightUtc(utc: Date, addDays = 0): Date {
  // Returns a UTC Date that corresponds to 00:00 on (date-in-tz + addDays).
  const adjusted = new Date(utc.getTime() + WORKING_HOURS_TZ_OFFSET_MIN * 60_000);
  adjusted.setUTCHours(0, 0, 0, 0);
  if (addDays) adjusted.setUTCDate(adjusted.getUTCDate() + addDays);
  return new Date(adjusted.getTime() - WORKING_HOURS_TZ_OFFSET_MIN * 60_000);
}

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
      // Day off: jump to tomorrow's 00:00 in tz
      cursor = tzMidnightUtc(cursor, 1);
      continue;
    }

    const fromMin = parseHm(window.from);
    const toMin = parseHm(window.to);

    if (minOfDay < fromMin) {
      // Before working hours — move cursor to today's start
      const dayStart = tzMidnightUtc(cursor, 0);
      cursor = new Date(dayStart.getTime() + fromMin * 60_000);
      continue;
    }
    if (minOfDay >= toMin) {
      // After working hours — move to next day
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

  // Shouldn't normally hit; fallback
  return new Date(cursor.getTime() + remaining * 60_000);
}

async function pickNextManager(): Promise<{
  id: number; full_name: string; telegram_tag: string | null;
  login: string; working_hours: WorkingSchedule | null;
} | null> {
  if (!pool) return null;
  // Only active + online + non-archived managers (teamleads skipped — they coordinate)
  const { rows } = await pool.query(
    `SELECT id, full_name, telegram_tag, login, working_hours
     FROM managers
     WHERE active = TRUE AND is_online = TRUE AND role = 'manager' AND archived_at IS NULL
     ORDER BY last_assigned_at NULLS FIRST, id ASC
     LIMIT 1`
  );
  if (rows.length === 0) return null;
  await pool.query(`UPDATE managers SET last_assigned_at = NOW() WHERE id = $1`, [rows[0].id]);
  return rows[0];
}

function computeSlaDeadline(receivedAt: Date, schedule: WorkingSchedule | null = null): Date {
  return computeSlaDeadlineForSchedule(receivedAt, schedule, LEAD_SLA_HOURS * 60);
}

async function assignPendingLeads(triggeredByLogin?: string): Promise<{ assigned: number; details: any[] }> {
  if (!pool) return { assigned: 0, details: [] };
  await dbReady!;
  const { rows: pending } = await pool.query(
    `SELECT id, name, phone, email, country, comment, received_at
     FROM leads
     WHERE assigned_manager_id IS NULL AND processed_at IS NULL
     ORDER BY received_at ASC
     LIMIT 100`
  );
  const details: any[] = [];
  for (const lead of pending) {
    const mgr = await pickNextManager();
    if (!mgr) break;
    const sla = computeSlaDeadline(new Date(), mgr.working_hours ?? DEFAULT_SCHEDULE);
    await pool.query(
      `UPDATE leads SET assigned_manager_id = $1, sla_deadline_at = $2, sla_warned = FALSE, updated_at = NOW() WHERE id = $3`,
      [mgr.id, sla, lead.id]
    );
    details.push({ leadId: lead.id, manager: mgr, lead });
  }
  if (details.length > 0) {
    const tagOf = (m: any) =>
      m.telegram_tag ? (m.telegram_tag.startsWith("@") ? m.telegram_tag : `@${m.telegram_tag}`) : "";
    const lines = [
      `✅ <b>Распределены ожидавшие лиды</b>${triggeredByLogin ? ` (после выхода в сеть: ${escapeHtml(triggeredByLogin)})` : ""}`,
      ...details.map(d =>
        `• #${d.leadId} ${escapeHtml(d.lead.name || "—")} → <b>${escapeHtml(d.manager.full_name)}</b> ${tagOf(d.manager)}`.trim()
      ),
      `→ <a href="${PUBLIC_BASE_URL}/lidy">открыть в CRM</a>`,
    ];
    sendTelegram(lines.join("\n")).catch(() => {});
  }
  return { assigned: details.length, details };
}

function whatsappLink(phone: string, msg?: string): string | null {
  const digits = (phone || "").replace(/\D/g, "");
  if (digits.length < 7 || digits.length > 15) return null;
  return `https://wa.me/${digits}${msg ? `?text=${encodeURIComponent(msg)}` : ""}`;
}

function sourceBadge(source: string): string {
  const s = (source || "").toLowerCase();
  if (s.includes("whatsapp")) return "💬 WhatsApp";
  if (s.includes("instagram")) return "📷 Instagram";
  if (s.includes("email") || s.includes("mail")) return "✉ Email";
  if (s.includes("modal")) return "🌐 Сайт (попап)";
  if (s.includes("apply")) return "🔗 По ссылке";
  return "🌐 Сайт";
}

function signSession(payload: { mid: number; login: string }) {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "12h" });
}

function readSession(req: express.Request): { mid: number; login: string } | null {
  const token = (req as any).cookies?.lidy_session as string | undefined;
  if (!token) return null;
  try {
    return jwt.verify(token, JWT_SECRET) as { mid: number; login: string };
  } catch {
    return null;
  }
}

function requireManager(req: express.Request, res: express.Response, next: express.NextFunction) {
  const session = readSession(req);
  if (!session) return res.status(401).json({ error: "Unauthorized" });
  (req as any).manager = session;
  next();
}

if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
}

// ---------- Multer ----------
const ALLOWED_MIME = new Set([
  "image/jpeg", "image/png", "image/webp", "image/gif", "image/svg+xml",
]);
const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
    filename: (_req, file, cb) => {
      const hash = crypto.randomBytes(8).toString("hex");
      const ext = (path.extname(file.originalname) || "").toLowerCase();
      const safeExt = /^\.[a-z0-9]{1,5}$/.test(ext) ? ext : "";
      cb(null, `${Date.now()}-${hash}${safeExt}`);
    },
  }),
  limits: { fileSize: 15 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_MIME.has(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files (jpg, png, webp, gif, svg) are allowed"));
  },
});

function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const password =
    (req.headers["x-admin-password"] as string | undefined) ||
    (typeof req.body === "object" && req.body && req.body.password);
  if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Unauthorized" });
  next();
}

function hashVisitor(ip: string, ua: string): string {
  return crypto.createHash("sha256").update(`${ip}|${ua}|${VISITOR_SECRET}`).digest("hex").slice(0, 32);
}

console.log(`[server] Storage: ${pool ? "PostgreSQL" : "JSON file"}`);
console.log(`[server] Telegram: ${TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID ? "configured" : "DISABLED"}`);
console.log(`[server] Lead intake secret: ${LEAD_INTAKE_SECRET ? "set" : "DISABLED"}`);

// ---------- Expired-transfer cron ----------
async function revertExpiredTransfers() {
  if (!pool) return;
  try {
    await dbReady!;
    const timeoutMin = Number(process.env.LEAD_TRANSFER_TIMEOUT_MIN || 10);
    const { rows } = await pool.query(
      `SELECT l.id, l.pending_transfer_to_id, l.pending_transfer_by_id,
              mt.full_name AS to_name, mt.telegram_tag AS to_tag,
              mb.full_name AS by_name, mb.telegram_tag AS by_tag
       FROM leads l
       LEFT JOIN managers mt ON mt.id = l.pending_transfer_to_id
       LEFT JOIN managers mb ON mb.id = l.pending_transfer_by_id
       WHERE l.pending_transfer_at IS NOT NULL
         AND l.pending_transfer_at < NOW() - INTERVAL '${timeoutMin} minutes'
       LIMIT 50`
    );
    for (const lead of rows) {
      await pool.query(
        `UPDATE leads SET pending_transfer_to_id = NULL, pending_transfer_at = NULL,
                          pending_transfer_by_id = NULL, updated_at = NOW()
         WHERE id = $1`,
        [lead.id]
      );
      const tag = (t: string | null) => t ? (t.startsWith("@") ? t : `@${t}`) : "";
      sendTelegram(
        [
          `⌛ <b>Передача лида #${lead.id} истекла</b>`,
          `Не принята: ${escapeHtml(lead.to_name || "—")} ${tag(lead.to_tag)}`,
          `Возвращён: ${escapeHtml(lead.by_name || "—")} ${tag(lead.by_tag)}`,
        ].join("\n")
      ).catch(() => {});
    }
  } catch (err) {
    console.error("[transfer-cron]", err);
  }
}

// ---------- SLA breach cron ----------
async function checkSlaBreaches() {
  if (!pool) return;
  try {
    await dbReady!;
    const { rows } = await pool.query(
      `SELECT l.id, l.received_at, l.sla_deadline_at,
              m.id AS manager_id, m.full_name, m.login, m.telegram_tag
       FROM leads l
       LEFT JOIN managers m ON m.id = l.assigned_manager_id
       WHERE l.processed_at IS NULL
         AND l.sla_warned = FALSE
         AND l.sla_deadline_at < NOW()
       LIMIT 50`
    );
    for (const lead of rows) {
      const tag = lead.telegram_tag
        ? (lead.telegram_tag.startsWith("@") ? lead.telegram_tag : `@${lead.telegram_tag}`)
        : "";
      const overdueMs = Date.now() - new Date(lead.sla_deadline_at).getTime();
      const overdueMin = Math.round(overdueMs / 60_000);
      const lines = [
        `⏰ <b>SLA нарушен по лиду #${lead.id}</b>`,
        lead.full_name
          ? `Менеджер: <b>${escapeHtml(lead.full_name)}</b> (${escapeHtml(lead.login)}) ${tag}`.trim()
          : `⚠️ Лид без назначенного менеджера!`,
        `Получен: ${new Date(lead.received_at).toISOString().slice(0, 16).replace("T", " ")} UTC`,
        `Дедлайн был: ${new Date(lead.sla_deadline_at).toISOString().slice(0, 16).replace("T", " ")} UTC`,
        `Просрочен на: <b>${Math.floor(overdueMin / 60)}ч ${overdueMin % 60}м</b>`,
        `→ <a href="${PUBLIC_BASE_URL}/lidy">открыть в CRM</a>`,
      ];
      const sent = await sendTelegram(lines.join("\n"));
      if (sent) {
        await pool.query(`UPDATE leads SET sla_warned = TRUE WHERE id = $1`, [lead.id]);
      }
    }
  } catch (err) {
    console.error("[sla-cron]", err);
  }
}

if (pool) {
  // Initial run after 30s (gives DB time to be ready), then every interval
  setTimeout(() => {
    checkSlaBreaches();
    revertExpiredTransfers();
    setInterval(() => { checkSlaBreaches(); revertExpiredTransfers(); }, SLA_CRON_INTERVAL_MS);
  }, 30_000);
  console.log(`[server] SLA + transfer cron will run every ${Math.round(SLA_CRON_INTERVAL_MS / 1000)}s`);
}

// ---------- Express app ----------
async function startServer() {
  const app = express();
  app.set("trust proxy", true);
  app.use(express.json({ limit: "5mb" }));
  app.use(cookieParser());

  // ----- Health & basic site data -----
  app.get("/api/health", (_req, res) => res.json({ ok: true, env: NODE_ENV }));

  app.get("/api/data", async (_req, res) => {
    try {
      res.json(await getStore());
    } catch (err) {
      console.error("[api/data GET]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/data", async (req, res) => {
    try {
      const { password, data } = req.body || {};
      if (password !== ADMIN_PASSWORD) return res.status(401).json({ error: "Unauthorized" });
      if (!data || typeof data !== "object") return res.status(400).json({ error: "Invalid payload" });
      const current = await getStore();
      await setStore({ ...current, ...data });
      res.json({ success: true });
    } catch (err) {
      console.error("[api/data POST]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body || {};
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) res.json({ success: true });
    else res.status(401).json({ error: "Invalid credentials" });
  });

  // ----- Visit tracking -----
  app.post("/api/visit", async (req, res) => {
    try {
      const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() ||
        req.socket.remoteAddress || "0.0.0.0";
      const ua = (req.headers["user-agent"] as string) || "";
      const ref = (req.headers["referer"] as string) || (req.body?.ref as string) || "";
      const pathStr = typeof req.body?.path === "string" ? req.body.path.slice(0, 500) : "/";
      if (pathStr.startsWith("/admin") || pathStr.startsWith("/lidy")) {
        return res.json({ ok: true, ignored: true });
      }
      await recordVisit({ visitorId: hashVisitor(ip, ua), path: pathStr, ua, ref });
      res.json({ ok: true });
    } catch (err) {
      console.error("[api/visit]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/analytics", requireAdmin, async (_req, res) => {
    try {
      res.json(await getAnalytics());
    } catch (err) {
      console.error("[api/analytics]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/telegram/test", requireAdmin, async (_req, res) => {
    const ok = await sendTelegram(`🧪 <b>Test</b>\nGoGlobal admin → Telegram check ${new Date().toISOString()}`);
    res.json({ ok });
  });

  // ----- Uploads -----
  app.post("/api/upload", requireAdmin, (req, res, next) => {
    upload.single("file")(req, res, (err: any) => {
      if (err) {
        const msg = err instanceof Error ? err.message : "Upload failed";
        return res.status(msg.startsWith("Only image") ? 400 : 500).json({ error: msg });
      }
      next();
    });
  }, (req, res) => {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });
    res.json({ url: `/uploads/${req.file.filename}`, filename: req.file.filename, size: req.file.size });
  });

  app.delete("/api/upload/:filename", requireAdmin, async (req, res) => {
    const filename = path.basename(req.params.filename);
    const target = path.join(UPLOADS_DIR, filename);
    try {
      await fs.unlink(target);
      res.json({ success: true });
    } catch (err: any) {
      if (err && err.code === "ENOENT") return res.status(404).json({ error: "Not found" });
      console.error("[api/upload DELETE]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.use("/uploads", express.static(UPLOADS_DIR, { maxAge: "30d", immutable: true, index: false }));

  // ====================================================================
  // CRM — Lead intake
  // ====================================================================

  // Shared intake logic
  async function ingestLead(b: any, source: string) {
    const name = (b.name || "").toString().slice(0, 200);
    const phone = (b.phone || "").toString().slice(0, 50);
    const email = (b.email || "").toString().slice(0, 200);
    const country = (b.country || "").toString().slice(0, 100);
    const comment = (b.comment || "").toString().slice(0, 2000);
    const desired_university = (b.desired_university || "").toString().slice(0, 200);
    const study_level = (b.study_level || "").toString().slice(0, 80);
    const intake_term = (b.intake_term || "").toString().slice(0, 80);
    const budget = (b.budget || "").toString().slice(0, 80);
    const english_level = (b.english_level || "").toString().slice(0, 40);
    const birth_year = b.birth_year ? Number(b.birth_year) || null : null;
    const current_education = (b.current_education || "").toString().slice(0, 120);

    if (!name && !phone && !email) {
      throw new Error("Missing name/phone/email");
    }

    // Look up event by slug if provided
    let eventId: number | null = null;
    let eventNameSnapshot: string | null = null;
    if (b.event_slug) {
      const ev = await pq().query(
        `SELECT id, name FROM events WHERE slug = $1 AND active = TRUE`,
        [String(b.event_slug).trim().toLowerCase()]
      );
      if (ev.rows.length > 0) {
        eventId = ev.rows[0].id;
        eventNameSnapshot = ev.rows[0].name;
      }
    }

    const manager = await pickNextManager();
    // If no manager online: store unassigned, sla_deadline_at NULL (will be set when assigned)
    const slaDeadline = manager
      ? computeSlaDeadline(new Date(), (manager.working_hours as WorkingSchedule | null) ?? DEFAULT_SCHEDULE)
      : null;

    const insert = await pq().query(
      `INSERT INTO leads (name, phone, email, country, comment, source, raw,
                          assigned_manager_id, status_code, sla_deadline_at,
                          event_id, event_name_snapshot, desired_university, study_level,
                          intake_term, budget, english_level, birth_year, current_education)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'new',$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
       RETURNING id, received_at`,
      [name, phone, email, country, comment, source, JSON.stringify(b), manager?.id ?? null, slaDeadline,
        eventId, eventNameSnapshot, desired_university || null, study_level || null,
        intake_term || null, budget || null, english_level || null, birth_year, current_education || null]
    );
    const leadId = insert.rows[0].id;

    const tag = manager?.telegram_tag
      ? (manager.telegram_tag.startsWith("@") ? manager.telegram_tag : `@${manager.telegram_tag}`)
      : "";
    const wa = phone ? whatsappLink(phone) : null;
    const sourceLabel = sourceBadge(source);
    const lines = [
      `🆕 <b>Новый лид <a href="${PUBLIC_BASE_URL}/lidy">#${leadId}</a></b> ${sourceLabel}`,
      eventNameSnapshot ? `🎟 Событие: <b>${escapeHtml(eventNameSnapshot)}</b>` : "",
      name ? `👤 ${escapeHtml(name)}` : "",
      phone ? `📞 ${escapeHtml(phone)}${wa ? ` · <a href="${wa}">открыть WhatsApp</a>` : ""}` : "",
      email ? `✉️ <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>` : "",
      country ? `🌍 ${escapeHtml(country)}` : "",
      desired_university ? `🎓 ${escapeHtml(desired_university)}` : "",
      study_level || intake_term ? `📚 ${escapeHtml([study_level, intake_term].filter(Boolean).join(", "))}` : "",
      comment ? `💬 ${escapeHtml(comment)}` : "",
      manager
        ? `👨‍💼 Назначен: <b>${escapeHtml(manager.full_name)}</b> (${escapeHtml(manager.login)}) ${tag}`.trim()
        : `⚠️ <b>Нет онлайн-менеджеров!</b> Лид в очереди до выхода кого-то в сеть.`,
      slaDeadline ? `⏱ SLA до ${slaDeadline.toISOString().slice(0, 16).replace("T", " ")} UTC` : "",
      `→ <a href="${PUBLIC_BASE_URL}/lidy">открыть в CRM</a>`,
    ].filter(Boolean);
    sendTelegram(lines.join("\n")).catch(() => {});

    return { leadId, assigned: manager?.id ?? null };
  }

  // Simple in-memory rate limit for public website endpoint
  const websiteLeadHits = new Map<string, number[]>();
  function rateLimitOk(ip: string) {
    const now = Date.now();
    const arr = (websiteLeadHits.get(ip) || []).filter(t => now - t < 60_000);
    if (arr.length >= 10) {
      websiteLeadHits.set(ip, arr);
      return false;
    }
    arr.push(now);
    websiteLeadHits.set(ip, arr);
    return true;
  }

  // Public endpoint for the site's contact form (no secret, origin-checked + rate-limited)
  app.post("/api/leads/website", async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ error: "Database not configured" });
      await dbReady!;

      const ip = (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() ||
        req.socket.remoteAddress || "0.0.0.0";
      if (!rateLimitOk(ip)) {
        return res.status(429).json({ error: "Too many requests" });
      }

      // Use the source picked by the client (the new attribution dropdown).
      // Free-form, but we cap length to avoid abuse.
      const rawSource = (req.body?.source || "").toString().trim().slice(0, 80);
      const source = rawSource || "Сайт";
      const result = await ingestLead(req.body || {}, source);
      res.json({ ok: true, ...result });
    } catch (err: any) {
      const msg = err?.message || "Server error";
      const status = msg.startsWith("Missing") ? 400 : 500;
      if (status === 500) console.error("[leads/website]", err);
      res.status(status).json({ error: msg });
    }
  });

  // External webhook (Apps Script etc.) — requires shared secret
  app.post("/api/leads/intake", async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ error: "Database not configured" });
      await dbReady!;

      const providedSecret =
        (req.headers["x-intake-secret"] as string | undefined) ||
        (req.query.secret as string | undefined) ||
        (req.body?.secret as string | undefined);

      if (!LEAD_INTAKE_SECRET || providedSecret !== LEAD_INTAKE_SECRET) {
        return res.status(401).json({ error: "Invalid intake secret" });
      }

      const result = await ingestLead(req.body || {}, (req.body?.source || "external").toString());
      res.json({ ok: true, ...result });
    } catch (err: any) {
      const msg = err?.message || "Server error";
      const status = msg.startsWith("Missing") ? 400 : 500;
      if (status === 500) console.error("[api/leads/intake]", err);
      res.status(status).json({ error: msg });
    }
  });

  // ====================================================================
  // CRM — Manager auth & dashboard
  // ====================================================================
  app.post("/api/lidy/login", async (req, res) => {
    try {
      if (!pool) return res.status(503).json({ error: "Database not configured" });
      await dbReady!;
      const { login, password } = req.body || {};
      if (!login || !password) return res.status(400).json({ error: "Missing credentials" });

      const { rows } = await pool.query(
        `SELECT id, login, password_hash, full_name, active, archived_at FROM managers WHERE login = $1`,
        [String(login).trim().toLowerCase()]
      );
      if (rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });
      const m = rows[0];
      if (m.archived_at) return res.status(403).json({ error: "Account archived (manager left)" });
      if (!m.active) return res.status(403).json({ error: "Manager is deactivated" });

      const ok = await bcrypt.compare(String(password), m.password_hash);
      if (!ok) return res.status(401).json({ error: "Invalid credentials" });

      const token = signSession({ mid: m.id, login: m.login });
      res.cookie("lidy_session", token, {
        httpOnly: true,
        secure: NODE_ENV === "production",
        sameSite: "lax",
        maxAge: 12 * 60 * 60 * 1000,
        path: "/",
      });
      res.json({ ok: true, manager: { id: m.id, login: m.login, full_name: m.full_name } });
    } catch (err) {
      console.error("[lidy/login]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/lidy/logout", (_req, res) => {
    res.clearCookie("lidy_session", { path: "/" });
    res.json({ ok: true });
  });

  // Helper to load current manager record
  async function loadManager(mid: number) {
    const r = await pq().query(
      `SELECT id, login, full_name, telegram_tag, active, role, is_online, working_hours
       FROM managers WHERE id = $1`,
      [mid]
    );
    return r.rows[0] || null;
  }

  app.get("/api/lidy/me", requireManager, async (req, res) => {
    try {
      const session = (req as any).manager as { mid: number; login: string };
      const m = await loadManager(session.mid);
      if (!m) return res.status(401).json({ error: "Not found" });
      res.json({ manager: m });
    } catch (err) {
      console.error("[lidy/me]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Toggle own online status
  app.put("/api/lidy/me/status", requireManager, async (req, res) => {
    try {
      const session = (req as any).manager as { mid: number; login: string };
      const { is_online } = req.body || {};
      if (typeof is_online !== "boolean") return res.status(400).json({ error: "is_online boolean required" });
      const updated = await pq().query(
        `UPDATE managers SET is_online = $1 WHERE id = $2
         RETURNING id, full_name, login, is_online`,
        [is_online, session.mid]
      );
      const me = updated.rows[0];

      let redistribution: { assigned: number; details: any[] } | null = null;
      if (is_online) {
        // Coming online — try to grab pending leads
        redistribution = await assignPendingLeads(me.full_name);
      } else {
        // Going offline — notify Telegram
        sendTelegram(`💤 <b>${escapeHtml(me.full_name)}</b> (${escapeHtml(me.login)}) — не в сети`).catch(() => {});
      }
      res.json({ ok: true, manager: me, redistribution });
    } catch (err) {
      console.error("[lidy/me/status]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/lidy/leads", requireManager, async (req, res) => {
    try {
      const session = (req as any).manager as { mid: number; login: string };
      const me = await loadManager(session.mid);
      if (!me) return res.status(401).json({ error: "Not found" });

      // Default scope:
      //  - manager → "mine" (own leads only)
      //  - teamlead → "all" (sees everything)
      const requestedScope = req.query.scope as string | undefined;
      const scope = requestedScope || (me.role === "teamlead" ? "all" : "mine");

      // Managers cannot view scope=all (force mine)
      const onlyMine = me.role === "teamlead" ? scope === "mine" : true;
      const showOverdueOnly = req.query.overdue === "1";
      const includeClosed = req.query.include_closed === "1";
      const filterStatus = (req.query.status as string | undefined) || null;
      const filterManagerId = req.query.manager_id ? Number(req.query.manager_id) : null;
      const filterSource = (req.query.source as string | undefined) || null;
      const filterCountry = (req.query.country as string | undefined) || null;
      const filterUniversity = (req.query.university as string | undefined) || null;
      const filterStudyLevel = (req.query.study_level as string | undefined) || null;
      const filterEventId = req.query.event_id ? Number(req.query.event_id) : null;
      const filterFrom = (req.query.from as string | undefined) || null;
      const filterTo = (req.query.to as string | undefined) || null;
      const filterSearch = ((req.query.q as string | undefined) || "").trim();

      const where: string[] = [];
      const params: any[] = [];
      if (onlyMine) {
        // "My leads" = owned by me OR pending incoming transfer to me
        // (so the target manager sees the lead with the accept/reject banner)
        where.push(`(assigned_manager_id = $${params.length + 1} OR pending_transfer_to_id = $${params.length + 1})`);
        params.push(session.mid);
      } else if (filterManagerId) {
        where.push(`assigned_manager_id = $${params.length + 1}`);
        params.push(filterManagerId);
      }
      if (filterStatus) {
        where.push(`l.status_code = $${params.length + 1}`);
        params.push(filterStatus);
      }
      if (showOverdueOnly) {
        where.push(`l.processed_at IS NULL AND l.sla_deadline_at < NOW()`);
      }
      // By default hide processed/closed AND semi-closed leads. Manager toggles them on.
      if (!includeClosed && !filterStatus) {
        where.push(`l.processed_at IS NULL`);
        where.push(`(l.status_code IS NULL OR l.status_code NOT IN (SELECT code FROM lead_statuses WHERE is_semi_closed))`);
      }
      if (filterSource) {
        where.push(`LOWER(l.source) = LOWER($${params.length + 1})`);
        params.push(filterSource);
      }
      if (filterCountry) {
        where.push(`LOWER(l.country) = LOWER($${params.length + 1})`);
        params.push(filterCountry);
      }
      if (filterUniversity) {
        where.push(`LOWER(l.desired_university) LIKE LOWER($${params.length + 1})`);
        params.push(`%${filterUniversity}%`);
      }
      if (filterStudyLevel) {
        where.push(`l.study_level = $${params.length + 1}`);
        params.push(filterStudyLevel);
      }
      if (filterEventId) {
        where.push(`l.event_id = $${params.length + 1}`);
        params.push(filterEventId);
      }
      if (filterFrom) {
        where.push(`l.received_at >= $${params.length + 1}`);
        params.push(new Date(filterFrom));
      }
      if (filterTo) {
        where.push(`l.received_at <= $${params.length + 1}`);
        params.push(new Date(filterTo));
      }
      if (filterSearch) {
        const q = `%${filterSearch.replace(/[%_]/g, "\\$&")}%`;
        where.push(`(LOWER(l.name) LIKE LOWER($${params.length + 1})
                    OR LOWER(l.phone) LIKE LOWER($${params.length + 1})
                    OR LOWER(l.email) LIKE LOWER($${params.length + 1})
                    OR LOWER(l.comment) LIKE LOWER($${params.length + 1})
                    OR LOWER(l.desired_university) LIKE LOWER($${params.length + 1}))`);
        params.push(q);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const { rows } = await pq().query(
        `SELECT l.*, ls.label AS status_label, ls.color AS status_color, ls.is_terminal AS status_is_terminal,
                m.full_name AS manager_name, m.login AS manager_login, m.archived_at AS manager_archived_at,
                pt.full_name AS pending_transfer_to_name, pt.login AS pending_transfer_to_login,
                pby.full_name AS pending_transfer_by_name,
                ev.name AS event_name, ev.slug AS event_slug
         FROM leads l
         LEFT JOIN lead_statuses ls ON ls.code = l.status_code
         LEFT JOIN managers m ON m.id = l.assigned_manager_id
         LEFT JOIN managers pt ON pt.id = l.pending_transfer_to_id
         LEFT JOIN managers pby ON pby.id = l.pending_transfer_by_id
         LEFT JOIN events ev ON ev.id = l.event_id
         ${whereSql}
         ORDER BY l.received_at DESC
         LIMIT 300`,
        params
      );
      res.json({ leads: rows, role: me.role });
    } catch (err) {
      console.error("[lidy/leads]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Calendar: leads with scheduled appointments in a date range
  app.get("/api/lidy/calendar", requireManager, async (req, res) => {
    try {
      const session = (req as any).manager as { mid: number; login: string };
      const me = await loadManager(session.mid);
      if (!me) return res.status(401).json({ error: "Not found" });
      const from = req.query.from ? new Date(String(req.query.from)) : new Date();
      const to = req.query.to ? new Date(String(req.query.to)) : new Date(Date.now() + 30 * 86400_000);
      const onlyMine = req.query.scope !== "all" && me.role !== "teamlead";

      const where: string[] = [`l.appointment_at IS NOT NULL`, `l.appointment_at >= $1`, `l.appointment_at <= $2`];
      const params: any[] = [from, to];
      if (onlyMine) { where.push(`l.assigned_manager_id = $${params.length + 1}`); params.push(me.id); }

      const { rows } = await pq().query(
        `SELECT l.id, l.name, l.phone, l.email, l.country,
                l.appointment_at, l.appointment_until, l.appointment_kind,
                l.status_code, ls.label AS status_label, ls.color AS status_color,
                m.full_name AS manager_name
         FROM leads l
         LEFT JOIN lead_statuses ls ON ls.code = l.status_code
         LEFT JOIN managers m ON m.id = l.assigned_manager_id
         WHERE ${where.join(" AND ")}
         ORDER BY l.appointment_at ASC`,
        params
      );
      res.json({ appointments: rows });
    } catch (err) {
      console.error("[lidy/calendar]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Roster of all managers — used by teamlead UI to show stats and reassignment dropdown
  app.get("/api/lidy/managers", requireManager, async (req, res) => {
    try {
      const session = (req as any).manager as { mid: number; login: string };
      const me = await loadManager(session.mid);
      if (!me) return res.status(401).json({ error: "Not found" });
      // Managers see only basic name list (for display in their own card if needed)
      // Teamleads see full stats
      // IMPORTANT: include `active` + `archived_at` so the transfer-dropdown filter on
      // the client doesn't drop everyone (managers need these fields to render the list).
      if (me.role !== "teamlead") {
        const r = await pq().query(
          `SELECT id, full_name, login, is_online, role, active, archived_at, telegram_tag
           FROM managers
           WHERE archived_at IS NULL
           ORDER BY full_name`
        );
        return res.json({ managers: r.rows, role: me.role });
      }
      const r = await pq().query(
        `SELECT m.id, m.full_name, m.login, m.is_online, m.active, m.role, m.telegram_tag,
                COUNT(l.*) FILTER (WHERE l.received_at >= NOW() - INTERVAL '30 days')::int AS total30,
                COUNT(*) FILTER (WHERE l.processed_at IS NULL)::int AS open,
                COUNT(*) FILTER (WHERE ls.is_terminal AND l.received_at >= NOW() - INTERVAL '30 days')::int AS closed30,
                COUNT(*) FILTER (WHERE l.processed_at IS NULL AND l.sla_deadline_at < NOW())::int AS overdue
         FROM managers m
         LEFT JOIN leads l ON l.assigned_manager_id = m.id
         LEFT JOIN lead_statuses ls ON ls.code = l.status_code
         GROUP BY m.id, m.full_name, m.login, m.is_online, m.active, m.role, m.telegram_tag
         ORDER BY m.full_name`
      );
      res.json({ managers: r.rows, role: me.role });
    } catch (err) {
      console.error("[lidy/managers]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/lidy/leads/:id/status", requireManager, async (req, res) => {
    try {
      const session = (req as any).manager as { mid: number; login: string };
      const me = await loadManager(session.mid);
      if (!me) return res.status(401).json({ error: "Not found" });
      const leadId = Number(req.params.id);
      const { status, note, rejection_reason, appointment_at, appointment_until, appointment_kind } = req.body || {};
      if (!status) return res.status(400).json({ error: "Missing status" });

      const statusRow = await pq().query(
        `SELECT code, is_terminal, requires_reason, requires_appointment FROM lead_statuses WHERE code = $1`,
        [status]
      );
      if (statusRow.rows.length === 0) return res.status(400).json({ error: "Unknown status" });
      if (statusRow.rows[0].requires_reason && !(rejection_reason && String(rejection_reason).trim())) {
        return res.status(400).json({ error: "Этот статус требует указать причину" });
      }
      if (statusRow.rows[0].requires_appointment && !appointment_at) {
        return res.status(400).json({ error: "Этот статус требует указать дату/время визита" });
      }

      const leadRow = await pq().query(`SELECT id, status_code, assigned_manager_id FROM leads WHERE id = $1`, [leadId]);
      if (leadRow.rows.length === 0) return res.status(404).json({ error: "Lead not found" });
      const lead = leadRow.rows[0];

      if (me.role !== "teamlead" && lead.assigned_manager_id && lead.assigned_manager_id !== session.mid) {
        return res.status(403).json({ error: "Lead is assigned to another manager" });
      }

      const newProcessedAt = statusRow.rows[0].is_terminal ? "NOW()" : "processed_at";
      const updated = await pq().query(
        `UPDATE leads
         SET status_code = $1,
             notes = COALESCE($2, notes),
             rejection_reason = COALESCE($3, rejection_reason),
             appointment_at = $4,
             appointment_until = $5,
             appointment_kind = $6,
             updated_at = NOW(),
             processed_at = ${newProcessedAt},
             assigned_manager_id = COALESCE(assigned_manager_id, $7)
         WHERE id = $8
         RETURNING id, status_code, processed_at, rejection_reason, appointment_at, appointment_kind`,
        [
          status, note ?? null, rejection_reason ?? null,
          appointment_at ? new Date(appointment_at) : null,
          appointment_until ? new Date(appointment_until) : null,
          (appointment_kind || (appointment_at ? "specific" : null)) ?? null,
          session.mid, leadId,
        ]
      );

      await pq().query(
        `INSERT INTO lead_status_history (lead_id, from_status, to_status, manager_id, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [leadId, lead.status_code, status, session.mid, note ?? null]
      );
      // Auto-add a comment when rejection reason given
      if (rejection_reason && String(rejection_reason).trim()) {
        await pq().query(
          `INSERT INTO lead_comments (lead_id, manager_id, author_name, author_role, body)
           VALUES ($1, $2, $3, $4, $5)`,
          [leadId, me.id, me.full_name, me.role || "manager", `❌ Причина отказа: ${rejection_reason}`]
        );
      }
      // Auto-comment when appointment scheduled
      if (statusRow.rows[0].requires_appointment && appointment_at) {
        const when = new Date(appointment_at).toLocaleString("ru-RU", { timeZone: "Asia/Bishkek", dateStyle: "short", timeStyle: "short" });
        const kindLabel = appointment_kind === "range" && appointment_until
          ? `с ${when} до ${new Date(appointment_until).toLocaleString("ru-RU", { timeZone: "Asia/Bishkek", dateStyle: "short", timeStyle: "short" })}`
          : appointment_kind === "within_day"
            ? `в течение дня ${new Date(appointment_at).toLocaleDateString("ru-RU", { timeZone: "Asia/Bishkek" })}`
            : `${when}`;
        await pq().query(
          `INSERT INTO lead_comments (lead_id, manager_id, author_name, author_role, body)
           VALUES ($1, $2, $3, $4, $5)`,
          [leadId, me.id, me.full_name, me.role || "manager", `📅 Запланирован визит в офис: ${kindLabel}`]
        );
      }

      res.json({ ok: true, lead: updated.rows[0] });
    } catch (err) {
      console.error("[lidy/status]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Single-lead detail (fast lookup for the drawer)
  app.get("/api/lidy/leads/:id", requireManager, async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const { rows } = await pq().query(
        `SELECT l.*, ls.label AS status_label, ls.color AS status_color,
                ls.is_terminal AS status_is_terminal, ls.is_semi_closed AS status_is_semi_closed,
                ls.requires_appointment AS status_requires_appointment,
                m.full_name AS manager_name, m.login AS manager_login, m.archived_at AS manager_archived_at,
                pt.full_name AS pending_transfer_to_name,
                pby.full_name AS pending_transfer_by_name,
                ev.name AS event_name
         FROM leads l
         LEFT JOIN lead_statuses ls ON ls.code = l.status_code
         LEFT JOIN managers m ON m.id = l.assigned_manager_id
         LEFT JOIN managers pt ON pt.id = l.pending_transfer_to_id
         LEFT JOIN managers pby ON pby.id = l.pending_transfer_by_id
         LEFT JOIN events ev ON ev.id = l.event_id
         WHERE l.id = $1`,
        [leadId]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      res.json({ lead: rows[0] });
    } catch (err) {
      console.error("[lidy/lead GET]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Find related leads (same phone OR email) — for dedup / "same client" hint
  app.get("/api/lidy/leads/:id/related", requireManager, async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const main = await pq().query(`SELECT phone, email FROM leads WHERE id = $1`, [leadId]);
      if (main.rows.length === 0) return res.status(404).json({ error: "Not found" });
      const phone = (main.rows[0].phone || "").replace(/\D/g, "");
      const email = (main.rows[0].email || "").toLowerCase().trim();
      if (!phone && !email) return res.json({ related: [] });
      const conds: string[] = [];
      const params: any[] = [leadId];
      if (phone) {
        conds.push(`regexp_replace(phone, '\\D', '', 'g') = $${params.length + 1}`);
        params.push(phone);
      }
      if (email) {
        conds.push(`LOWER(email) = $${params.length + 1}`);
        params.push(email);
      }
      const { rows } = await pq().query(
        `SELECT l.id, l.received_at, l.name, l.phone, l.email, l.country, l.source,
                l.status_code, ls.label AS status_label, ls.color AS status_color,
                m.full_name AS manager_name
         FROM leads l
         LEFT JOIN lead_statuses ls ON ls.code = l.status_code
         LEFT JOIN managers m ON m.id = l.assigned_manager_id
         WHERE l.id <> $1 AND (${conds.join(" OR ")})
         ORDER BY l.received_at DESC
         LIMIT 20`,
        params
      );
      res.json({ related: rows });
    } catch (err) {
      console.error("[lidy/lead/related]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Get comments for a lead
  app.get("/api/lidy/leads/:id/comments", requireManager, async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const { rows } = await pq().query(
        `SELECT id, manager_id, author_name, author_role, body, created_at
         FROM lead_comments WHERE lead_id = $1 ORDER BY created_at ASC`,
        [leadId]
      );
      res.json({ comments: rows });
    } catch (err) {
      console.error("[lidy/comments GET]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Add a comment to a lead
  app.post("/api/lidy/leads/:id/comments", requireManager, async (req, res) => {
    try {
      const session = (req as any).manager as { mid: number; login: string };
      const me = await loadManager(session.mid);
      if (!me) return res.status(401).json({ error: "Not found" });
      const leadId = Number(req.params.id);
      const body = String(req.body?.body || "").trim();
      if (!body) return res.status(400).json({ error: "Empty comment" });
      if (body.length > 4000) return res.status(400).json({ error: "Comment too long" });

      // Both managers and teamleads can comment on any lead they can see
      // Manager can only comment on their own leads (unless teamlead)
      const leadRow = await pq().query(`SELECT id, assigned_manager_id FROM leads WHERE id = $1`, [leadId]);
      if (leadRow.rows.length === 0) return res.status(404).json({ error: "Lead not found" });
      const lead = leadRow.rows[0];
      if (me.role !== "teamlead" && lead.assigned_manager_id && lead.assigned_manager_id !== me.id) {
        return res.status(403).json({ error: "You can only comment on your own leads" });
      }

      const { rows } = await pq().query(
        `INSERT INTO lead_comments (lead_id, manager_id, author_name, author_role, body)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, manager_id, author_name, author_role, body, created_at`,
        [leadId, me.id, me.full_name, me.role || "manager", body]
      );
      res.json({ ok: true, comment: rows[0] });
    } catch (err) {
      console.error("[lidy/comments POST]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ====================================================================
  // Events (admin CRUD + public lookup)
  // ====================================================================
  function slugify(s: string) {
    const map: Record<string, string> = {
      а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ж: "zh", з: "z",
      и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o", п: "p",
      р: "r", с: "s", т: "t", у: "u", ф: "f", х: "h", ц: "c", ч: "ch",
      ш: "sh", щ: "sch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu", я: "ya",
      ё: "e",
    };
    return s
      .toLowerCase()
      .replace(/[а-яё]/g, c => (c in map ? map[c] : c))
      .replace(/[^a-z0-9\s-]/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .replace(/^-|-$/g, "")
      .slice(0, 60);
  }

  app.get("/api/admin/events", requireAdmin, async (_req, res) => {
    try {
      const { rows } = await pq().query(
        `SELECT e.*,
                (SELECT COUNT(*)::int FROM leads l WHERE l.event_id = e.id) AS lead_count
         FROM events e
         ORDER BY e.active DESC, e.created_at DESC`
      );
      res.json({ events: rows });
    } catch (err) {
      console.error("[admin/events GET]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/admin/events", requireAdmin, async (req, res) => {
    try {
      const name = String(req.body?.name || "").trim();
      const description = String(req.body?.description || "").trim();
      let slug = String(req.body?.slug || "").trim().toLowerCase();
      if (!name) return res.status(400).json({ error: "name required" });
      if (!slug) slug = slugify(name) + "-" + Math.random().toString(36).slice(2, 6);

      const { rows } = await pq().query(
        `INSERT INTO events (slug, name, description) VALUES ($1, $2, $3)
         RETURNING *`,
        [slug, name, description || null]
      );
      res.json({ event: rows[0] });
    } catch (err: any) {
      if (err?.code === "23505") return res.status(409).json({ error: "Slug already exists" });
      console.error("[admin/events POST]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/admin/events/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { name, description, active, slug } = req.body || {};
      const sets: string[] = [];
      const params: any[] = [];
      if (name !== undefined) { sets.push(`name = $${params.length + 1}`); params.push(name); }
      if (description !== undefined) { sets.push(`description = $${params.length + 1}`); params.push(description || null); }
      if (active !== undefined) { sets.push(`active = $${params.length + 1}`); params.push(!!active); }
      if (slug !== undefined && slug) { sets.push(`slug = $${params.length + 1}`); params.push(String(slug).trim().toLowerCase()); }
      if (sets.length === 0) return res.json({ ok: true });
      params.push(id);
      const { rows } = await pq().query(
        `UPDATE events SET ${sets.join(", ")} WHERE id = $${params.length} RETURNING *`,
        params
      );
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      res.json({ event: rows[0] });
    } catch (err: any) {
      if (err?.code === "23505") return res.status(409).json({ error: "Slug already exists" });
      console.error("[admin/events PUT]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/admin/events/:id", requireAdmin, async (req, res) => {
    await pq().query(`DELETE FROM events WHERE id = $1`, [Number(req.params.id)]);
    res.json({ ok: true });
  });

  // Public lookup for the /apply page when ?event=<slug>
  app.get("/api/events/:slug", async (req, res) => {
    try {
      const slug = String(req.params.slug || "").trim().toLowerCase();
      const { rows } = await pq().query(
        `SELECT id, slug, name, description FROM events WHERE slug = $1 AND active = TRUE`,
        [slug]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      res.json({ event: rows[0] });
    } catch (err) {
      console.error("[events public]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ====================================================================
  // Generic lead field update (for university, budget, level, etc.)
  // ====================================================================
  const ALLOWED_LEAD_FIELDS = new Set([
    "name", "phone", "email", "country", "comment",
    "desired_university", "study_level", "intake_term", "budget",
    "english_level", "birth_year", "current_education",
  ]);

  app.patch("/api/lidy/leads/:id", requireManager, async (req, res) => {
    try {
      const session = (req as any).manager as { mid: number; login: string };
      const me = await loadManager(session.mid);
      if (!me) return res.status(401).json({ error: "Not found" });
      const leadId = Number(req.params.id);

      const leadRow = await pq().query(`SELECT id, assigned_manager_id FROM leads WHERE id = $1`, [leadId]);
      if (leadRow.rows.length === 0) return res.status(404).json({ error: "Lead not found" });
      const lead = leadRow.rows[0];
      if (me.role !== "teamlead" && lead.assigned_manager_id && lead.assigned_manager_id !== me.id) {
        return res.status(403).json({ error: "Not your lead" });
      }

      const sets: string[] = [];
      const params: any[] = [];
      for (const [k, v] of Object.entries(req.body || {})) {
        if (!ALLOWED_LEAD_FIELDS.has(k)) continue;
        sets.push(`${k} = $${params.length + 1}`);
        params.push(v === "" ? null : v);
      }
      if (sets.length === 0) return res.status(400).json({ error: "Nothing to update" });
      params.push(leadId);
      const { rows } = await pq().query(
        `UPDATE leads SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${params.length}
         RETURNING *`,
        params
      );
      res.json({ ok: true, lead: rows[0] });
    } catch (err) {
      console.error("[lidy/lead PATCH]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Manager/teamlead manually creates a lead (e.g. client called).
  // Assigned to the creator (or to chosen manager if teamlead specifies assigned_manager_id).
  app.post("/api/lidy/leads", requireManager, async (req, res) => {
    try {
      const session = (req as any).manager as { mid: number; login: string };
      const me = await loadManager(session.mid);
      if (!me) return res.status(401).json({ error: "Not found" });
      const b = req.body || {};
      const name = (b.name || "").toString().slice(0, 200);
      const phone = (b.phone || "").toString().slice(0, 50);
      const email = (b.email || "").toString().slice(0, 200);
      if (!name && !phone && !email) {
        return res.status(400).json({ error: "Нужно хотя бы имя, телефон или email" });
      }
      const source = (b.source || "").toString().trim().slice(0, 80);
      if (!source) return res.status(400).json({ error: "Укажите источник лида" });

      const country = (b.country || "").toString().slice(0, 100);
      const comment = (b.comment || "").toString().slice(0, 2000);
      const desired_university = (b.desired_university || "").toString().slice(0, 200);
      const study_level = (b.study_level || "").toString().slice(0, 80);
      const intake_term = (b.intake_term || "").toString().slice(0, 80);
      const budget = (b.budget || "").toString().slice(0, 80);
      const english_level = (b.english_level || "").toString().slice(0, 40);
      const birth_year = b.birth_year ? Number(b.birth_year) || null : null;
      const current_education = (b.current_education || "").toString().slice(0, 120);

      // Choose assignee: teamlead may pass assigned_manager_id; otherwise default to self
      let assigneeId: number = me.id;
      if (me.role === "teamlead" && b.assigned_manager_id) {
        const target = await loadManager(Number(b.assigned_manager_id));
        if (!target || target.archived_at || !target.active) {
          return res.status(400).json({ error: "Invalid assigned_manager_id" });
        }
        assigneeId = target.id;
      }
      const assignee = await loadManager(assigneeId);
      const slaDeadline = computeSlaDeadline(
        new Date(),
        (assignee?.working_hours as WorkingSchedule | null) ?? DEFAULT_SCHEDULE
      );

      // Optionally link to event
      let eventId: number | null = null;
      let eventNameSnapshot: string | null = null;
      if (b.event_id) {
        const ev = await pq().query(`SELECT id, name FROM events WHERE id = $1`, [Number(b.event_id)]);
        if (ev.rows.length > 0) { eventId = ev.rows[0].id; eventNameSnapshot = ev.rows[0].name; }
      }

      const insert = await pq().query(
        `INSERT INTO leads (name, phone, email, country, comment, source, raw,
                            assigned_manager_id, status_code, sla_deadline_at,
                            event_id, event_name_snapshot, desired_university, study_level,
                            intake_term, budget, english_level, birth_year, current_education)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'new',$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
         RETURNING id, received_at`,
        [name, phone, email, country, comment, source, JSON.stringify({ ...b, _manual: true, _created_by: me.login }),
          assigneeId, slaDeadline, eventId, eventNameSnapshot, desired_university || null, study_level || null,
          intake_term || null, budget || null, english_level || null, birth_year, current_education || null]
      );
      const leadId = insert.rows[0].id;

      // First comment: who created it
      await pq().query(
        `INSERT INTO lead_comments (lead_id, manager_id, author_name, author_role, body)
         VALUES ($1, $2, $3, $4, $5)`,
        [leadId, me.id, me.full_name, me.role || "manager", `📞 Лид создан вручную (${escapeHtml(source)})`]
      );

      const wa = phone ? whatsappLink(phone) : null;
      const tag = assignee?.telegram_tag ? (assignee.telegram_tag.startsWith("@") ? assignee.telegram_tag : `@${assignee.telegram_tag}`) : "";
      sendTelegram([
        `📞 <b>Лид #${leadId} создан вручную</b> · ${sourceBadge(source)}`,
        `Кем: ${escapeHtml(me.full_name)} (${escapeHtml(me.login)})`,
        name ? `👤 ${escapeHtml(name)}` : "",
        phone ? `📞 ${escapeHtml(phone)}${wa ? ` · <a href="${wa}">WhatsApp</a>` : ""}` : "",
        email ? `✉️ <a href="mailto:${escapeHtml(email)}">${escapeHtml(email)}</a>` : "",
        country ? `🌍 ${escapeHtml(country)}` : "",
        comment ? `💬 ${escapeHtml(comment)}` : "",
        assignee ? `👨‍💼 Назначен: <b>${escapeHtml(assignee.full_name)}</b> ${tag}`.trim() : "",
        `→ <a href="${PUBLIC_BASE_URL}/lidy">открыть в CRM</a>`,
      ].filter(Boolean).join("\n")).catch(() => {});

      res.json({ ok: true, leadId, assigned: assigneeId });
    } catch (err) {
      console.error("[lidy/lead POST]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Teamlead can delete a lead from /lidy
  app.delete("/api/lidy/leads/:id", requireManager, async (req, res) => {
    try {
      const session = (req as any).manager as { mid: number; login: string };
      const me = await loadManager(session.mid);
      if (!me) return res.status(401).json({ error: "Not found" });
      if (me.role !== "teamlead") return res.status(403).json({ error: "Teamlead only" });
      const leadId = Number(req.params.id);
      const r = await pq().query(`DELETE FROM leads WHERE id = $1 RETURNING id`, [leadId]);
      if (r.rows.length === 0) return res.status(404).json({ error: "Not found" });
      sendTelegram(`🗑 Лид #${leadId} удалён тимлидом ${escapeHtml(me.full_name)}`).catch(() => {});
      res.json({ ok: true });
    } catch (err) {
      console.error("[lidy/lead DELETE]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Admin: delete + patch any lead from the admin panel
  app.delete("/api/admin/leads/:id", requireAdmin, async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const r = await pq().query(`DELETE FROM leads WHERE id = $1 RETURNING id`, [leadId]);
      if (r.rows.length === 0) return res.status(404).json({ error: "Not found" });
      sendTelegram(`🗑 Лид #${leadId} удалён админом`).catch(() => {});
      res.json({ ok: true });
    } catch (err) {
      console.error("[admin/lead DELETE]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.patch("/api/admin/leads/:id", requireAdmin, async (req, res) => {
    try {
      const leadId = Number(req.params.id);
      const sets: string[] = [];
      const params: any[] = [];
      for (const [k, v] of Object.entries(req.body || {})) {
        if (!ALLOWED_LEAD_FIELDS.has(k)) continue;
        sets.push(`${k} = $${params.length + 1}`);
        params.push(v === "" ? null : v);
      }
      // Admin can also update notes / source / status_code / rejection_reason directly
      const ADMIN_EXTRA = new Set(["notes", "source", "status_code", "rejection_reason"]);
      for (const [k, v] of Object.entries(req.body || {})) {
        if (!ADMIN_EXTRA.has(k)) continue;
        sets.push(`${k} = $${params.length + 1}`);
        params.push(v === "" ? null : v);
      }
      if (sets.length === 0) return res.status(400).json({ error: "Nothing to update" });
      params.push(leadId);
      const { rows } = await pq().query(
        `UPDATE leads SET ${sets.join(", ")}, updated_at = NOW() WHERE id = $${params.length} RETURNING *`,
        params
      );
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      res.json({ ok: true, lead: rows[0] });
    } catch (err) {
      console.error("[admin/lead PATCH]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Manager can change the source on a lead (correct attribution)
  app.put("/api/lidy/leads/:id/source", requireManager, async (req, res) => {
    try {
      const session = (req as any).manager as { mid: number; login: string };
      const me = await loadManager(session.mid);
      if (!me) return res.status(401).json({ error: "Not found" });
      const leadId = Number(req.params.id);
      const newSource = String(req.body?.source || "").trim();
      if (!newSource) return res.status(400).json({ error: "Source required" });

      const leadRow = await pq().query(`SELECT id, assigned_manager_id, source FROM leads WHERE id = $1`, [leadId]);
      if (leadRow.rows.length === 0) return res.status(404).json({ error: "Lead not found" });
      const lead = leadRow.rows[0];
      if (me.role !== "teamlead" && lead.assigned_manager_id && lead.assigned_manager_id !== me.id) {
        return res.status(403).json({ error: "You can only edit your own leads" });
      }

      await pq().query(`UPDATE leads SET source = $1, updated_at = NOW() WHERE id = $2`, [newSource, leadId]);
      // Log as a comment for trail
      await pq().query(
        `INSERT INTO lead_comments (lead_id, manager_id, author_name, author_role, body)
         VALUES ($1, $2, $3, $4, $5)`,
        [leadId, me.id, me.full_name, me.role || "manager", `🏷 Изменил источник: «${lead.source || "—"}» → «${newSource}»`]
      );
      res.json({ ok: true, source: newSource });
    } catch (err) {
      console.error("[lidy/source]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ----- Manager-to-manager transfer (10-min accept window) -----
  const TRANSFER_TIMEOUT_MIN = Number(process.env.LEAD_TRANSFER_TIMEOUT_MIN || 10);

  // Initiate transfer: manager A sends a lead they own to manager B
  app.post("/api/lidy/leads/:id/transfer", requireManager, async (req, res) => {
    try {
      const session = (req as any).manager as { mid: number; login: string };
      const me = await loadManager(session.mid);
      if (!me) return res.status(401).json({ error: "Not found" });
      const leadId = Number(req.params.id);
      const targetId = Number(req.body?.manager_id);
      if (!targetId) return res.status(400).json({ error: "manager_id required" });
      if (targetId === me.id) return res.status(400).json({ error: "Cannot transfer to self" });

      const target = await loadManager(targetId);
      if (!target || !target.active || target.archived_at || target.role !== "manager") {
        return res.status(400).json({ error: "Target manager not eligible" });
      }

      const leadRow = await pq().query(
        `SELECT id, assigned_manager_id, pending_transfer_to_id FROM leads WHERE id = $1`,
        [leadId]
      );
      if (leadRow.rows.length === 0) return res.status(404).json({ error: "Lead not found" });
      const lead = leadRow.rows[0];

      // Manager can transfer only their own lead. Teamlead can transfer any (but should use reassign)
      if (me.role !== "teamlead" && lead.assigned_manager_id !== me.id) {
        return res.status(403).json({ error: "You don't own this lead" });
      }
      if (lead.pending_transfer_to_id) {
        return res.status(409).json({ error: "Already pending transfer" });
      }

      await pq().query(
        `UPDATE leads SET pending_transfer_to_id = $1, pending_transfer_at = NOW(), pending_transfer_by_id = $2,
                          updated_at = NOW()
         WHERE id = $3`,
        [targetId, me.id, leadId]
      );

      const tag = (m: any) => m?.telegram_tag ? (m.telegram_tag.startsWith("@") ? m.telegram_tag : `@${m.telegram_tag}`) : "";
      sendTelegram(
        [
          `🤝 <b>Передача лида #${leadId}</b>`,
          `От: <b>${escapeHtml(me.full_name)}</b> ${tag(me)}`,
          `Кому: <b>${escapeHtml(target.full_name)}</b> ${tag(target)} — ждём принятия (${TRANSFER_TIMEOUT_MIN} мин)`,
          `→ <a href="${PUBLIC_BASE_URL}/lidy">открыть в CRM</a>`,
        ].join("\n")
      ).catch(() => {});

      res.json({ ok: true, target: { id: target.id, full_name: target.full_name }, expiresInMinutes: TRANSFER_TIMEOUT_MIN });
    } catch (err) {
      console.error("[lidy/transfer]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/lidy/leads/:id/transfer/accept", requireManager, async (req, res) => {
    try {
      const session = (req as any).manager as { mid: number; login: string };
      const me = await loadManager(session.mid);
      if (!me) return res.status(401).json({ error: "Not found" });
      const leadId = Number(req.params.id);

      const leadRow = await pq().query(
        `SELECT l.id, l.assigned_manager_id, l.pending_transfer_to_id, l.pending_transfer_by_id,
                m_old.full_name AS old_name, m_old.telegram_tag AS old_tag
         FROM leads l
         LEFT JOIN managers m_old ON m_old.id = l.assigned_manager_id
         WHERE l.id = $1`,
        [leadId]
      );
      if (leadRow.rows.length === 0) return res.status(404).json({ error: "Lead not found" });
      const lead = leadRow.rows[0];
      if (lead.pending_transfer_to_id !== me.id) {
        return res.status(403).json({ error: "Not the transfer target" });
      }

      // New SLA based on accepting manager's hours
      const newSla = computeSlaDeadline(
        new Date(),
        (me.working_hours as WorkingSchedule | null) ?? DEFAULT_SCHEDULE
      );

      await pq().query(
        `UPDATE leads SET assigned_manager_id = $1,
                          sla_deadline_at = $2, sla_warned = FALSE,
                          pending_transfer_to_id = NULL, pending_transfer_at = NULL, pending_transfer_by_id = NULL,
                          updated_at = NOW()
         WHERE id = $3`,
        [me.id, newSla, leadId]
      );
      await pq().query(
        `INSERT INTO lead_status_history (lead_id, from_status, to_status, manager_id, note)
         VALUES ($1, '(transfer)', '(accepted)', $2, $3)`,
        [leadId, me.id, `Accepted from ${lead.old_name || "(unassigned)"}`]
      );

      const tag = (m: any) => m?.telegram_tag ? (m.telegram_tag.startsWith("@") ? m.telegram_tag : `@${m.telegram_tag}`) : "";
      sendTelegram(
        [
          `✅ <b>Лид #${leadId} принят</b>`,
          `Был у: ${escapeHtml(lead.old_name || "—")} ${tag({ telegram_tag: lead.old_tag })}`,
          `Теперь у: <b>${escapeHtml(me.full_name)}</b> ${tag(me)}`,
        ].join("\n")
      ).catch(() => {});

      res.json({ ok: true });
    } catch (err) {
      console.error("[lidy/transfer/accept]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/lidy/leads/:id/transfer/reject", requireManager, async (req, res) => {
    try {
      const session = (req as any).manager as { mid: number; login: string };
      const me = await loadManager(session.mid);
      if (!me) return res.status(401).json({ error: "Not found" });
      const leadId = Number(req.params.id);

      const leadRow = await pq().query(
        `SELECT id, assigned_manager_id, pending_transfer_to_id, pending_transfer_by_id
         FROM leads WHERE id = $1`,
        [leadId]
      );
      if (leadRow.rows.length === 0) return res.status(404).json({ error: "Lead not found" });
      const lead = leadRow.rows[0];

      // Only the target OR the initiator OR teamlead can cancel
      const allowed = lead.pending_transfer_to_id === me.id
        || lead.pending_transfer_by_id === me.id
        || me.role === "teamlead";
      if (!allowed) return res.status(403).json({ error: "Not allowed" });
      if (!lead.pending_transfer_to_id) return res.status(400).json({ error: "No pending transfer" });

      await pq().query(
        `UPDATE leads SET pending_transfer_to_id = NULL, pending_transfer_at = NULL, pending_transfer_by_id = NULL,
                          updated_at = NOW()
         WHERE id = $1`,
        [leadId]
      );
      sendTelegram(`↩️ Передача лида #${leadId} отменена (${escapeHtml(me.full_name)})`).catch(() => {});
      res.json({ ok: true });
    } catch (err) {
      console.error("[lidy/transfer/reject]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Reassign a lead to another manager (teamlead only)
  app.post("/api/lidy/leads/:id/reassign", requireManager, async (req, res) => {
    try {
      const session = (req as any).manager as { mid: number; login: string };
      const me = await loadManager(session.mid);
      if (!me) return res.status(401).json({ error: "Not found" });
      if (me.role !== "teamlead") return res.status(403).json({ error: "Teamlead only" });

      const leadId = Number(req.params.id);
      const targetId = Number(req.body?.manager_id);
      if (!targetId) return res.status(400).json({ error: "manager_id required" });

      const target = await loadManager(targetId);
      if (!target || !target.active) return res.status(400).json({ error: "Invalid target manager" });

      const leadRow = await pq().query(
        `SELECT id, assigned_manager_id, received_at, name, phone FROM leads WHERE id = $1`,
        [leadId]
      );
      if (leadRow.rows.length === 0) return res.status(404).json({ error: "Lead not found" });
      const lead = leadRow.rows[0];
      const oldManagerId = lead.assigned_manager_id;

      // Recompute SLA based on new manager's working hours
      const newSla = computeSlaDeadline(
        new Date(),
        (target.working_hours as WorkingSchedule | null) ?? DEFAULT_SCHEDULE
      );

      await pq().query(
        `UPDATE leads SET assigned_manager_id = $1, sla_deadline_at = $2, sla_warned = FALSE, updated_at = NOW()
         WHERE id = $3`,
        [targetId, newSla, leadId]
      );
      await pq().query(
        `INSERT INTO lead_status_history (lead_id, from_status, to_status, manager_id, note)
         VALUES ($1, $2, $2, $3, $4)`,
        [leadId, "(reassign)", session.mid, `Reassigned by ${me.full_name} → ${target.full_name}`]
      );

      // Telegram notify
      const oldMgr = oldManagerId ? await loadManager(oldManagerId) : null;
      const tag = (m: any) => m?.telegram_tag ? (m.telegram_tag.startsWith("@") ? m.telegram_tag : `@${m.telegram_tag}`) : "";
      const lines = [
        `🔄 <b>Лид #${leadId}</b> переназначен`,
        lead.name ? `👤 ${escapeHtml(lead.name)}` : "",
        oldMgr ? `Был у: <b>${escapeHtml(oldMgr.full_name)}</b> ${tag(oldMgr)}` : `Был без менеджера`,
        `Теперь у: <b>${escapeHtml(target.full_name)}</b> ${tag(target)}`,
        `Тимлид: ${escapeHtml(me.full_name)}`,
        `→ <a href="${PUBLIC_BASE_URL}/lidy">открыть в CRM</a>`,
      ].filter(Boolean);
      sendTelegram(lines.join("\n")).catch(() => {});

      res.json({ ok: true, leadId, newManager: { id: target.id, full_name: target.full_name } });
    } catch (err) {
      console.error("[lidy/reassign]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/lidy/statuses", requireManager, async (_req, res) => {
    try {
      const { rows } = await pq().query(
        `SELECT code, label, color, is_terminal, requires_reason, requires_appointment,
                is_semi_closed, is_client_stage, sort
         FROM lead_statuses ORDER BY sort ASC, label ASC`
      );
      res.json({ statuses: rows });
    } catch (err) {
      console.error("[lidy/statuses]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ====================================================================
  // Admin — manage managers / lead statuses / view all leads
  // ====================================================================
  app.get("/api/admin/managers", requireAdmin, async (_req, res) => {
    try {
      const { rows } = await pq().query(
        `SELECT id, login, full_name, telegram_tag, active, role, is_online, last_assigned_at,
                working_hours, archived_at, created_at,
                (SELECT COUNT(*)::int FROM leads WHERE assigned_manager_id = managers.id) AS lead_count
         FROM managers
         ORDER BY (archived_at IS NOT NULL) ASC, id ASC`
      );
      res.json({ managers: rows });
    } catch (err) {
      console.error("[admin/managers GET]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/admin/managers", requireAdmin, async (req, res) => {
    try {
      const { login, password, full_name, telegram_tag, active, working_hours, role } = req.body || {};
      if (!login || !password || !full_name) {
        return res.status(400).json({ error: "Missing login/password/full_name" });
      }
      const safeRole = role === "teamlead" ? "teamlead" : "manager";
      const hash = await bcrypt.hash(String(password), 10);
      const wh = working_hours ?? DEFAULT_SCHEDULE;
      const { rows } = await pq().query(
        `INSERT INTO managers (login, password_hash, full_name, telegram_tag, active, working_hours, role)
         VALUES ($1, $2, $3, $4, COALESCE($5, TRUE), $6, $7)
         RETURNING id, login, full_name, telegram_tag, active, role, is_online, working_hours`,
        [String(login).trim().toLowerCase(), hash, full_name, telegram_tag || null, active, JSON.stringify(wh), safeRole]
      );
      res.json({ manager: rows[0] });
    } catch (err: any) {
      if (err?.code === "23505") return res.status(409).json({ error: "Login already exists" });
      console.error("[admin/managers POST]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.put("/api/admin/managers/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const { full_name, telegram_tag, active, password, working_hours, role, is_online } = req.body || {};
      const sets: string[] = [];
      const params: any[] = [];
      if (full_name !== undefined) { sets.push(`full_name = $${params.length + 1}`); params.push(full_name); }
      if (telegram_tag !== undefined) { sets.push(`telegram_tag = $${params.length + 1}`); params.push(telegram_tag || null); }
      if (active !== undefined) { sets.push(`active = $${params.length + 1}`); params.push(!!active); }
      if (password) { sets.push(`password_hash = $${params.length + 1}`); params.push(await bcrypt.hash(String(password), 10)); }
      if (working_hours !== undefined) { sets.push(`working_hours = $${params.length + 1}`); params.push(JSON.stringify(working_hours)); }
      if (role !== undefined) {
        const safeRole = role === "teamlead" ? "teamlead" : "manager";
        sets.push(`role = $${params.length + 1}`); params.push(safeRole);
      }
      if (is_online !== undefined) { sets.push(`is_online = $${params.length + 1}`); params.push(!!is_online); }
      if (sets.length === 0) return res.json({ ok: true });
      params.push(id);
      const { rows } = await pq().query(
        `UPDATE managers SET ${sets.join(", ")} WHERE id = $${params.length}
         RETURNING id, login, full_name, telegram_tag, active, role, is_online, working_hours`,
        params
      );
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      // If admin toggled an inactive manager to active+online or set is_online=true, redistribute pending
      if ((active === true || is_online === true) && rows[0].is_online && rows[0].active) {
        assignPendingLeads(`admin/${rows[0].full_name}`).catch(() => {});
      }
      res.json({ manager: rows[0] });
    } catch (err) {
      console.error("[admin/managers PUT]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/admin/managers/:id", requireAdmin, async (req, res) => {
    try {
      const id = Number(req.params.id);
      const force = req.query.force === "1";

      // Count leads that reference this manager
      const { rows: refRows } = await pq().query(
        `SELECT COUNT(*)::int AS n FROM leads WHERE assigned_manager_id = $1`,
        [id]
      );
      const hasLeads = (refRows[0]?.n || 0) > 0;

      if (hasLeads && !force) {
        // Soft-archive: keep the row, mark as fired
        await pq().query(
          `UPDATE managers SET archived_at = NOW(), active = FALSE, is_online = FALSE WHERE id = $1`,
          [id]
        );
        return res.json({ ok: true, mode: "archived", leadsKept: refRows[0].n });
      }

      // No leads referenced — safe to hard delete
      await pq().query(`DELETE FROM managers WHERE id = $1`, [id]);
      res.json({ ok: true, mode: "deleted" });
    } catch (err) {
      console.error("[admin/managers DELETE]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Restore an archived (fired) manager — admin can rehire
  app.post("/api/admin/managers/:id/restore", requireAdmin, async (req, res) => {
    try {
      const { rows } = await pq().query(
        `UPDATE managers SET archived_at = NULL, active = TRUE WHERE id = $1
         RETURNING id, login, full_name, archived_at, active`,
        [Number(req.params.id)]
      );
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      res.json({ ok: true, manager: rows[0] });
    } catch (err) {
      console.error("[admin/managers/restore]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/admin/lead-statuses", requireAdmin, async (_req, res) => {
    const { rows } = await pq().query(
      `SELECT code, label, color, is_terminal, requires_reason, requires_appointment,
              is_semi_closed, is_client_stage, sort FROM lead_statuses ORDER BY sort, label`
    );
    res.json({ statuses: rows });
  });

  app.post("/api/admin/lead-statuses", requireAdmin, async (req, res) => {
    try {
      const { code, label, color, is_terminal, requires_reason, requires_appointment, is_semi_closed, is_client_stage, sort } = req.body || {};
      if (!code || !label) return res.status(400).json({ error: "Missing code/label" });
      const { rows } = await pq().query(
        `INSERT INTO lead_statuses (code, label, color, is_terminal, requires_reason,
                                    requires_appointment, is_semi_closed, is_client_stage, sort)
         VALUES ($1,$2,$3,COALESCE($4,FALSE),COALESCE($5,FALSE),COALESCE($6,FALSE),COALESCE($7,FALSE),COALESCE($8,FALSE),COALESCE($9,0))
         ON CONFLICT (code) DO UPDATE SET
           label = EXCLUDED.label,
           color = EXCLUDED.color,
           is_terminal = EXCLUDED.is_terminal,
           requires_reason = EXCLUDED.requires_reason,
           requires_appointment = EXCLUDED.requires_appointment,
           is_semi_closed = EXCLUDED.is_semi_closed,
           is_client_stage = EXCLUDED.is_client_stage,
           sort = EXCLUDED.sort
         RETURNING *`,
        [code, label, color || null, is_terminal, requires_reason, requires_appointment, is_semi_closed, is_client_stage, sort]
      );
      res.json({ status: rows[0] });
    } catch (err) {
      console.error("[admin/statuses POST]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/admin/lead-statuses/:code", requireAdmin, async (req, res) => {
    if (req.params.code === "new") return res.status(400).json({ error: "Cannot delete the 'new' status" });
    await pq().query(`DELETE FROM lead_statuses WHERE code = $1`, [req.params.code]);
    res.json({ ok: true });
  });

  app.get("/api/admin/leads", requireAdmin, async (req, res) => {
    try {
      const limit = Math.min(500, Number(req.query.limit) || 100);
      const includeClosed = req.query.include_closed === "1";
      const whereSql = includeClosed ? "" : "WHERE l.processed_at IS NULL";
      const { rows } = await pq().query(
        `SELECT l.*, ls.label AS status_label, ls.color AS status_color,
                m.full_name AS manager_name, m.login AS manager_login
         FROM leads l
         LEFT JOIN lead_statuses ls ON ls.code = l.status_code
         LEFT JOIN managers m ON m.id = l.assigned_manager_id
         ${whereSql}
         ORDER BY l.received_at DESC
         LIMIT $1`,
        [limit]
      );
      res.json({ leads: rows });
    } catch (err) {
      console.error("[admin/leads]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Detailed dashboard for the admin
  app.get("/api/admin/dashboard", requireAdmin, async (req, res) => {
    try {
      const days = Math.min(180, Number(req.query.days) || 30);
      const since = `NOW() - INTERVAL '${days} days'`;

      const totalsQ = await pq().query(`
        SELECT
          COUNT(*)::int AS total,
          COUNT(*) FILTER (WHERE processed_at IS NULL)::int AS open,
          COUNT(*) FILTER (WHERE l.status_code IN (SELECT code FROM lead_statuses WHERE is_terminal))::int AS closed,
          COUNT(*) FILTER (WHERE l.status_code = 'closed_won')::int AS won,
          COUNT(*) FILTER (WHERE l.status_code = 'closed_lost')::int AS lost,
          COUNT(*) FILTER (WHERE processed_at IS NULL AND sla_deadline_at < NOW())::int AS sla_open_breached,
          AVG(EXTRACT(EPOCH FROM (processed_at - received_at))/60) FILTER (WHERE processed_at IS NOT NULL)::float AS avg_close_min
        FROM leads l
        WHERE received_at >= ${since}
      `);

      const dailyQ = await pq().query(`
        SELECT to_char(date_trunc('day', received_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
               COUNT(*)::int AS received,
               COUNT(*) FILTER (WHERE processed_at IS NOT NULL)::int AS closed
        FROM leads
        WHERE received_at >= ${since}
        GROUP BY 1 ORDER BY 1 ASC
      `);

      const byStatusQ = await pq().query(`
        SELECT ls.code, ls.label, ls.color, COUNT(l.*)::int AS n
        FROM lead_statuses ls
        LEFT JOIN leads l ON l.status_code = ls.code AND l.received_at >= ${since}
        GROUP BY ls.code, ls.label, ls.color, ls.sort
        ORDER BY ls.sort
      `);

      const bySourceQ = await pq().query(`
        SELECT COALESCE(NULLIF(source, ''), 'Не указан') AS source,
               COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE status_code = 'closed_won')::int AS won,
               COUNT(*) FILTER (WHERE processed_at IS NOT NULL)::int AS closed
        FROM leads
        WHERE received_at >= ${since}
        GROUP BY 1
        ORDER BY total DESC
      `);

      const byCountryQ = await pq().query(`
        SELECT COALESCE(NULLIF(country, ''), 'Не указано') AS country,
               COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE status_code = 'closed_won')::int AS won
        FROM leads
        WHERE received_at >= ${since}
        GROUP BY 1
        ORDER BY total DESC
        LIMIT 20
      `);

      const byUniversityQ = await pq().query(`
        SELECT COALESCE(NULLIF(desired_university, ''), 'Не указан') AS university,
               COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE status_code = 'closed_won')::int AS won
        FROM leads
        WHERE received_at >= ${since}
        GROUP BY 1
        ORDER BY total DESC
        LIMIT 20
      `);

      const byStudyLevelQ = await pq().query(`
        SELECT COALESCE(NULLIF(study_level, ''), 'Не указан') AS level,
               COUNT(*)::int AS total
        FROM leads
        WHERE received_at >= ${since}
        GROUP BY 1
        ORDER BY total DESC
      `);

      const byEventQ = await pq().query(`
        SELECT COALESCE(NULLIF(event_name_snapshot, ''), '— без события —') AS event,
               COUNT(*)::int AS total,
               COUNT(*) FILTER (WHERE status_code = 'closed_won')::int AS won
        FROM leads
        WHERE received_at >= ${since}
        GROUP BY 1
        ORDER BY total DESC
        LIMIT 10
      `);

      const byManagerQ = await pq().query(`
        SELECT m.id, m.full_name, m.login, m.active,
               COUNT(l.*)::int AS total,
               COUNT(*) FILTER (WHERE l.processed_at IS NULL)::int AS open,
               COUNT(*) FILTER (WHERE ls.is_terminal)::int AS closed,
               COUNT(*) FILTER (WHERE l.status_code = 'closed_won')::int AS won,
               COUNT(*) FILTER (WHERE l.processed_at IS NULL AND l.sla_deadline_at < NOW())::int AS sla_breached,
               COUNT(*) FILTER (WHERE l.processed_at IS NOT NULL AND l.processed_at <= l.sla_deadline_at)::int AS sla_met,
               AVG(EXTRACT(EPOCH FROM (l.processed_at - l.received_at))/60)
                 FILTER (WHERE l.processed_at IS NOT NULL)::float AS avg_close_min
        FROM managers m
        LEFT JOIN leads l ON l.assigned_manager_id = m.id AND l.received_at >= ${since}
        LEFT JOIN lead_statuses ls ON ls.code = l.status_code
        GROUP BY m.id, m.full_name, m.login, m.active
        ORDER BY total DESC
      `);

      const t = totalsQ.rows[0];
      const closed = t.closed || 0;
      const conversion = closed > 0 ? Math.round((t.won / closed) * 100) : 0;
      const slaCompliance = t.total > 0
        ? Math.round(((t.total - t.sla_open_breached) / t.total) * 100)
        : 100;

      res.json({
        windowDays: days,
        totals: {
          total: t.total,
          open: t.open,
          closed: t.closed,
          won: t.won,
          lost: t.lost,
          slaBreachedOpen: t.sla_open_breached,
          conversionPct: conversion,
          slaCompliancePct: slaCompliance,
          avgCloseMinutes: t.avg_close_min ? Math.round(t.avg_close_min) : null,
        },
        daily: dailyQ.rows,
        byStatus: byStatusQ.rows,
        byManager: byManagerQ.rows,
        bySource: bySourceQ.rows,
        byCountry: byCountryQ.rows,
        byUniversity: byUniversityQ.rows,
        byStudyLevel: byStudyLevelQ.rows,
        byEvent: byEventQ.rows,
      });
    } catch (err) {
      console.error("[admin/dashboard]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Excel export — comprehensive workbook with multiple sheets & breakdown summaries
  app.get("/api/admin/leads/export", requireAdmin, async (req, res) => {
    try {
      const from = req.query.from ? new Date(req.query.from as string) : null;
      const to = req.query.to ? new Date(req.query.to as string) : null;
      const where: string[] = [];
      const params: any[] = [];
      if (from && !isNaN(from.getTime())) { where.push(`l.received_at >= $${params.length + 1}`); params.push(from); }
      if (to && !isNaN(to.getTime())) { where.push(`l.received_at <= $${params.length + 1}`); params.push(to); }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";

      const { rows: leads } = await pq().query(
        `SELECT l.id, l.received_at, l.name, l.phone, l.email, l.country, l.comment, l.source,
                ls.label AS status_label, l.status_code, l.notes, l.rejection_reason,
                l.sla_deadline_at, l.processed_at, l.appointment_at,
                l.desired_university, l.study_level, l.intake_term, l.budget, l.english_level,
                l.birth_year, l.current_education, l.event_name_snapshot,
                m.full_name AS manager_name, m.login AS manager_login
         FROM leads l
         LEFT JOIN lead_statuses ls ON ls.code = l.status_code
         LEFT JOIN managers m ON m.id = l.assigned_manager_id
         ${whereSql}
         ORDER BY l.received_at DESC`,
        params
      );

      const wb = new ExcelJS.Workbook();
      wb.creator = "GoGlobal CRM";
      wb.created = new Date();

      // ─────────────────────────────────────────────────
      // Helper to add a data sheet
      // ─────────────────────────────────────────────────
      function addLeadSheet(sheetName: string, sheetLeads: any[]) {
        const ws = wb.addWorksheet(sheetName, {
          views: [{ state: "frozen", ySplit: 1 }],
        });
        ws.columns = [
          { header: "#", key: "id", width: 6 },
          { header: "Дата получения", key: "received_at", width: 18 },
          { header: "Имя", key: "name", width: 24 },
          { header: "Телефон", key: "phone", width: 16 },
          { header: "Email", key: "email", width: 24 },
          { header: "Страна", key: "country", width: 12 },
          { header: "Университет", key: "desired_university", width: 24 },
          { header: "Уровень", key: "study_level", width: 18 },
          { header: "Когда поступает", key: "intake_term", width: 14 },
          { header: "Бюджет", key: "budget", width: 16 },
          { header: "Английский", key: "english_level", width: 14 },
          { header: "Источник", key: "source", width: 16 },
          { header: "Статус", key: "status_label", width: 16 },
          { header: "Менеджер", key: "manager_name", width: 18 },
          { header: "Комментарий клиента", key: "comment", width: 30 },
          { header: "Заметка менеджера", key: "notes", width: 30 },
          { header: "Причина отказа", key: "rejection_reason", width: 24 },
          { header: "SLA дедлайн", key: "sla_deadline_at", width: 18 },
          { header: "Обработан", key: "processed_at", width: 18 },
          { header: "Запись на визит", key: "appointment_at", width: 18 },
          { header: "Событие", key: "event_name_snapshot", width: 22 },
        ];
        // Style header
        const header = ws.getRow(1);
        header.font = { bold: true, color: { argb: "FFFFFFFF" } };
        header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
        header.height = 22;
        header.alignment = { vertical: "middle", horizontal: "center" };
        ws.autoFilter = { from: "A1", to: { row: 1, column: ws.columns.length } };

        for (const r of sheetLeads) {
          const row = ws.addRow({
            ...r,
            received_at: r.received_at ? new Date(r.received_at) : null,
            sla_deadline_at: r.sla_deadline_at ? new Date(r.sla_deadline_at) : null,
            processed_at: r.processed_at ? new Date(r.processed_at) : null,
            appointment_at: r.appointment_at ? new Date(r.appointment_at) : null,
          });
          // Status colour pill — fill the status cell
          const statusCell = row.getCell("status_label");
          if (r.status_code === "closed_won") {
            statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFD1FAE5" } };
            statusCell.font = { color: { argb: "FF065F46" }, bold: true };
          } else if (r.status_code === "closed_lost") {
            statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFFECACA" } };
            statusCell.font = { color: { argb: "FF991B1B" } };
          } else if (r.processed_at) {
            statusCell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE0F2FE" } };
          }
        }
        // Date format
        const dateCols = ["received_at", "sla_deadline_at", "processed_at", "appointment_at"];
        for (const c of dateCols) {
          ws.getColumn(c).numFmt = "dd.mm.yyyy hh:mm";
        }
      }

      // ─────────────────────────────────────────────────
      // Summary sheet first — KPIs + breakdowns
      // ─────────────────────────────────────────────────
      const summary = wb.addWorksheet("Сводка", { views: [{ showGridLines: false }] });
      summary.mergeCells("A1:F1");
      summary.getCell("A1").value = `GoGlobal CRM — отчёт по лидам`;
      summary.getCell("A1").font = { bold: true, size: 18, color: { argb: "FF1E40AF" } };
      summary.getCell("A1").alignment = { horizontal: "center" };

      summary.mergeCells("A2:F2");
      summary.getCell("A2").value = `Сгенерировано ${new Date().toLocaleString("ru-RU", { timeZone: "Asia/Bishkek" })} · Период: ${from ? from.toLocaleDateString("ru-RU") : "все"} – ${to ? to.toLocaleDateString("ru-RU") : "все"}`;
      summary.getCell("A2").font = { italic: true, color: { argb: "FF64748B" } };
      summary.getCell("A2").alignment = { horizontal: "center" };

      const totalCount = leads.length;
      const wonCount = leads.filter((l: any) => l.status_code === "closed_won").length;
      const lostCount = leads.filter((l: any) => l.status_code === "closed_lost").length;
      const closedCount = leads.filter((l: any) => l.processed_at).length;
      const openCount = totalCount - closedCount;
      const conversionPct = closedCount > 0 ? Math.round((wonCount / closedCount) * 100) : 0;

      summary.addRow([]);
      const kpis = [
        ["Всего лидов", totalCount, "FFE0E7FF"],
        ["В работе (открытые)", openCount, "FFFEF3C7"],
        ["Закрыто", closedCount, "FFD1FAE5"],
        ["Выиграно (Won)", wonCount, "FFA7F3D0"],
        ["Проиграно (Lost)", lostCount, "FFFECACA"],
        ["Конверсия закрытых, %", conversionPct, "FFDDD6FE"],
      ];
      kpis.forEach(([label, value, color], i) => {
        const row = i + 4;
        summary.getCell(`B${row}`).value = label as string;
        summary.getCell(`C${row}`).value = value as number;
        summary.getCell(`B${row}`).font = { bold: true };
        summary.getCell(`B${row}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color as string } };
        summary.getCell(`C${row}`).fill = { type: "pattern", pattern: "solid", fgColor: { argb: color as string } };
        summary.getCell(`C${row}`).font = { bold: true, size: 14 };
        summary.getCell(`C${row}`).alignment = { horizontal: "right" };
      });
      summary.getColumn("B").width = 30;
      summary.getColumn("C").width = 15;

      // ─────────────────────────────────────────────────
      // Breakdown sheets (one per dimension with chart data)
      // ─────────────────────────────────────────────────
      function addBreakdownSheet(name: string, title: string, rows: { key: string; total: number; won?: number }[], colour = "FF3B82F6") {
        const ws = wb.addWorksheet(name);
        ws.getCell("A1").value = title;
        ws.getCell("A1").font = { bold: true, size: 14, color: { argb: colour } };
        ws.mergeCells("A1:D1");
        ws.addRow([]);
        const header = ws.addRow(["Категория", "Всего", "Won", "Конверсия %"]);
        header.font = { bold: true };
        header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E40AF" } };
        header.font = { bold: true, color: { argb: "FFFFFFFF" } };
        for (const r of rows) {
          const won = r.won ?? 0;
          const conv = r.total > 0 ? Math.round((won / r.total) * 100) : 0;
          ws.addRow([r.key, r.total, won, conv]);
        }
        ws.getColumn(1).width = 36;
        ws.getColumn(2).width = 12;
        ws.getColumn(3).width = 12;
        ws.getColumn(4).width = 14;
      }

      // By source
      const sourceMap = new Map<string, { total: number; won: number }>();
      for (const l of leads) {
        const k = l.source || "Не указан";
        const cur = sourceMap.get(k) || { total: 0, won: 0 };
        cur.total++;
        if (l.status_code === "closed_won") cur.won++;
        sourceMap.set(k, cur);
      }
      const sourceRows = Array.from(sourceMap.entries())
        .map(([key, v]) => ({ key, ...v }))
        .sort((a, b) => b.total - a.total);
      addBreakdownSheet("По источникам", "📡 Лиды по источникам", sourceRows, "FF10B981");

      // By country
      const countryMap = new Map<string, { total: number; won: number }>();
      for (const l of leads) {
        const k = l.country || "Не указана";
        const cur = countryMap.get(k) || { total: 0, won: 0 };
        cur.total++;
        if (l.status_code === "closed_won") cur.won++;
        countryMap.set(k, cur);
      }
      const countryRows = Array.from(countryMap.entries())
        .map(([key, v]) => ({ key, ...v }))
        .sort((a, b) => b.total - a.total);
      addBreakdownSheet("По странам", "🌍 Лиды по странам", countryRows, "FF8B5CF6");

      // By university
      const uniMap = new Map<string, { total: number; won: number }>();
      for (const l of leads) {
        if (!l.desired_university) continue;
        const cur = uniMap.get(l.desired_university) || { total: 0, won: 0 };
        cur.total++;
        if (l.status_code === "closed_won") cur.won++;
        uniMap.set(l.desired_university, cur);
      }
      const uniRows = Array.from(uniMap.entries())
        .map(([key, v]) => ({ key, ...v }))
        .sort((a, b) => b.total - a.total);
      addBreakdownSheet("По университетам", "🎓 Лиды по университетам", uniRows, "FFD946EF");

      // By manager
      const mgrMap = new Map<string, { total: number; won: number }>();
      for (const l of leads) {
        const k = l.manager_name || "Не назначен";
        const cur = mgrMap.get(k) || { total: 0, won: 0 };
        cur.total++;
        if (l.status_code === "closed_won") cur.won++;
        mgrMap.set(k, cur);
      }
      const mgrRows = Array.from(mgrMap.entries())
        .map(([key, v]) => ({ key, ...v }))
        .sort((a, b) => b.total - a.total);
      addBreakdownSheet("По менеджерам", "👨‍💼 Лиды по менеджерам", mgrRows, "FFEC4899");

      // By status
      const statusMap = new Map<string, { total: number; won: number }>();
      for (const l of leads) {
        const k = l.status_label || l.status_code || "—";
        const cur = statusMap.get(k) || { total: 0, won: 0 };
        cur.total++;
        statusMap.set(k, cur);
      }
      const statusRows = Array.from(statusMap.entries())
        .map(([key, v]) => ({ key, total: v.total }))
        .sort((a, b) => b.total - a.total);
      addBreakdownSheet("По статусам", "🎯 Лиды по статусам", statusRows, "FFF59E0B");

      // ─────────────────────────────────────────────────
      // Lead-level sheets — all, processed, unprocessed
      // ─────────────────────────────────────────────────
      addLeadSheet("Все лиды", leads);
      addLeadSheet("Необработанные", leads.filter((l: any) => !l.processed_at));
      addLeadSheet("Обработанные", leads.filter((l: any) => l.processed_at));
      addLeadSheet("Won (выигранные)", leads.filter((l: any) => l.status_code === "closed_won"));
      addLeadSheet("Lost (проигранные)", leads.filter((l: any) => l.status_code === "closed_lost"));

      // ─────────────────────────────────────────────────
      // Stream the file out
      // ─────────────────────────────────────────────────
      const buffer = await wb.xlsx.writeBuffer();
      res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
      res.setHeader(
        "Content-Disposition",
        `attachment; filename="goglobal-leads-${new Date().toISOString().slice(0, 10)}.xlsx"`
      );
      res.send(Buffer.from(buffer));
    } catch (err) {
      console.error("[admin/leads/export]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/admin/leads/stats", requireAdmin, async (_req, res) => {
    try {
      const totalQ = await pq().query(`SELECT COUNT(*)::int AS n FROM leads`);
      const openQ = await pq().query(`SELECT COUNT(*)::int AS n FROM leads WHERE processed_at IS NULL`);
      const slaBreachQ = await pq().query(
        `SELECT COUNT(*)::int AS n FROM leads
         WHERE processed_at IS NULL AND sla_deadline_at < NOW()`
      );
      const byManager = await pq().query(
        `SELECT m.id, m.full_name, m.login,
                COUNT(l.*)::int AS total,
                COUNT(*) FILTER (WHERE l.processed_at IS NULL)::int AS open,
                COUNT(*) FILTER (WHERE ls.is_terminal = TRUE)::int AS closed
         FROM managers m
         LEFT JOIN leads l ON l.assigned_manager_id = m.id
         LEFT JOIN lead_statuses ls ON ls.code = l.status_code
         GROUP BY m.id, m.full_name, m.login
         ORDER BY total DESC`
      );
      res.json({
        total: totalQ.rows[0].n,
        open: openQ.rows[0].n,
        slaBreached: slaBreachQ.rows[0].n,
        byManager: byManager.rows,
      });
    } catch (err) {
      console.error("[admin/leads/stats]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // ----- Frontend serving -----
  if (NODE_ENV !== "production") {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use((req, res, next) => {
      if (req.method !== "GET") return next();
      if (req.path.startsWith("/api/")) return next();
      if (req.path.startsWith("/uploads/")) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[server] Listening on http://0.0.0.0:${PORT}`);
    console.log(`[server] Uploads dir: ${UPLOADS_DIR}`);
  });
}

startServer().catch((err) => {
  console.error("[server] Fatal startup error:", err);
  process.exit(1);
});
