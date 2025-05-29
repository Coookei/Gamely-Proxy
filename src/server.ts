import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import axios from "axios";
import compression from "compression";
import cors from "cors";
import dotenv from "dotenv";
import express, { NextFunction, Request, Response } from "express";
import helmet from "helmet";
import http from "http";
import https from "https";

const MAX_QUERY_VALUE_LENGTH = 100; // limit string query lengths

dotenv.config();

const requiredEnvVars = [
  "API_URL",
  "API_KEY",
  "WHITELISTED_ORIGINS",
  "UPSTASH_REDIS_REST_URL",
  "UPSTASH_REDIS_REST_TOKEN",
  "MAX_EXTERNAL_CALLS",
];
requiredEnvVars.forEach((envVar) => {
  if (!process.env[envVar]) {
    throw new Error(`Missing required environment variable: ${envVar}`);
  }
});

const whitelist = (process.env.WHITELISTED_ORIGINS || "")
  .split(",")
  .map((u) => {
    if (u.endsWith("/")) u = u.slice(0, -1);
    return u.trim();
  })
  .filter(Boolean);

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
});
const clientLimiter = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(200, "1h"),
});

const app = express();
app.use(express.json());
app.disable("x-powered-by");
app.use(helmet());
app.use(compression());

app.use(
  cors({
    origin: (origin, callback) => {
      // allow requests with no origin (mobile apps, curl)
      if (!origin) return callback(null, true);
      if (whitelist.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Request from disallowed origin"));
      }
    },
    methods: ["GET"],
  })
);

const axiosInstance = axios.create({
  baseURL: process.env.API_URL,
  timeout: 4_000,
  params: {
    key: process.env.API_KEY,
  },
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});

app.get(["/", "/api"], (req, res) => {
  res.json({ message: "Welcome to the Gamely proxy server" });
});

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
app.get("/api/:endpoint{/:param1}{/:param2}", async (req, res): Promise<any> => {
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
          if (value && typeof value === "string" && value.length > MAX_QUERY_VALUE_LENGTH) {
            return res.status(400).json({ error: `Query parameter "${param}" is too long` });
          }
          filteredQuery[param] = value;
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

  // rate limi by ip
  const ip = req.ip;
  if (ip) {
    const { success } = await clientLimiter.limit(ip);
    if (!success) return res.status(429).json({ error: "Too many requests" });
  }

  // check if request is cached
  const cacheKey = `cache:${path}:${JSON.stringify(filteredQuery)}`;
  const cached = await redis.get<string>(cacheKey);
  if (cached !== null) {
    res.setHeader("X-Cache", "HIT");
    return res.json(cached);
  }

  // check if global budget exceeded
  const budgetKey = "external-call-count";
  const calls = await redis.incr(budgetKey);
  if (calls === 1) {
    await redis.expire(budgetKey, 24 * 60 * 60);
  }
  const maxCalls = parseInt(process.env.MAX_EXTERNAL_CALLS!, 10) || 1000;
  if (calls > maxCalls) {
    return res.status(503).json({ error: "Global call budget reached" });
  }

  // fetch data from the external API
  try {
    console.log(
      `[API REQUEST] Path: ${process.env.API_URL}${path}, Query: ${JSON.stringify(filteredQuery)}`
    );
    const response = await axiosInstance.get(path, { params: filteredQuery });

    await redis.set(cacheKey, JSON.stringify(response.data), {
      ex: 24 * 60 * 60,
    });

    const twoDays = 2 * 24 * 60 * 60;
    res.set({
      // Browser - recheck after 5m
      "Cache-Control": `public, max-age=300`,
      // Vercel Edge - keep for 1h in each PoP, serve stale for up to 2d
      "CDN-Cache-Control": `public, max-age=${twoDays}, s-maxage=${twoDays}, stale-while-revalidate`,
      "X-Cache": "MISS",
    });

    return res.status(response.status || 200).json(response.data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    const body = err.response?.data || { error: "Upstream error" };
    return res.status(status).json(body);
  }
});

app.get("/health", async (_, res) => {
  try {
    await redis.get("__up");
    res.sendStatus(200);
  } catch {
    res.sendStatus(503);
  }
});

app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  // If this is the block origin error, send 403 and stop
  if (err instanceof Error && err.message === "Request from disallowed origin") {
    console.warn("Blocked request from disallowed origin:", req.headers.origin);
    res.status(403).json({ error: err.message });
    return;
  }

  console.error(err);
  res.status(500).json({ error: "Internal server error" });
});

app.use((req: Request, res: Response) => {
  // 404 handler
  res.status(404).json({ error: "Not found" });
});

process.on("uncaughtException", (err) => {
  console.error("Uncaught Exception:", err);
});

process.on("unhandledRejection", (err) => {
  console.error("Unhandled Promise rejection:", err);
});

process.on("SIGTERM", () => {
  server.close(() => process.exit(0));
});

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => console.log(`Proxy server listening on port ${PORT}`));
