import { Server } from "http";

export function registerErrorHandlers(server: Server) {
  process.on("SIGTERM", () => {
    server.close(() => process.exit(0));
  });

  process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
  });

  process.on("unhandledRejection", (err) => {
    console.error("Unhandled Promise rejection:", err);
  });
}
