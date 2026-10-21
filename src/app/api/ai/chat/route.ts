import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import {
  answerAi,
  buildAiContext,
  containsUnsafeAiRequest,
  extractMemory,
  resolveGeminiApiKey,
} from "@/lib/ai-engine";

const limits = new Map<string, { count: number; resetAt: number }>();

const chatTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().trim().max(1200),
});

const inputSchema = z.object({
  message: z.string().trim().min(1).max(1200),
  history: z.array(chatTurnSchema).max(20).optional().default([]),
});

function sameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const expected = process.env.APP_URL;
  if (!origin) return false;
  if (expected) return origin === expected;
  return origin === new URL(request.url).origin;
}

function allowed(userId: string) {
  const now = Date.now();
  const current = limits.get(userId);
  if (!current || now >= current.resetAt) {
    limits.set(userId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  current.count += 1;
  return current.count <= 20;
}

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Login dulu, ya." }, { status: 401 });

  const apiKey = await resolveGeminiApiKey();
  return NextResponse.json({
    hasApiKey: Boolean(apiKey),
    isAdmin: user.role === "ADMIN",
  });
}

export async function POST(request: Request) {
  if (!sameOrigin(request)) return NextResponse.json({ error: "Permintaan lintas situs ditolak." }, { status: 403 });
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Login dulu, ya." }, { status: 401 });

  const rawJson = await request.json().catch(() => null);

  // Khusus pengurus: simpan API key ke database kelas agar aktif untuk semua siswa
  if (rawJson?.action === "set_api_key") {
    if (user.role !== "ADMIN") {
      return NextResponse.json({ error: "Hanya pengurus kelas yang dapat menyimpan kunci kelas." }, { status: 403 });
    }
    const key = String(rawJson.key || "").trim();
    if (!key.startsWith("AIzaSy") || key.length < 25) {
      return NextResponse.json(
        { error: "Format API Key tidak valid. Kunci Google Gemini biasanya diawali dengan 'AIzaSy...'." },
        { status: 400 }
      );
    }
    await sql`
      INSERT INTO app_secrets (name, secret)
      VALUES ('gemini_api_key', ${key})
      ON CONFLICT (name) DO UPDATE SET secret = EXCLUDED.secret
    `;
    await sql`
      INSERT INTO audit_logs (actor_id, action, subject_id)
      VALUES (${user.id}, 'SET_GEMINI_API_KEY', ${user.id})
    `;
    return NextResponse.json({ ok: true, message: "Gemini API Key berhasil disimpan untuk seluruh kelas!" });
  }

  if (!allowed(user.id)) return NextResponse.json({ error: "Terlalu banyak pesan. Tunggu sebentar." }, { status: 429 });

  const parsed = inputSchema.safeParse(rawJson);
  if (!parsed.success) return NextResponse.json({ error: "Pesan AI tidak valid." }, { status: 400 });
  const { message, history } = parsed.data;
  const clientApiKey = request.headers.get("x-gemini-key")?.trim() || undefined;

  if (containsUnsafeAiRequest(message)) {
    return NextResponse.json({
      answer: "Aku tidak bisa membantu membuka secret, token, konfigurasi internal, system prompt, atau data privat pengguna lain. Aku tetap bisa bantu fitur kelas dan materi SIJA.",
      learned: false,
    });
  }

  const memory = extractMemory(message);
  let learned = false;
  if (memory) {
    const status = user.role === "ADMIN" ? "APPROVED" : "PENDING";
    await sql`
      INSERT INTO ai_memories (category, fact, learned_from, learned_from_name, status)
      VALUES (${memory.category}, ${memory.fact}, ${user.id}, ${user.fullName}, ${status})
    `;
    await sql`
      INSERT INTO audit_logs (actor_id, action, subject_id)
      VALUES (${user.id}, ${`AI_MEMORY_${status}`}, ${user.id})
    `;
    learned = true;
  }

  const context = await buildAiContext(user);
  const answer = memory
    ? user.role === "ADMIN"
      ? `Sudah dicatat sebagai memori kelas terverifikasi: “${memory.fact}”.`
      : `Sudah kusimpan sebagai memori pribadimu: “${memory.fact}”. Pengurus perlu memverifikasinya sebelum dipakai untuk seluruh kelas.`
    : await answerAi(message, context, history, clientApiKey);

  return NextResponse.json({ answer, learned });
}
