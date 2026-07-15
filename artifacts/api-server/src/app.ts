import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
// chatRateLimit lives in middleware/rateLimits to avoid circular imports with chat.ts

const app: Express = express();

// ─── Security headers ────────────────────────────────────────────────────────
app.use(
  helmet({
    contentSecurityPolicy: false, // CSP managed by the frontend (Vite)
    crossOriginResourcePolicy: { policy: "cross-origin" },
  }),
);

// ─── Allowed origins ─────────────────────────────────────────────────────────
// Accepts: localhost dev, the Replit preview domain, and any deployed domain
// set in ALLOWED_ORIGINS (comma-separated).
const ALLOWED_ORIGINS: string[] = [
  "http://localhost:5000",
  "http://localhost:18445",
  "http://127.0.0.1:5000",
  "http://127.0.0.1:18445",
  ...(process.env["ALLOWED_ORIGINS"] ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean),
];

function isOriginAllowed(origin: string | undefined): boolean {
  // No Origin header = server-to-server or same-origin proxy (Vite dev, curl health checks).
  // This is NOT a cross-origin browser request, so CORS doesn't apply — allow it.
  if (!origin) return true;
  if (ALLOWED_ORIGINS.includes(origin)) return true;
  // Allow any *.replit.dev / *.repl.co / *.replit.app subdomain (Replit preview proxies)
  if (/^https?:\/\/[^/]+\.(replit\.dev|repl\.co|replit\.app)(:\d+)?$/.test(origin)) return true;
  // Allow any *.vercel.app subdomain (production deploy)
  if (/^https:\/\/[^/]+\.vercel\.app$/.test(origin)) return true;
  return false;
}

app.use(
  cors({
    origin(origin, callback) {
      if (isOriginAllowed(origin)) {
        callback(null, true);
      } else {
        callback(new Error("CORS: origin not allowed"));
      }
    },
    credentials: true,
    methods: ["GET", "POST", "OPTIONS"],
    allowedHeaders: ["Content-Type", "X-App-Client"],
  }),
);

// ─── Request size limit ───────────────────────────────────────────────────────
app.use(express.json({ limit: "32kb" }));
app.use(express.urlencoded({ extended: true, limit: "32kb" }));

// ─── Global rate limit — 120 req / min per IP ────────────────────────────────
app.use(
  rateLimit({
    windowMs: 60 * 1000,
    max: 120,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: "Too many requests — please slow down." },
  }),
);

// ─── Logging ─────────────────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return { id: req.id, method: req.method, url: req.url?.split("?")[0] };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ─── Validate the X-App-Client header on all /api routes ─────────────────────
// This lightweight check stops random internet bots from hitting the AI endpoint.
// It is NOT a substitute for Firebase auth — it is a first layer of defence.
const EXPECTED_CLIENT_HEADER = "englifly-v1";
app.use("/api", (req: Request, res: Response, next: NextFunction) => {
  const header = req.headers["x-app-client"];
  if (header !== EXPECTED_CLIENT_HEADER) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  next();
});

app.use("/api", router);

// ─── Digital Asset Links (TWA) ────────────────────────────────────────────────
const ASSET_LINKS = [
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "app.vercel.zx_chat_ai.twa",
      sha256_cert_fingerprints: [
        "EF:AF:1D:B9:84:A6:3B:24:9E:ED:E5:63:7F:E7:5B:13:A4:94:DD:91:58:94:09:CA:6B:87:29:2C:7D:75:AB:7B",
      ],
    },
  },
  {
    relation: ["delegate_permission/common.handle_all_urls"],
    target: {
      namespace: "android_app",
      package_name: "com.zxchat.ai",
      sha256_cert_fingerprints: [
        "FE:03:EA:69:20:84:9C:37:5D:3A:AD:42:45:A8:AD:F6:19:06:35:66:4C:02:24:B2:1B:EB:A8:48:12:28:E0:F8",
      ],
    },
  },
];

app.get("/.well-known/assetlinks.json", (_req, res) => {
  res.setHeader("Content-Type", "application/json");
  res.setHeader("Cache-Control", "public, max-age=3600");
  res.json(ASSET_LINKS);
});

export default app;
