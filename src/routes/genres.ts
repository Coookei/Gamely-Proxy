import { Router } from "express";
import { proxyRequest } from "../utils/proxyRequest";

const router = Router();

router.get("/", async (req, res) => {
  await proxyRequest(req, res, "genres");
});

export default router;
