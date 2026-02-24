export interface GameEvent {
  session: string; type: string; t: number; frame: number;
  [key: string]: unknown;
}

const SESSION_ID = crypto.randomUUID();
let queue: GameEvent[] = [];

export function logEvent(type: string, frame: number, extra: Record<string, unknown> = {}): void {
  queue.push({ session: SESSION_ID, type, t: Date.now(), frame, ...extra });
}

async function flushFetch() {
  const batch = queue; queue = [];
  if (!batch.length) return;
  try { await fetch("/log", { method: "POST",
    headers: { "Content-Type": "application/json" }, body: JSON.stringify(batch) }); }
  catch {}
}

function flushBeacon() {
  const batch = queue; queue = [];
  if (!batch.length) return;
  navigator.sendBeacon("/log", new Blob([JSON.stringify(batch)], { type: "application/json" }));
}

setInterval(flushFetch, 2000);
window.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") flushBeacon(); });
window.addEventListener("pagehide", flushBeacon);
