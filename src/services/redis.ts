import { Redis } from "@upstash/redis";
import { Ratelimit } from "@upstash/ratelimit";
import { config } from "../config";

const useRedis = config.redisEnabled;

let redis: Redis | null = null;
let clientLimiter: Ratelimit | null = null;

if (useRedis) {
  redis = new Redis({
    url: config.redisUrl,
    token: config.redisToken,
  });
  clientLimiter = new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(config.rateLimitPerIp, "1h"),
  });
} else {
  console.warn("Redis URL or token not configured. Rate limiting and caching will be disabled.");
}

export { useRedis, redis, clientLimiter };
