import { Express } from "express";
import apiRoutes from "../routes/api";
import healthRoute from "../routes/health";
import { errorHandler } from "../middleware/errorHandler";

export function registerRoutes(app: Express) {
  app.get(["/", "/api", "/api/"], (req, res) => {
    res.json({ message: "Welcome to the Gamely proxy server" });
  });

  app.use("/api", apiRoutes);
  app.use("/health", healthRoute);

  app.use(errorHandler);

  app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });
}
