import express from "express";
import { axiosInstance } from "../services/axios";
import { redis, useRedis, clientLimiter } from "../services/redis";
import { config } from "../config";

const router = express.Router();

interface ProxyParams {
  endpoint: "games" | "genres" | "platforms";
  param1?: string;
  param2?: string;
}

// Accepts only the following paths:
// - /api/games
// - /api/games/:gameId
// - /api/games/:gameId/screenshots
// - /api/games/:gameId/movies
// - /api/genres
// - /api/platforms/lists/parents
router.get("/:endpoint{/:param1}{/:param2}", async (req, res): Promise<any> => {
  const { endpoint, param1, param2 } = req.params as ProxyParams;

  let path = "";
  const filteredQuery: Record<string, any> = {};

  const handleGamesEndpoint = () => {
    if (param1) {
      if (param2) {
        if (param2 !== "screenshots" && param2 !== "movies") {
          return res.status(400).json({
            error:
              "Games endpoint with a gameId requires 'screenshots' or 'movies' as second parameter",
          });
        } else {
          // If valid, set path to the specific media endpoint
          if (!/^[1-9]\d*$/.test(param1)) {
            return res.status(400).json({ error: "Invalid gameId format" });
          }
          if (param2 === "screenshots") {
            path = `games/${param1}/screenshots`;
          } else if (param2 === "movies") {
            path = `games/${param1}/movies`;
          }
        }
      } else {
        // If only param1, it should be a game slug
        const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
        if (!slugPattern.test(param1)) {
          return res.status(400).json({ error: "Invalid game slug format" });
        }
        path = `games/${param1}`;
      }
    } else {
      // If no param1, just use the base games endpoint
      path = "games";

      // Games endpoints accepts the following query parameters
      const allowedQueryParams = [
        "genres",
        "parent_platforms",
        "ordering",
        "search",
        "page",
      ] as const;

      allowedQueryParams.forEach((param) => {
        if (req.query[param] !== undefined) {
          const value = req.query[param];
          if (value && typeof value === "string" && value.length > 100)
            filteredQuery[param] = value.slice(0, 100);
          else filteredQuery[param] = value;
        }
      });
    }
  };

  const handleGenresEndpoint = () => {
    // If genres endpoint, ensure no additional params
    if (param1 || param2)
      return res
        .status(400)
        .json({ error: "Genres endpoint does not accept additional parameters" });
    path = "genres";
  };

  const handlePlatformsEndpoint = () => {
    // If platforms endpoint, ensure has the correct full path
    if (!(param1 === "lists" && param2 === "parents")) {
      return res.status(400).json({ error: "Platforms endpoint requires '/lists/parents' path" });
    }
    path = "platforms/lists/parents";
  };

  switch (endpoint) {
    case "games": // Accepts "/games", "/games/:gameId", "/games/:gameId/screenshots", "/games/:gameId/movies"
      handleGamesEndpoint();
      break;

    case "genres": // Accepts only "/genres""
      handleGenresEndpoint();
      break;

    case "platforms": // Accepts only "/platforms/lists/parents"
      handlePlatformsEndpoint();
      break;

    default: // If no valid endpoint, return 404
      return res.status(404).json({ error: "Invalid endpoint" });
  }

  if (res.headersSent) return;

  const cacheKey = `cache:${path}:${JSON.stringify(filteredQuery)}`;
  if (useRedis) {
    // rate limit by ip
    const ip = req.ip;
    if (ip) {
      const { success } = await clientLimiter!.limit(ip);
      if (!success) return res.status(429).json({ error: "Too many requests" });
    }

    // check if request is cached

    const cached = await redis!.get<string>(cacheKey);
    if (cached !== null) {
      res.setHeader("X-Cache", "HIT");
      return res.json(cached);
    }

    // check if global budget exceeded
    const budgetKey = "external-call-count";
    const calls = await redis!.incr(budgetKey);
    if (calls === 1) {
      await redis!.expire(budgetKey, 24 * 60 * 60);
    }
    const maxCalls = config.maxExternalCalls;
    if (calls > maxCalls) {
      return res.status(503).json({ error: "Global call budget reached" });
    }
  }

  // fetch data from the external API
  try {
    console.log(
      `[API REQUEST] Path: ${config.apiUrl}${path}, Query: ${JSON.stringify(filteredQuery)}`
    );
    const response = await axiosInstance.get(path, { params: filteredQuery });

    if (useRedis)
      await redis!.set(cacheKey, JSON.stringify(response.data), {
        ex: config.cacheDuration,
      });

    res.set({
      "Cache-Control": `public, max-age=${config.cacheDuration}`, //browser cache
      "CDN-Cache-Control": `public, max-age=${config.cacheDuration}, s-maxage=${config.cacheDuration}, stale-while-revalidate`, // Vercel Edge cache
      "X-Cache": "MISS",
    });

    return res.status(response.status || 200).json(response.data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    const body = err.response?.data || { error: "Upstream error" };
    return res.status(status).json(body);
  }
});

export default router;
