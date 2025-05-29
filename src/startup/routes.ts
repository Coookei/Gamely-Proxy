import { Express } from "express";
import { errorHandler } from "../middleware/errorHandler";
import gamesRouter from "../routes/games";
import genresRouter from "../routes/genres";
import healthRoute from "../routes/health";
import platformsRouter from "../routes/platforms";

export function registerRoutes(app: Express) {
  app.get("/", (req, res) => {
    res.json({ message: "Welcome to the Gamely proxy server" });
  });
  app.use("/games", gamesRouter);
  app.use("/genres", genresRouter);
  app.use("/platforms", platformsRouter);
  app.use("/health", healthRoute);

  app.use(errorHandler);
  app.use((req, res) => {
    res.status(404).json({ error: "Not found" });
  });
}
