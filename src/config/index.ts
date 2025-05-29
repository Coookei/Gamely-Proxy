import dotenv from "dotenv";

dotenv.config();

const requiredEnvVars = ["API_URL", "API_KEY", "WHITELISTED_ORIGINS"];

requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

export const config = {
  apiUrl: process.env.API_URL!,
  apiKey: process.env.API_KEY!,
  whitelist: process.env
    .WHITELISTED_ORIGINS!.split(",")
    .map((u) => u.replace(/\/$/, "").trim())
    .filter(Boolean),

  axiosTimeout: parseInt(process.env.API_TIMEOUT || "4000", 10),
  redisUrl: process.env.UPSTASH_REDIS_REST_URL || "",
  redisToken: process.env.UPSTASH_REDIS_REST_TOKEN || "",
  rateLimitPerIp: parseInt(process.env.RATE_LIMIT_PER_IP || "200", 10),
  maxExternalCalls: parseInt(process.env.MAX_EXTERNAL_CALLS || "1000", 10),
  redisEnabled: !!(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN),
  cacheDuration: parseInt(process.env.CACHE_DURATION || "86400", 10),
  port: parseInt(process.env.PORT || "3000", 10),
};
