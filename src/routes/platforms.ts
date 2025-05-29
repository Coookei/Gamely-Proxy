import { Router } from "express";
import { proxyRequest } from "../utils/proxyRequest";

const router = Router();

router.get("/lists/parents", async (req, res) => {
  await proxyRequest(req, res, "platforms/lists/parents");
});

export default router;
