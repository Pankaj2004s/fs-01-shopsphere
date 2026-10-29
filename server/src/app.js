import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";

import { env } from "./config/env.js";
import healthRoutes from "./features/health/health.routes.js";

const app = express();

app.use(helmet());
app.use(cors({ origin: env.clientUrl }));
app.use(morgan("dev"));
app.use(express.json());
app.use("/api/health", healthRoutes);

export default app;