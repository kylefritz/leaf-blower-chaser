import { join } from "path";
import { appendFileSync } from "fs";

const PORT = Number(process.env.PORT ?? 8000);
const ROOT = import.meta.dir;
const LOG_FILE = join(ROOT, "game-log.jsonl");

const watcher = Bun.spawn(["bun", "build", "src/main.ts", "--outfile", "dist/bundle.js", "--target", "browser", "--watch"], {
  cwd: ROOT,
  stdout: "inherit",
  stderr: "inherit",
});

const MIME: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
};

const server = Bun.serve({
  port: PORT,
  async fetch(req) {
    const url = new URL(req.url);

    if (req.method === "POST" && url.pathname === "/log") {
      const events = (await req.json()) as unknown[];
      const lines =
        (Array.isArray(events) ? events : [events])
          .map((e) => JSON.stringify(e))
          .join("\n") + "\n";
      appendFileSync(LOG_FILE, lines, "utf8");
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
  watcher.kill();
  process.exit(0);
});
process.on("SIGTERM", () => {
  watcher.kill();
  process.exit(0);
});
