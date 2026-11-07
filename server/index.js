import "dotenv/config";
import cors from "cors";
import express from "express";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import process from "node:process";
import { fileURLToPath } from "node:url";
import { PrismaClient } from "@prisma/client";

const app = express();
const prisma = new PrismaClient();
const port = Number(process.env.PORT) || 3001;
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const allowedOrigins = (process.env.CLIENT_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);
const isCrossSite = allowedOrigins.length > 0;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const sessionCookie = "hunter_session";

app.use(
  cors({
    origin: allowedOrigins.length ? allowedOrigins : false,
    credentials: true,
  })
);
app.use(express.json({ limit: "10mb" }));

app.get("/api/health", (_request, response) => {
  response.json({ ok: true });
});

app.get("/api/state", async (request, response, next) => {
  try {
    let clientId = getCookieValue(request, sessionCookie);
    let savedState = uuidPattern.test(clientId || "")
      ? await findAppState(clientId)
      : null;

    if (!savedState) {
      const legacyClientId = request.get("X-Legacy-Client-Id");
      if (uuidPattern.test(legacyClientId || "")) {
        savedState = await findAppState(legacyClientId);
        if (savedState) clientId = legacyClientId;
      }
    }

    if (!savedState && !uuidPattern.test(clientId || "")) {
      clientId = randomUUID();
    }
    setSessionCookie(response, clientId);

    if (!savedState) {
      savedState = await findAppState(clientId);
    }
    return response.json({ state: savedState });
  } catch (error) {
    return next(error);
  }
});

app.put("/api/state", async (request, response, next) => {
  const clientId = getCookieValue(request, sessionCookie);
  const { data, questData } = request.body || {};
  if (!uuidPattern.test(clientId || "")) {
    return response.status(401).json({ error: "Cloud session is missing" });
  }
  if (!isRecord(data) || !isRecord(questData)) {
    return response
      .status(400)
      .json({ error: "data and questData must be JSON objects" });
  }

  try {
    await prisma.appState.upsert({
      where: { clientId },
      create: { clientId, data, questData },
      update: { data, questData },
    });
    return response.status(204).end();
  } catch (error) {
    return next(error);
  }
});

// Serve built frontend static files if dist folder exists (Single-service deployment)
const distPath = path.join(__dirname, "../dist");
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*splat", (request, response, next) => {
    if (request.path.startsWith("/api/")) return next();
    response.sendFile(path.join(distPath, "index.html"));
  });
}

async function findAppState(clientId) {
  if (!clientId) return null;
  return prisma.appState.findUnique({
    where: { clientId },
    select: { data: true, questData: true },
  });
}

function setSessionCookie(response, clientId) {
  const isProduction = process.env.NODE_ENV === "production";
  response.cookie(sessionCookie, clientId, {
    httpOnly: true,
    secure: isProduction || isCrossSite,
    sameSite: isCrossSite ? "none" : "lax",
    maxAge: 1000 * 60 * 60 * 24 * 365,
    path: "/",
  });
}

function getCookieValue(request, name) {
  const cookie = request.headers.cookie
    ?.split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${name}=`));
  return cookie ? cookie.slice(name.length + 1) : null;
}

app.use((error, _request, response, next) => {
  console.error("API request failed:", error);
  if (response.headersSent) return next(error);
  response.status(500).json({ error: "The server could not save this data" });
});

const server = app.listen(port, () => {
  console.log(`Hunter API listening on port ${port}`);
});

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.on(signal, () => {
    server.close(async () => {
      await prisma.$disconnect();
      process.exit(0);
    });
  });
}

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
