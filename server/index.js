import express from "express";
import { createProxyMiddleware } from "http-proxy-middleware";
import { config } from "dotenv";
import http from "http";

config();

const app = express();
const PORT = process.env.PORT || 3001;
const OPENCODE_URL = process.env.OPENCODE_URL || "http://localhost:4096";
const AUTH_TOKEN = process.env.AUTH_TOKEN;

app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization, x-opencode-auth, x-opencode-url, x-relay-token");
  
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

if (AUTH_TOKEN) {
  app.use((req, res, next) => {
    const token = req.headers["x-relay-token"] || req.query.token;
    if (token !== AUTH_TOKEN) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    next();
  });
}

app.get("/health", (req, res) => {
  res.json({ status: "ok", target: OPENCODE_URL });
});

app.get("/event", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.flushHeaders();

  const url = new URL("/event", OPENCODE_URL);
  const options = {
    hostname: url.hostname,
    port: url.port || 80,
    path: url.pathname,
    method: "GET",
    headers: {},
  };

  const authHeader = req.headers["x-opencode-auth"];
  if (authHeader) {
    options.headers["Authorization"] = authHeader;
  }

  const proxyReq = http.request(options, (proxyRes) => {
    proxyRes.on("data", (chunk) => {
      res.write(chunk);
    });

    proxyRes.on("end", () => {
      res.end();
    });
  });

  proxyReq.on("error", (err) => {
    console.error("SSE proxy error:", err.message);
    res.end();
  });

  req.on("close", () => {
    proxyReq.destroy();
  });

  proxyReq.end();
});

const proxy = createProxyMiddleware({
  target: OPENCODE_URL,
  changeOrigin: true,
  ws: true,
  pathRewrite: (path) => path.replace(/^\/api/, ""),
  on: {
    proxyReq: (proxyReq, req) => {
      const authHeader = req.headers["x-opencode-auth"];
      if (authHeader) {
        proxyReq.setHeader("Authorization", authHeader);
      }
    },
    error: (err, req, res) => {
      console.error("Proxy error:", err.message);
      if (res.writeHead) {
        res.writeHead(502, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "OpenCode server unreachable" }));
      }
    },
  },
});

app.use("/api", proxy);

app.listen(PORT, () => {
  console.log(`Relay server running on port ${PORT}`);
  console.log(`Proxying to OpenCode at ${OPENCODE_URL}`);
  if (AUTH_TOKEN) {
    console.log("Authentication enabled");
  }
});
