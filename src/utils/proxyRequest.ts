import { Request, Response } from "express";
import { config } from "../config";
import { fetchFromApi } from "../services/api";
import {
  checkGlobalBudget,
  checkRateLimit,
  getFromCache,
  makeCacheKey,
  setToCache,
} from "../services/redisCache";

export async function proxyRequest(
  req: Request,
  res: Response,
  path: string,
  filteredQuery: Record<string, any> = {}
) {
  const cacheKey = makeCacheKey(path, filteredQuery);

  if (await checkRateLimit(req.ip || "", res)) return;
  if (await getFromCache(cacheKey, res)) return;
  if (await checkGlobalBudget(res)) return;

  try {
    const response = await fetchFromApi(path, filteredQuery);
    await setToCache(cacheKey, response.data);

    setCacheHeaders(res);

    return res.status(response.status || 200).json(response.data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    const body = err.response?.data || { error: "Upstream error" };
    return res.status(status).json(body);
  }
}

function setCacheHeaders(res: Response) {
  res.set({
    "Cache-Control": `public, max-age=${config.cacheDuration}`,
    "CDN-Cache-Control": `public, max-age=${config.cacheDuration}, s-maxage=${config.cacheDuration}, stale-while-revalidate`,
    "X-Cache": "MISS",
  });
}
