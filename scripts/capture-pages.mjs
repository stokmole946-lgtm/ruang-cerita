import http from "node:http";
import { SignJWT } from "jose";
import { spawn } from "node:child_process";

function capture(url, file, w, h) {
  return new Promise((resolve) => {
    const child = spawn(
      "chromium",
      [
        "--headless",
        "--no-sandbox",
        "--disable-gpu",
        "--hide-scrollbars",
        `--window-size=${w},${h}`,
        `--screenshot=/home/dayzx/ruang-cerita/${file}`,
        url,
      ],
      { stdio: "ignore" }
    );
    const timer = setTimeout(() => child.kill("SIGKILL"), 30000);
    child.on("exit", () => {
      clearTimeout(timer);
      resolve();
    });
  });
}

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

const fauzanToken = await makeToken({
  id: "afa5f2c5-93ae-4e45-9237-349af87c606c",
  username: "fauzan",
  fullName: "Muhammad Fauzan",
  role: "STUDENT",
  mustChangePassword: false,
});

let currentToken = studentToken;

const server = http.createServer((req, res) => {
  const options = {
    hostname: "127.0.0.1",
    port: 3000,
    path: req.url,
    method: req.method,
    headers: {
      ...req.headers,
      host: "127.0.0.1:3000",
      cookie: `ruang_cerita_session=${currentToken}`,
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

server.listen(3001, "127.0.0.1", async () => {
  console.log("Screenshot proxy listening on 3001");

  const shots = [
    { url: "http://127.0.0.1:3001/dashboard", file: ".impeccable/review/dashboard-desktop.png", w: 1440, h: 1000, role: "student" },
    { url: "http://127.0.0.1:3001/piket", file: ".impeccable/review/piket-desktop.png", w: 1440, h: 1000, role: "student" },
    { url: "http://127.0.0.1:3001/profil", file: ".impeccable/review/profil-desktop.png", w: 1440, h: 1000, role: "student" },
    { url: "http://127.0.0.1:3001/curhat", file: ".impeccable/review/curhat-siswa-desktop.png", w: 1440, h: 1000, role: "student" },
    { url: "http://127.0.0.1:3001/pengurus", file: ".impeccable/review/admin-dashboard-desktop.png", w: 1440, h: 1000, role: "admin" },
    { url: "http://127.0.0.1:3001/pengurus/curhat", file: ".impeccable/review/admin-curhat-desktop.png", w: 1440, h: 1000, role: "admin" },
  ];

  for (const shot of shots) {
    currentToken = shot.role === "admin" ? adminToken : shot.role === "fauzan" ? fauzanToken : studentToken;
    console.log(`Capturing ${shot.file}...`);
    await capture(shot.url, shot.file, shot.w, shot.h);
  }

  console.log("All captures completed.");
  server.close();
  process.exit(0);
});
