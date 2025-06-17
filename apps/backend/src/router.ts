import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import { appRouter } from ".";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "@repo/auth";

const app = express();

app.use(
  cors({
    origin: process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

app.get("/", (_req, res) => {
  res.send("Server is running!");
});

app.all("/api/auth/*splat", toNodeHandler(auth));

app.use(
  "/trpc",
  createExpressMiddleware({
    router: appRouter,
  })
);

app.listen(3001);
