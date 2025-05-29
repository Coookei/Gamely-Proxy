import { Router } from "express";
import { proxyRequest } from "../utils/proxyRequest";

const router = Router();

const isGameId = (id: string) => /^[1-9]\d*$/.test(id);
const isSlug = (slug: string) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug);

router.get("/", async (req, res) => {
  // validate query parameters before sending to API
  const allowedQueryParams = ["genres", "parent_platforms", "ordering", "search", "page"] as const;
  const filteredQuery: Record<string, any> = {};
  allowedQueryParams.forEach((param) => {
    if (req.query[param] !== undefined) {
      const value = req.query[param];
      filteredQuery[param] =
        typeof value === "string" && value.length > 100 ? value.slice(0, 100) : value;
    }
  });

  await proxyRequest(req, res, "games", filteredQuery);
});

router.get("/:gameId", async (req, res) => {
  const { gameId } = req.params;
  if (!isSlug(gameId)) {
    res.status(400).json({ error: "Invalid game slug format" });
    return;
  }
  await proxyRequest(req, res, `games/${gameId}`);
});

router.get("/:gameId/screenshots", async (req, res) => {
  const { gameId } = req.params;
  if (!isGameId(gameId)) {
    res.status(400).json({ error: "Invalid gameId format" });
    return;
  }
  await proxyRequest(req, res, `games/${gameId}/screenshots`);
});

router.get("/:gameId/movies", async (req, res) => {
  const { gameId } = req.params;
  if (!isGameId(gameId)) {
    res.status(400).json({ error: "Invalid gameId format" });
    return;
  }
  await proxyRequest(req, res, `games/${gameId}/movies`);
});

export default router;
