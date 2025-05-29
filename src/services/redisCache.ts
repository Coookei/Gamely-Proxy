import { Response } from "express";
import { redis, useRedis, clientLimiter } from "./redis";
import { config } from "../config";

export function makeCacheKey(path: string, query: Record<string, any>) {
  return Object.keys(query).length ? `cache:${path}:${JSON.stringify(query)}` : `cache:${path}`;
}

export async function checkRateLimit(ip: string, res: Response) {
  if (useRedis && ip) {
    const { success } = await clientLimiter!.limit(ip);
    if (!success) {
      res.status(429).json({ error: "Too many requests" });
      return true;
    }
  }
  return false;
}

export async function getFromCache(cacheKey: string, res: Response) {
  if (useRedis) {
    const cached = await redis!.get<string>(cacheKey);
    if (cached !== null) {
      res.setHeader("X-Cache", "HIT");
      try {
        res.json(cached);
        return true;
      } catch {
        // ignore corrupted cache
      }
    }
  }
  return false;
}

export async function setToCache(cacheKey: string, data: any) {
  if (useRedis) {
    await redis!.set(cacheKey, JSON.stringify(data), {
      ex: config.cacheDuration,
    });
  }
}

export async function checkGlobalBudget(res: Response) {
  if (useRedis) {
    const budgetKey = "external-call-count";
    const calls = await redis!.incr(budgetKey);
    if (calls === 1) {
      await redis!.expire(budgetKey, 24 * 60 * 60);
    }
    if (calls > config.maxExternalCalls) {
      res.status(503).json({ error: "Global call budget reached" });
      return true;
    }
  }
  return false;
}
