import type { IncomingMessage, ServerResponse } from "node:http";
import { promises as fs } from "node:fs";
import path from "node:path";
import zlib from "node:zlib";

export class HttpError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly details?: string[],
    readonly headers?: Record<string, string>,
  ) {
    super(message);
  }
}

const MIME: Record<string, string> = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".webp": "image/webp",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".txt": "text/plain; charset=utf-8",
};

const COMPRESSIBLE = /^(text\/|application\/json|image\/svg)/;

export function applySecurityHeaders(req: IncomingMessage, res: ServerResponse): void {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  // La géolocalisation reste autorisée pour notre propre site (bouton « Partager ma position »), jamais pour des tiers.
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=(self)");
  res.setHeader(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data:",
      "connect-src 'self'",
      "frame-ancestors 'none'",
      "base-uri 'self'",
      "form-action 'self'",
    ].join("; "),
  );
  if (req.headers["x-forwarded-proto"] === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000");
  }
}

export function send(
  req: IncomingMessage,
  res: ServerResponse,
  status: number,
  body: Buffer | string,
  type: string,
  headers: Record<string, string> = {},
): void {
  let buf = typeof body === "string" ? Buffer.from(body, "utf8") : body;
  res.statusCode = status;
  res.setHeader("Content-Type", type);
  for (const [k, v] of Object.entries(headers)) res.setHeader(k, v);
  res.setHeader("Vary", "Accept-Encoding");
  if (COMPRESSIBLE.test(type) && buf.length > 1024 && /\bgzip\b/.test(String(req.headers["accept-encoding"] ?? ""))) {
    buf = zlib.gzipSync(buf);
    res.setHeader("Content-Encoding", "gzip");
  }
  res.setHeader("Content-Length", buf.length);
  res.end(req.method === "HEAD" ? undefined : buf);
}

export function sendJson(req: IncomingMessage, res: ServerResponse, status: number, data: unknown, headers: Record<string, string> = {}): void {
  send(req, res, status, JSON.stringify(data), MIME[".json"] as string, { "Cache-Control": "no-store", ...headers });
}

export async function readJsonBody(req: IncomingMessage, limit = 100_000): Promise<unknown> {
  const type = String(req.headers["content-type"] ?? "");
  if (!type.toLowerCase().startsWith("application/json")) {
    throw new HttpError(415, "Le contenu doit être au format JSON.");
  }
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buf = chunk as Buffer;
    size += buf.length;
    if (size > limit) throw new HttpError(413, "Requête trop volumineuse.");
    chunks.push(buf);
  }
  try {
    return JSON.parse(Buffer.concat(chunks).toString("utf8"));
  } catch {
    throw new HttpError(400, "JSON invalide.");
  }
}

export function clientIp(req: IncomingMessage): string {
  const fwd = req.headers["x-forwarded-for"];
  const first = (Array.isArray(fwd) ? fwd[0] : fwd)?.split(",")[0]?.trim();
  return first || req.socket.remoteAddress || "unknown";
}

/** Limiteur de débit en mémoire (par clé, fenêtre fixe). */
export class RateLimiter {
  private readonly hits = new Map<string, { count: number; reset: number }>();

  constructor() {
    setInterval(() => {
      const now = Date.now();
      for (const [k, v] of this.hits) if (v.reset < now) this.hits.delete(k);
    }, 60_000).unref();
  }

  /** Retourne true si la requête est autorisée. */
  allow(key: string, limit: number, windowMs: number): boolean {
    const now = Date.now();
    const cur = this.hits.get(key);
    if (!cur || cur.reset < now) {
      this.hits.set(key, { count: 1, reset: now + windowMs });
      return true;
    }
    cur.count += 1;
    return cur.count <= limit;
  }
}

/** Sert un fichier de public/. Retourne false s'il n'existe pas. */
export async function serveStatic(req: IncomingMessage, res: ServerResponse, publicDir: string, pathname: string): Promise<boolean> {
  let decoded: string;
  try {
    decoded = decodeURIComponent(pathname);
  } catch {
    return false;
  }
  if (decoded.includes("\0") || decoded.split("/").some((seg) => seg.startsWith("."))) return false;
  const file = path.normalize(path.join(publicDir, decoded));
  if (!file.startsWith(publicDir + path.sep)) return false;
  const ext = path.extname(file).toLowerCase();
  const type = MIME[ext];
  if (!type) return false;
  try {
    const stat = await fs.stat(file);
    if (!stat.isFile()) return false;
    const body = await fs.readFile(file);
    const long = /^\.(webp|png|jpg|ico|svg)$/.test(ext);
    send(req, res, 200, body, type, {
      "Cache-Control": long ? "public, max-age=86400" : "public, max-age=300",
      "Last-Modified": stat.mtime.toUTCString(),
    });
    return true;
  } catch {
    return false;
  }
}
