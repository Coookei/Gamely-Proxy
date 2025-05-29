import express, { Express } from "express";
import helmet from "helmet";
import compression from "compression";
import { corsMiddleware } from "../middleware/cors";

export function registerMiddleware(app: Express) {
  app.use(express.json());
  app.disable("x-powered-by");
  app.use(helmet());
  app.use(compression());
  app.set("trust proxy", true);
  app.use(corsMiddleware);
}
