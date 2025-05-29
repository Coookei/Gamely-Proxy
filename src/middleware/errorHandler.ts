import { Request, Response, NextFunction } from "express";

export function errorHandler(err: any, req: Request, res: Response, next: NextFunction) {
  if (err instanceof Error && err.message === "Request from disallowed origin") {
    console.warn("Blocked request from disallowed origin:", req.headers.origin);
    res.status(403).json({ error: err.message });
    return;
  }
  console.error(err);
  res.status(500).json({ error: "Internal server error" });
}
