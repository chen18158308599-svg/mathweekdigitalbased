import { createServer } from "node:http";
import { handleMathverseHttpRequest } from "./mathverseProxy.js";

const PORT = Number(process.env.PORT || 10000);

const server = createServer((req, res) => {
  const pathname = new URL(req.url, "http://localhost").pathname;

  if (pathname === "/api/mathverse") {
    void handleMathverseHttpRequest(req, res);
    return;
  }

  res.setHeader("Content-Type", "application/json; charset=utf-8");

  if (pathname === "/health" && req.method === "GET") {
    res.statusCode = 200;
    res.end(JSON.stringify({ ok: true, status: "healthy" }));
    return;
  }

  res.statusCode = 404;
  res.end(JSON.stringify({ ok: false, error: "Not found" }));
});

server.listen(PORT, "0.0.0.0", () => {
  console.log(`Math Week Score API running on port ${PORT}`);
});
