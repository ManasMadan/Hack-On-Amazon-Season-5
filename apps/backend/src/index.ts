import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import { appRouter } from "@/trpc/router";
import cors from "cors";
import { toNodeHandler } from "better-auth/node";
import { auth } from "@repo/auth";
import { createContext } from "@/trpc/context";

const app = express();

app.use(
  cors({
    origin: process.env.NEXT_PUBLIC_FRONTEND_URL || "http://localhost:3000",
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
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
    createContext: createContext,
  })
);

app.listen(3001);

export type { AppRouter } from "./trpc/router";
