import express, { type Express } from "express";
import fs from "fs";
import path from "path";

export function serveStatic(app: Express) {
  // Try multiple possible paths for the built client files
  const candidates = [
    path.resolve(__dirname, "public"),        // dist/public (when running from dist/)
    path.resolve(__dirname, "..", "dist", "public"),  // fallback from project root
  ];

  const distPath = candidates.find(p => fs.existsSync(p));
  if (!distPath) {
    console.warn(
      `[static] Could not find build directory (tried: ${candidates.join(", ")}). ` +
      `Static file serving will rely on the CDN or upstream proxy.`
    );
    return;
  }

  console.log(`[static] Serving static files from ${distPath}`);
  app.use(express.static(distPath));

  // fall through to index.html if the file doesn't exist (SPA routing)
  const indexPath = path.resolve(distPath, "index.html");
  app.use("/{*path}", (_req, res) => {
    res.sendFile(indexPath);
  });
}
