import path from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { env } from "./config.js";
import { errorHandler } from "./middleware/errorHandler.js";
import { adminRouter } from "./routes/admin.js";
import { assetsRouter } from "./routes/assets.js";
import { authRouter } from "./routes/auth.js";
import { evidenceRouter } from "./routes/evidence.js";
import { lifecycleRouter } from "./routes/lifecycle.js";
import { passportRouter } from "./routes/passport.js";
import { productRouter } from "./routes/product.js";
import { verificationRouter } from "./routes/verification.js";

export const app = express();
app.disable("x-powered-by");
app.use(
  cors({
    origin: env.CLIENT_ORIGIN.split(",").map((v) => v.trim()),
    credentials: true,
  }),
);
app.use(express.json({ limit: "1mb" }));
app.use(cookieParser());
app.use(
  "/storage/public",
  express.static(path.resolve("storage/public"), {
    immutable: true,
    maxAge: "7d",
  }),
);
app.get("/api/health", (_req, res) =>
  res.json({ status: "ok", service: "greentrace-api" }),
);
app.use(
  "/api",
  authRouter,
  assetsRouter,
  evidenceRouter,
  verificationRouter,
  lifecycleRouter,
  passportRouter,
  productRouter,
  adminRouter,
);
app.use((_req, res) =>
  res.status(404).json({ error: "API endpoint không tồn tại" }),
);
app.use(errorHandler);
