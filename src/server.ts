import express, { Request, Response, NextFunction } from "express";
import dotenv from "dotenv";
import axios from "axios";
import helmet from "helmet";
import cors from "cors";

dotenv.config();

const requiredEnvVars = ["API_URL", "API_KEY", "WHITELISTED_ORIGINS"];
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
// console.log("Whitelisted origins:", whitelist);

const app = express();
app.use(express.json());
app.disable("x-powered-by");
app.use(helmet());

app.use(
  cors({
    origin: (origin, callback) => {
      // console.log(whitelist.includes(origin!) ? "Allowed origin:" : "Blocked origin:", origin);
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
  timeout: 5_000,
  params: {
    key: process.env.API_KEY,
  },
});

app.get("/", (req, res) => {
  res.send("Welcome to the Proxy Server!");
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
          filteredQuery[param] = req.query[param];
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

  try {
    console.log(
      `[API REQUEST] Path: ${process.env.API_URL}${path}, Query: ${JSON.stringify(filteredQuery)}`
    );
    const response = await axiosInstance.get(path, { params: filteredQuery });
    return res.status(response.status || 200).json(response.data);
  } catch (err: any) {
    const status = err.response?.status || 500;
    const body = err.response?.data || { error: "Upstream error" };
    return res.status(status).json(body);
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
