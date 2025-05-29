import express from "express";
import { redis, useRedis } from "../services/redis";

const router = express.Router();

router.get("/", async (_, res) => {
  if (!useRedis) {
    res.status(503).json({ error: "Redis is not configured" });
    return;
  }

  try {
    await redis!.get("__up");
    res.sendStatus(200);
  } catch {
    res.sendStatus(503);
  }
});

export default router;
