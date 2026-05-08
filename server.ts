import express from "express";
import fs from "fs/promises";
import path from "path";
import pg from "pg";

const { Pool } = pg;

const PORT = Number(process.env.PORT) || 3000;
const NODE_ENV = process.env.NODE_ENV || "development";
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";
const DATABASE_URL = process.env.DATABASE_URL;

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

// ----- Storage abstraction -----
interface Storage {
  get(): Promise<any>;
  set(data: any): Promise<void>;
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
}

const storage: Storage = DATABASE_URL
  ? new PostgresStorage(DATABASE_URL)
  : new FileStorage();

console.log(
  `[server] Storage: ${DATABASE_URL ? "PostgreSQL" : "JSON file (store.json)"}`
);

async function startServer() {
  const app = express();
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
    // SPA fallback for client-side routes (Express 5 compatible).
    app.use((req, res, next) => {
      if (req.method !== "GET") return next();
      if (req.path.startsWith("/api/")) return next();
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[server] Listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error("[server] Fatal startup error:", err);
  process.exit(1);
});
