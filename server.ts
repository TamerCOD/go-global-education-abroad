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
const PUBLIC_BASE_URL =
  process.env.PUBLIC_BASE_URL || "https://web-production-50318.up.railway.app";
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
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
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
  return {
    today: today.rows[0]?.visits ?? 0,
    uniqueToday: today.rows[0]?.unique ?? 0,
    last7Days: last7.rows[0]?.visits ?? 0,
    uniqueLast7: last7.rows[0]?.unique ?? 0,
    last30Days: last30.rows[0]?.visits ?? 0,
    daily: daily.rows,
    topPaths: topPaths.rows,
  };
}

// ---------- CRM helpers ----------
async function pickNextManager(): Promise<{ id: number; full_name: string; telegram_tag: string | null; login: string } | null> {
  if (!pool) return null;
  const { rows } = await pool.query(
    `SELECT id, full_name, telegram_tag, login
     FROM managers WHERE active = TRUE
     ORDER BY last_assigned_at NULLS FIRST, id ASC
     LIMIT 1`
  );
  if (rows.length === 0) return null;
  await pool.query(`UPDATE managers SET last_assigned_at = NOW() WHERE id = $1`, [rows[0].id]);
  return rows[0];
}

function computeSlaDeadline(receivedAt: Date): Date {
  // Phase 3a: simple +N hours. Working-hours-aware logic to be added in Phase 3b.
  const d = new Date(receivedAt);
  d.setHours(d.getHours() + LEAD_SLA_HOURS);
  return d;
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

    if (!name && !phone && !email) {
      throw new Error("Missing name/phone/email");
    }

    const manager = await pickNextManager();
    const slaDeadline = computeSlaDeadline(new Date());

    const insert = await pq().query(
      `INSERT INTO leads (name, phone, email, country, comment, source, raw,
                          assigned_manager_id, status_code, sla_deadline_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'new',$9)
       RETURNING id, received_at`,
      [name, phone, email, country, comment, source, JSON.stringify(b), manager?.id ?? null, slaDeadline]
    );
    const leadId = insert.rows[0].id;

    const tag = manager?.telegram_tag
      ? (manager.telegram_tag.startsWith("@") ? manager.telegram_tag : `@${manager.telegram_tag}`)
      : "";
    const lines = [
      `🆕 <b>Новый лид #${leadId}</b>`,
      name ? `👤 ${escapeHtml(name)}` : "",
      phone ? `📞 ${escapeHtml(phone)}` : "",
      email ? `✉️ ${escapeHtml(email)}` : "",
      country ? `🌍 ${escapeHtml(country)}` : "",
      comment ? `💬 ${escapeHtml(comment)}` : "",
      manager
        ? `👨‍💼 Назначен: <b>${escapeHtml(manager.full_name)}</b> (${escapeHtml(manager.login)}) ${tag}`.trim()
        : `⚠️ Нет активных менеджеров — лид не распределён`,
      `⏱ SLA до ${slaDeadline.toISOString().slice(0, 16).replace("T", " ")} UTC`,
      `🔗 ${PUBLIC_BASE_URL}/lidy`,
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

      const result = await ingestLead(req.body || {}, "website");
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
        `SELECT id, login, password_hash, full_name, active FROM managers WHERE login = $1`,
        [String(login).trim().toLowerCase()]
      );
      if (rows.length === 0) return res.status(401).json({ error: "Invalid credentials" });
      const m = rows[0];
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

  app.get("/api/lidy/me", requireManager, async (req, res) => {
    try {
      const session = (req as any).manager as { mid: number; login: string };
      const m = await pq().query(
        `SELECT id, login, full_name, telegram_tag, active FROM managers WHERE id = $1`,
        [session.mid]
      );
      if (m.rows.length === 0) return res.status(401).json({ error: "Not found" });
      res.json({ manager: m.rows[0] });
    } catch (err) {
      console.error("[lidy/me]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/lidy/leads", requireManager, async (req, res) => {
    try {
      const session = (req as any).manager as { mid: number; login: string };
      const onlyMine = req.query.scope !== "all";
      const filterStatus = (req.query.status as string | undefined) || null;

      const where: string[] = [];
      const params: any[] = [];
      if (onlyMine) {
        where.push(`assigned_manager_id = $${params.length + 1}`);
        params.push(session.mid);
      }
      if (filterStatus) {
        where.push(`status_code = $${params.length + 1}`);
        params.push(filterStatus);
      }
      const whereSql = where.length ? `WHERE ${where.join(" AND ")}` : "";
      const { rows } = await pq().query(
        `SELECT l.*, ls.label AS status_label, ls.color AS status_color, ls.is_terminal AS status_is_terminal,
                m.full_name AS manager_name, m.login AS manager_login
         FROM leads l
         LEFT JOIN lead_statuses ls ON ls.code = l.status_code
         LEFT JOIN managers m ON m.id = l.assigned_manager_id
         ${whereSql}
         ORDER BY l.received_at DESC
         LIMIT 200`,
        params
      );
      res.json({ leads: rows });
    } catch (err) {
      console.error("[lidy/leads]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/lidy/leads/:id/status", requireManager, async (req, res) => {
    try {
      const session = (req as any).manager as { mid: number; login: string };
      const leadId = Number(req.params.id);
      const { status, note } = req.body || {};
      if (!status) return res.status(400).json({ error: "Missing status" });

      // Validate status exists
      const statusRow = await pq().query(`SELECT code, is_terminal FROM lead_statuses WHERE code = $1`, [status]);
      if (statusRow.rows.length === 0) return res.status(400).json({ error: "Unknown status" });

      // Read current lead, ensure manager owns it (or status is unassigned)
      const leadRow = await pq().query(`SELECT id, status_code, assigned_manager_id FROM leads WHERE id = $1`, [leadId]);
      if (leadRow.rows.length === 0) return res.status(404).json({ error: "Lead not found" });
      const lead = leadRow.rows[0];
      if (lead.assigned_manager_id && lead.assigned_manager_id !== session.mid) {
        return res.status(403).json({ error: "Lead is assigned to another manager" });
      }

      const newProcessedAt = statusRow.rows[0].is_terminal ? "NOW()" : "processed_at";
      const updated = await pq().query(
        `UPDATE leads
         SET status_code = $1,
             notes = COALESCE($2, notes),
             updated_at = NOW(),
             processed_at = ${newProcessedAt},
             assigned_manager_id = COALESCE(assigned_manager_id, $3)
         WHERE id = $4
         RETURNING id, status_code, processed_at`,
        [status, note ?? null, session.mid, leadId]
      );

      await pq().query(
        `INSERT INTO lead_status_history (lead_id, from_status, to_status, manager_id, note)
         VALUES ($1, $2, $3, $4, $5)`,
        [leadId, lead.status_code, status, session.mid, note ?? null]
      );

      res.json({ ok: true, lead: updated.rows[0] });
    } catch (err) {
      console.error("[lidy/status]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/lidy/statuses", requireManager, async (_req, res) => {
    try {
      const { rows } = await pq().query(`SELECT code, label, color, is_terminal, sort FROM lead_statuses ORDER BY sort ASC, label ASC`);
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
        `SELECT id, login, full_name, telegram_tag, active, last_assigned_at, created_at
         FROM managers ORDER BY id ASC`
      );
      res.json({ managers: rows });
    } catch (err) {
      console.error("[admin/managers GET]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/admin/managers", requireAdmin, async (req, res) => {
    try {
      const { login, password, full_name, telegram_tag, active } = req.body || {};
      if (!login || !password || !full_name) {
        return res.status(400).json({ error: "Missing login/password/full_name" });
      }
      const hash = await bcrypt.hash(String(password), 10);
      const { rows } = await pq().query(
        `INSERT INTO managers (login, password_hash, full_name, telegram_tag, active)
         VALUES ($1, $2, $3, $4, COALESCE($5, TRUE))
         RETURNING id, login, full_name, telegram_tag, active`,
        [String(login).trim().toLowerCase(), hash, full_name, telegram_tag || null, active]
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
      const { full_name, telegram_tag, active, password } = req.body || {};
      const sets: string[] = [];
      const params: any[] = [];
      if (full_name !== undefined) {
        sets.push(`full_name = $${params.length + 1}`);
        params.push(full_name);
      }
      if (telegram_tag !== undefined) {
        sets.push(`telegram_tag = $${params.length + 1}`);
        params.push(telegram_tag || null);
      }
      if (active !== undefined) {
        sets.push(`active = $${params.length + 1}`);
        params.push(!!active);
      }
      if (password) {
        sets.push(`password_hash = $${params.length + 1}`);
        params.push(await bcrypt.hash(String(password), 10));
      }
      if (sets.length === 0) return res.json({ ok: true });
      params.push(id);
      const { rows } = await pq().query(
        `UPDATE managers SET ${sets.join(", ")} WHERE id = $${params.length}
         RETURNING id, login, full_name, telegram_tag, active`,
        params
      );
      if (rows.length === 0) return res.status(404).json({ error: "Not found" });
      res.json({ manager: rows[0] });
    } catch (err) {
      console.error("[admin/managers PUT]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.delete("/api/admin/managers/:id", requireAdmin, async (req, res) => {
    try {
      await pq().query(`DELETE FROM managers WHERE id = $1`, [Number(req.params.id)]);
      res.json({ ok: true });
    } catch (err) {
      console.error("[admin/managers DELETE]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/admin/lead-statuses", requireAdmin, async (_req, res) => {
    const { rows } = await pq().query(`SELECT code, label, color, is_terminal, sort FROM lead_statuses ORDER BY sort, label`);
    res.json({ statuses: rows });
  });

  app.post("/api/admin/lead-statuses", requireAdmin, async (req, res) => {
    try {
      const { code, label, color, is_terminal, sort } = req.body || {};
      if (!code || !label) return res.status(400).json({ error: "Missing code/label" });
      const { rows } = await pq().query(
        `INSERT INTO lead_statuses (code, label, color, is_terminal, sort)
         VALUES ($1,$2,$3,COALESCE($4,FALSE),COALESCE($5,0))
         ON CONFLICT (code) DO UPDATE SET
           label = EXCLUDED.label,
           color = EXCLUDED.color,
           is_terminal = EXCLUDED.is_terminal,
           sort = EXCLUDED.sort
         RETURNING *`,
        [code, label, color || null, is_terminal, sort]
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
      const { rows } = await pq().query(
        `SELECT l.*, ls.label AS status_label, ls.color AS status_color,
                m.full_name AS manager_name, m.login AS manager_login
         FROM leads l
         LEFT JOIN lead_statuses ls ON ls.code = l.status_code
         LEFT JOIN managers m ON m.id = l.assigned_manager_id
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
