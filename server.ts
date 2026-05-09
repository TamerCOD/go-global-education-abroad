import express from "express";
import fs from "fs/promises";
import { existsSync, mkdirSync } from "fs";
import path from "path";
import crypto from "crypto";
import multer from "multer";
import pg from "pg";

const { Pool } = pg;

const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const DATABASE_URL = process.env.DATABASE_URL;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || "";
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID || "";
const VISITOR_SECRET = process.env.VISITOR_SECRET || ADMIN_PASSWORD;
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
      hero: true,
      about: true,
      destinations: true,
      calculator: true,
      testimonials: true,
      faq: true,
      contact: true,
    },
    regions: [
      { id: "Asia", name: "Азия" },
      { id: "Europe", name: "Европа" },
      { id: "USA", name: "США" },
    ],
  },
};

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

// ----- Telegram helper -----
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

// ----- Storage abstraction -----
interface Storage {
  get(): Promise<any>;
  set(data: any): Promise<void>;
  recordVisit(args: {
    visitorId: string;
    path: string;
    ua?: string;
    ref?: string;
  }): Promise<void>;
  analytics(): Promise<{
    today: number;
    last7Days: number;
    last30Days: number;
    uniqueToday: number;
    uniqueLast7: number;
    daily: { date: string; visits: number; unique: number }[];
    topPaths: { path: string; visits: number }[];
  }>;
}

class FileStorage implements Storage {
  async get() {
    try {
      const raw = await fs.readFile(storePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (!parsed.siteConfig) parsed.siteConfig = fallbackDefaults.siteConfig;
      return parsed;
    } catch {
      return fallbackDefaults;
    }
  }

  async set(data: any) {
    await fs.writeFile(storePath, JSON.stringify(data, null, 2));
  }

  async recordVisit() {
    /* no-op for file storage */
  }

  async analytics() {
    return {
      today: 0,
      last7Days: 0,
      last30Days: 0,
      uniqueToday: 0,
      uniqueLast7: 0,
      daily: [],
      topPaths: [],
    };
  }
}

class PostgresStorage implements Storage {
  private pool: pg.Pool;
  private ready: Promise<void>;

  constructor(connectionString: string) {
    const needsSsl = /\b(railway|render|amazonaws|supabase|neon)\b/i.test(connectionString);
    this.pool = new Pool({
      connectionString,
      ssl: needsSsl ? { rejectUnauthorized: false } : undefined,
    });
    this.ready = this.init();
  }

