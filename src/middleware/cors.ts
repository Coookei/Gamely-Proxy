import cors from "cors";
import { config } from "../config";

export const corsMiddleware = cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (config.whitelist.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Request from disallowed origin"));
    }
  },
  methods: ["GET"],
});
