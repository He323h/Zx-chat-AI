import { rateLimit } from "express-rate-limit";

/** Stricter rate limit applied only to the AI chat endpoint — 30 req / min per IP */
export const chatRateLimit = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  message: { error: "Chat rate limit reached — try again in a minute." },
  // Use the default IP-based key generator (handles IPv4 + IPv6 correctly)
});
