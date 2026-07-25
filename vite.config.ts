import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig, type Plugin } from "vite"

// Local proxy plugin — serves /api/proxy in dev mode
function localProxyPlugin(): Plugin {
  return {
    name: "local-proxy",
    configureServer(server) {
      server.middlewares.use("/api/proxy", async (req, res) => {
        const url = new URL(req.url || "/", `http://${req.headers.host}`);
        const target = url.searchParams.get("url");

        if (!target) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Missing url parameter" }));
          return;
        }

        try {
          const response = await fetch(target, {
            headers: {
              "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
              "Accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
            },
          });

          const contentType = response.headers.get("content-type") || "application/octet-stream";
          const isBinary =
            contentType.startsWith("image/") ||
            contentType.startsWith("video/") ||
            contentType.startsWith("font/") ||
            contentType.includes("octet-stream");

          res.setHeader("Access-Control-Allow-Origin", "*");
          res.setHeader("Content-Type", contentType);

          if (contentType.startsWith("image/")) {
            res.setHeader("Cache-Control", "public, max-age=3600");
          }

          if (isBinary) {
            const buffer = Buffer.from(await response.arrayBuffer());
            res.writeHead(response.status);
            res.end(buffer);
          } else {
            const body = await response.text();
            res.writeHead(response.status);
            res.end(body);
          }
        } catch (err: any) {
          res.writeHead(500, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "Proxy request failed", details: err?.message }));
        }
      });
    },
  };
}

export default defineConfig({
  base: '/',
  plugins: [react(), localProxyPlugin()],
  server: {
    port: 3000,
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
});
