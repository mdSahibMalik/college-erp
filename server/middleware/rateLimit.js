import rateLimit from "express-rate-limit";

export const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 15,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  ipv6Subnet: 56,

  message: {
    success: false,
    message: "Too many requests, please try again later.",
  },
});