  private async init() {
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS site_data (
        id INTEGER PRIMARY KEY,
        data JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);
    await this.pool.query(`
      CREATE TABLE IF NOT EXISTS site_visits (
        id BIGSERIAL PRIMARY KEY,
        visited_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        path TEXT NOT NULL,
        visitor_id TEXT NOT NULL,
        ua TEXT,
        ref TEXT
      );
    `);
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_visits_visited_at ON site_visits (visited_at DESC);`
    );
    await this.pool.query(
      `CREATE INDEX IF NOT EXISTS idx_visits_visitor_id ON site_visits (visitor_id);`
    );

    const { rows } = await this.pool.query(
      "SELECT 1 FROM site_data WHERE id = 1 LIMIT 1"
    );
    if (rows.length === 0) {
      const seed = await loadSeedData();
      await this.pool.query(
        "INSERT INTO site_data (id, data) VALUES (1, $1)",
        [JSON.stringify(seed)]
      );
      console.log("[db] Seeded site_data with initial content");
    }
  }

  async get() {
    await this.ready;
    const { rows } = await this.pool.query(
      "SELECT data FROM site_data WHERE id = 1"
    );
    if (rows.length === 0) return fallbackDefaults;
    const data = rows[0].data;
    if (!data.siteConfig) data.siteConfig = fallbackDefaults.siteConfig;
    return data;
  }

  async set(data: any) {
    await this.ready;
    await this.pool.query(
      `INSERT INTO site_data (id, data, updated_at)
       VALUES (1, $1, NOW())
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data, updated_at = NOW()`,
      [JSON.stringify(data)]
    );
  }

  async recordVisit({
    visitorId,
    path,
    ua,
    ref,
  }: {
    visitorId: string;
    path: string;
    ua?: string;
    ref?: string;
  }) {
    await this.ready;
    await this.pool.query(
      `INSERT INTO site_visits (visitor_id, path, ua, ref) VALUES ($1, $2, $3, $4)`,
      [visitorId, path, ua || null, ref || null]
    );
  }

  async analytics() {
    await this.ready;
    const todayQ = this.pool.query(
      `SELECT COUNT(*)::int AS visits, COUNT(DISTINCT visitor_id)::int AS unique
       FROM site_visits WHERE visited_at >= NOW() - INTERVAL '24 hours'`
    );
    const last7Q = this.pool.query(
      `SELECT COUNT(*)::int AS visits, COUNT(DISTINCT visitor_id)::int AS unique
       FROM site_visits WHERE visited_at >= NOW() - INTERVAL '7 days'`
    );
    const last30Q = this.pool.query(
      `SELECT COUNT(*)::int AS visits FROM site_visits WHERE visited_at >= NOW() - INTERVAL '30 days'`
    );
    const dailyQ = this.pool.query(
      `SELECT to_char(date_trunc('day', visited_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
              COUNT(*)::int AS visits,
              COUNT(DISTINCT visitor_id)::int AS unique
       FROM site_visits
       WHERE visited_at >= NOW() - INTERVAL '30 days'
       GROUP BY 1
       ORDER BY 1 ASC`
    );
    const topPathsQ = this.pool.query(
      `SELECT path, COUNT(*)::int AS visits
       FROM site_visits
       WHERE visited_at >= NOW() - INTERVAL '30 days'
       GROUP BY path
       ORDER BY visits DESC
       LIMIT 10`
    );
    const [today, last7, last30, daily, topPaths] = await Promise.all([
      todayQ,
      last7Q,
      last30Q,
      dailyQ,
      topPathsQ,
    ]);
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
}

const storage: Storage = DATABASE_URL
  ? new PostgresStorage(DATABASE_URL)
  : new FileStorage();

console.log(
  `[server] Storage: ${DATABASE_URL ? "PostgreSQL" : "JSON file (store.json)"}`
);
console.log(
  `[server] Telegram: ${TELEGRAM_BOT_TOKEN && TELEGRAM_CHAT_ID ? "configured" : "DISABLED (missing token/chat)"}`
);

if (!existsSync(UPLOADS_DIR)) {
  mkdirSync(UPLOADS_DIR, { recursive: true });
  console.log(`[server] Created uploads directory: ${UPLOADS_DIR}`);
}

const ALLOWED_MIME = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/svg+xml",
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

function requireAdmin(
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) {
  const password =
    (req.headers["x-admin-password"] as string | undefined) ||
    (typeof req.body === "object" && req.body && req.body.password);
  if (password !== ADMIN_PASSWORD) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
}

function hashVisitor(ip: string, ua: string): string {
  return crypto
    .createHash("sha256")
    .update(`${ip}|${ua}|${VISITOR_SECRET}`)
    .digest("hex")
    .slice(0, 32);
}

async function startServer() {
  const app = express();
  app.set("trust proxy", true);
  app.use(express.json({ limit: "5mb" }));

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, env: NODE_ENV });
  });

  app.get("/api/data", async (_req, res) => {
    try {
      const data = await storage.get();
      res.json(data);
    } catch (err) {
      console.error("[api/data GET]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/data", async (req, res) => {
    try {
      const { password, data } = req.body || {};
      if (password !== ADMIN_PASSWORD) {
        return res.status(401).json({ error: "Unauthorized" });
      }
      if (!data || typeof data !== "object") {
        return res.status(400).json({ error: "Invalid payload" });
      }
      const current = await storage.get();
      const next = { ...current, ...data };
      await storage.set(next);
      res.json({ success: true });
    } catch (err) {
      console.error("[api/data POST]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body || {};
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
      res.json({ success: true });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Visit tracking — fire-and-forget from client
  app.post("/api/visit", async (req, res) => {
    try {
      const ip =
        (req.headers["x-forwarded-for"] as string | undefined)?.split(",")[0].trim() ||
        req.socket.remoteAddress ||
        "0.0.0.0";
      const ua = (req.headers["user-agent"] as string) || "";
      const ref = (req.headers["referer"] as string) || (req.body?.ref as string) || "";
      const pathStr = typeof req.body?.path === "string" ? req.body.path.slice(0, 500) : "/";
      const visitorId = hashVisitor(ip, ua);
      // Do NOT count admin visits in analytics
      if (pathStr.startsWith("/admin") || pathStr.startsWith("/lidy")) {
        return res.json({ ok: true, ignored: true });
      }
      await storage.recordVisit({ visitorId, path: pathStr, ua, ref });
      res.json({ ok: true });
    } catch (err) {
      console.error("[api/visit]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.get("/api/analytics", requireAdmin, async (_req, res) => {
    try {
      const data = await storage.analytics();
      res.json(data);
    } catch (err) {
      console.error("[api/analytics]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  // Telegram test endpoint (admin-only)
  app.post("/api/telegram/test", requireAdmin, async (_req, res) => {
    const ok = await sendTelegram(
      `🧪 <b>Test message</b>\nGoGlobal admin → Telegram check at ${new Date().toISOString()}`
    );
    res.json({ ok });
  });

  app.post(
    "/api/upload",
    requireAdmin,
    (req, res, next) => {
      upload.single("file")(req, res, (err: any) => {
        if (err) {
          const msg = err instanceof Error ? err.message : "Upload failed";
          const status = msg.startsWith("Only image") ? 400 : 500;
          return res.status(status).json({ error: msg });
        }
        next();
      });
    },
    (req, res) => {
      if (!req.file) return res.status(400).json({ error: "No file uploaded" });
      const url = `/uploads/${req.file.filename}`;
      res.json({ url, filename: req.file.filename, size: req.file.size });
    }
  );

  app.delete("/api/upload/:filename", requireAdmin, async (req, res) => {
    const filename = path.basename(req.params.filename);
    const target = path.join(UPLOADS_DIR, filename);
    try {
      await fs.unlink(target);
      res.json({ success: true });
    } catch (err: any) {
      if (err && err.code === "ENOENT") {
        return res.status(404).json({ error: "Not found" });
      }
      console.error("[api/upload DELETE]", err);
      res.status(500).json({ error: "Server error" });
    }
  });

  app.use(
    "/uploads",
    express.static(UPLOADS_DIR, {
      maxAge: "30d",
      immutable: true,
      index: false,
    })
  );

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
