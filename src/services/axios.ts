import axios from "axios";
import http from "http";
import https from "https";
import { config } from "../config";

export const axiosInstance = axios.create({
  baseURL: config.apiUrl,
  timeout: config.axiosTimeout,
  params: { key: config.apiKey },
  httpAgent: new http.Agent({ keepAlive: true }),
  httpsAgent: new https.Agent({ keepAlive: true }),
});
