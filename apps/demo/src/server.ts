import fastifyStatic from "@fastify/static";
import { createMemDb } from "@koe/db";
import { buildApp } from "@koe/server/app";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { seedDemoData } from "./seed.js";
import { runWalkthrough } from "./walkthrough.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const publicDir = path.resolve(__dirname, "../public");

export interface DemoServerOptions {
  port?: number;
  host?: string;
  jwtSecret?: string;
  serviceToken?: string;
  skipWalkthrough?: boolean;
}

const DEFAULT_DEMO_SERVICE_TOKEN = "demo-service-token-at-least-32-characters";

export async function createDemoServer(options: DemoServerOptions = {}) {
  const port = options.port ?? 3000;
  const host = options.host ?? "0.0.0.0";
  const jwtSecret = options.jwtSecret ?? "demo-secret-key-at-least-32-characters-long";
  // The demo owns a service credential so the walkthrough (and tests) can
  // assign Flairs through the scoped service API, exactly as the `supporters`
  // service would.
  const serviceToken = options.serviceToken ?? DEFAULT_DEMO_SERVICE_TOKEN;

  const { db } = await createMemDb();

  const app = buildApp({
    db,
    jwtSecret,
    serviceToken,
    logger: false,
    adminDistPath: path.resolve(__dirname, "../../../apps/admin/dist"),
  });

  // Register static assets for demo widget and HTML page
  await app.register(fastifyStatic, {
    root: publicDir,
    prefix: "/",
  });

  // Seed demo data (Admin user, initial thread & comments)
  const seed = await seedDemoData(db, jwtSecret);

  return {
    app,
    db,
    seed,
    port,
    host,
    jwtSecret,
    serviceToken,
  };
}

async function main() {
  const { app, seed, port, host, serviceToken } = await createDemoServer();

  await app.listen({ port, host });
  const baseUrl = `http://localhost:${port}`;

  console.log(`\n🚀 Koe Demo Server running at ${baseUrl}`);
  console.log(`📁 Serving static UI from ${publicDir}`);
  console.log(`🔑 Admin token: ${seed.adminToken}`);
  console.log(`👤 Admin user: ${seed.adminUser.name} (${seed.adminUser.id})`);

  // Run automated verification walkthrough
  await runWalkthrough({
    baseUrl,
    adminToken: seed.adminToken,
    serviceToken,
    demoAuthorId: seed.demoAuthor.id,
  });

  console.log(`\n🌐 Open your browser at ${baseUrl} to interact with the Koe widget!`);
  console.log("Press Ctrl+C to stop.\n");
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  void main();
}
