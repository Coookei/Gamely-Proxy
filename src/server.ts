import express from "express";
import { config } from "./config";
import { registerMiddleware } from "./startup/middleware";
import { registerRoutes } from "./startup/routes";
import { registerErrorHandlers } from "./startup/errorHandlers";

const app = express();
registerMiddleware(app);
registerRoutes(app);

const server = app.listen(config.port, () => console.log(`Proxy listening on port ${config.port}`));

registerErrorHandlers(server);
