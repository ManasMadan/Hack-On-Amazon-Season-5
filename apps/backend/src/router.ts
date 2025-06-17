import { createExpressMiddleware } from "@trpc/server/adapters/express";
import express from "express";
import { appRouter } from ".";
import cors from "cors";

async function main() {
  const app = express();

  app.use(cors());

  app.get("/", (_req, res) => {
    res.send("Server is running!");
  });

  app.use(
    "/trpc",
    createExpressMiddleware({
      router: appRouter,
    })
  );
  app.listen(3001);
}

void main();
