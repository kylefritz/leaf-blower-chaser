import { join } from "path";
import { appendFileSync } from "fs";

const PORT = Number(process.env.PORT ?? 8000);
const ROOT = import.meta.dir;
const LOG_FILE = join(ROOT, "game-log.jsonl");

const isDev = process.env.NODE_ENV !== "production";
const watcher = isDev
  ? Bun.spawn(["bun", "build", "src/main.ts", "--outfile", "dist/bundle.js", "--target", "browser", "--watch"], {
      cwd: ROOT,
      stdout: "inherit",
      stderr: "inherit",
    })
  : null;

// ─── Neon Postgres (production only) ────────────────────────────────────────
let sql: import("@neondatabase/serverless").NeonQueryFunction | null = null;

if (!isDev) {
  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error("[server] DATABASE_URL must be set in production");
    process.exit(1);
  }
  const { neon } = await import("@neondatabase/serverless");
  sql = neon(dbUrl);
  console.log("[server] Neon Postgres connected");
}

// ─── Event persistence ──────────────────────────────────────────────────────
interface GameEvent {
  session: string;
  type: string;
  t: number;
  frame: number;
  [key: string]: unknown;
}

async function persistEvents(events: GameEvent[]): Promise<void> {
  if (isDev || !sql) {
    const lines = events.map((e) => JSON.stringify(e)).join("\n") + "\n";
    appendFileSync(LOG_FILE, lines, "utf8");
    return;
  }

  try {
    for (const { session, type, t, frame, ...rest } of events) {
      await sql.query(
        "INSERT INTO game_events (session, type, t, frame, data) VALUES ($1, $2, $3, $4, $5::jsonb)",
        [session, type, t, frame, JSON.stringify(rest)],
      );
    }
  } catch (err) {
    console.error("[server] Neon insert failed:", err);
  }
}

// ─── HTTP server ────────────────────────────────────────────────────────────
const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
};

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname === "/log") {
      const raw = (await req.json()) as unknown[];
      const events = (Array.isArray(raw) ? raw : [raw]) as GameEvent[];
      await persistEvents(events);
      return new Response("ok");
    }

    if (req.method === "OPTIONS") {
      return new Response(null, {
        status: 204,
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST,GET,OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        },
      });
    }

    const fsPath =
      url.pathname === "/" ? "/index.html" : url.pathname.replace(/\.\./g, "");
    const file = Bun.file(join(ROOT, fsPath));
    if (!(await file.exists()))
      return new Response("Not Found", { status: 404 });
    const ext = fsPath.match(/\.[^.]+$/)?.[0] ?? "";
    return new Response(file, {
      headers: { "Content-Type": MIME[ext] ?? "application/octet-stream" },
    });
  },
});

console.log(`[server] http://localhost:${server.port}`);
process.on("SIGINT", () => {
  watcher?.kill();
  process.exit(0);
});
process.on("SIGTERM", () => {
  watcher?.kill();
  process.exit(0);
});
