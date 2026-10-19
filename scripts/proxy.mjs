import http from "node:http";
import { SignJWT } from "jose";

const secret = new TextEncoder().encode("ruang-cerita-local-secret-ganti-saat-production-2026");

async function makeToken(user) {
  return await new SignJWT(user)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

const studentToken = await makeToken({
  id: "614e93b3-f0f5-4370-816f-e0e0f52e50d6",
  username: "amira",
  fullName: "Amira Khoirunnisa",
  role: "STUDENT",
  mustChangePassword: false,
});

const adminToken = await makeToken({
  id: "18331e2a-96a8-4849-bf38-ab0f49193333",
  username: "pengurus1",
  fullName: "Pengurus Kelas",
  role: "ADMIN",
  mustChangePassword: false,
});

const server = http.createServer((req, res) => {
  const isAdmin = req.url.startsWith("/pengurus");
  const token = isAdmin ? adminToken : studentToken;

  const options = {
    hostname: "127.0.0.1",
    port: 3000,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: "127.0.0.1:3000",
      cookie: `ruang_cerita_session=${token}`,
    },
  };

  const proxyReq = http.request(options, (proxyRes) => {
    res.writeHead(proxyRes.statusCode, proxyRes.headers);
    proxyRes.pipe(res);
  });

  proxyReq.on("error", (err) => {
    res.writeHead(502);
    res.end(err.message);
  });

  if (req.method === "GET" || req.method === "HEAD") {
    proxyReq.end();
  } else {
    req.pipe(proxyReq);
  }
});

server.listen(3001, "127.0.0.1", () => {
  console.log("Proxy listening on 3001");
});
