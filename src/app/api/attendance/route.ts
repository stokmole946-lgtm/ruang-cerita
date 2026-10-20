import { NextResponse } from "next/server";
import { z } from "zod";
import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { createAttendanceToken, verifyAttendanceToken } from "@/lib/attendance-token";

const scanLimits = new Map<string, { count: number; resetAt: number }>();

const actionSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("start"),
    title: z.string().trim().min(3).max(120),
    lateMinutes: z.number().int().min(0).max(180),
  }),
  z.object({ action: z.literal("close"), sessionId: z.string().uuid() }),
  z.object({ action: z.literal("scan"), token: z.string().min(100).max(4000) }),
  z.object({
    action: z.literal("status"),
    sessionId: z.string().uuid(),
    studentId: z.string().uuid(),
    status: z.enum(["PRESENT", "LATE", "EXCUSED", "SICK", "ABSENT"]),
    note: z.string().trim().max(500).optional().default(""),
  }),
]);

function isSameOrigin(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const headers = request.headers;
  const host = headers.get("x-forwarded-host") || headers.get("host");
  const proto = headers.get("x-forwarded-proto") || new URL(request.url).protocol.replace(":", "");
  return Boolean(host && origin === `${proto}://${host}`);
}

function scanAllowed(adminId: string) {
  const now = Date.now();
  const current = scanLimits.get(adminId);
  if (!current || now >= current.resetAt) {
    scanLimits.set(adminId, { count: 1, resetAt: now + 60_000 });
    return true;
  }
  current.count += 1;
  return current.count <= 120;
}

export async function GET(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Login dulu, ya." }, { status: 401 });

  const mode = new URL(request.url).searchParams.get("mode") || "summary";

  if (user.role === "STUDENT") {
    const [activeSession] = await sql`
      SELECT id, title, starts_at, late_after, token_version
      FROM attendance_sessions
      WHERE closed_at IS NULL
      ORDER BY starts_at DESC
      LIMIT 1
    `;

    const history = await sql`
      SELECT r.id, r.status, r.scanned_at, r.note, s.title, s.starts_at, s.closed_at
      FROM attendance_records r
      JOIN attendance_sessions s ON s.id = r.session_id
      WHERE r.student_id = ${user.id}
      ORDER BY s.starts_at DESC
      LIMIT 30
    `;

    if (!activeSession) {
      return NextResponse.json({ activeSession: null, record: null, token: null, history });
    }

    const [record] = await sql`
      SELECT id, status, scanned_at, note
      FROM attendance_records
      WHERE session_id = ${activeSession.id} AND student_id = ${user.id}
    `;

    const token = !record && mode === "token"
      ? await createAttendanceToken({
          studentId: user.id,
          sessionId: activeSession.id,
          tokenVersion: activeSession.token_version,
        })
      : null;

    return NextResponse.json({ activeSession, record: record || null, token, expiresIn: 12, history });
  }

  const sessionId = new URL(request.url).searchParams.get("session");
  const [activeSession] = sessionId
    ? await sql`
        SELECT id, title, starts_at, late_after, closed_at, created_by
        FROM attendance_sessions WHERE id = ${sessionId}
      `
    : await sql`
        SELECT id, title, starts_at, late_after, closed_at, created_by
        FROM attendance_sessions
        ORDER BY (closed_at IS NULL) DESC, starts_at DESC
        LIMIT 1
      `;

  const students = activeSession
    ? await sql`
        SELECT u.id, u.full_name, u.username, u.avatar,
          r.id AS record_id, r.status, r.scanned_at, r.note, r.source
        FROM users u
        LEFT JOIN attendance_records r
          ON r.student_id = u.id AND r.session_id = ${activeSession.id}
        WHERE u.role = 'STUDENT'
        ORDER BY u.full_name
      `
    : await sql`
        SELECT id, full_name, username, avatar,
          NULL::uuid AS record_id, NULL::text AS status,
          NULL::timestamptz AS scanned_at, NULL::text AS note, NULL::text AS source
        FROM users WHERE role = 'STUDENT' ORDER BY full_name
      `;

  const recentSessions = await sql`
    SELECT s.id, s.title, s.starts_at, s.late_after, s.closed_at,
      COUNT(r.id)::int AS recorded_count
    FROM attendance_sessions s
    LEFT JOIN attendance_records r ON r.session_id = s.id
    GROUP BY s.id
    ORDER BY s.starts_at DESC
    LIMIT 20
  `;

  return NextResponse.json({ activeSession: activeSession || null, students, recentSessions });
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Permintaan lintas situs ditolak." }, { status: 403 });
  }

  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Login dulu, ya." }, { status: 401 });

  const parsed = actionSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Data absensi tidak valid." }, { status: 400 });
  }
  const data = parsed.data;

  if (data.action === "start") {
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Khusus pengurus." }, { status: 403 });
    try {
      const [session] = await sql`
        INSERT INTO attendance_sessions (title, starts_at, late_after, created_by)
        VALUES (${data.title}, NOW(), NOW() + (${data.lateMinutes} * INTERVAL '1 minute'), ${user.id})
        RETURNING id, title, starts_at, late_after
      `;
      await sql`
        INSERT INTO audit_logs (actor_id, action, subject_id)
        VALUES (${user.id}, 'START_ATTENDANCE_SESSION', ${session.id})
      `;
      return NextResponse.json({ ok: true, session });
    } catch (error) {
      if (String(error).includes("attendance_one_active_session_idx")) {
        return NextResponse.json({ error: "Masih ada sesi absensi yang aktif." }, { status: 409 });
      }
      throw error;
    }
  }

  if (data.action === "close") {
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Khusus pengurus." }, { status: 403 });
    const closed = await sql.begin(async (tx) => {
      const [session] = await tx`
        UPDATE attendance_sessions
        SET closed_at = NOW(), token_version = gen_random_uuid()
        WHERE id = ${data.sessionId} AND closed_at IS NULL
        RETURNING id
      `;
      if (!session) return false;
      await tx`
        INSERT INTO attendance_records (session_id, student_id, status, source, recorded_by, note)
        SELECT ${data.sessionId}, u.id, 'ABSENT', 'AUTO_ABSENT', ${user.id}, 'Otomatis alfa saat sesi ditutup'
        FROM users u
        WHERE u.role = 'STUDENT'
        ON CONFLICT (session_id, student_id) DO NOTHING
      `;
      await tx`
        INSERT INTO audit_logs (actor_id, action, subject_id)
        VALUES (${user.id}, 'CLOSE_ATTENDANCE_SESSION', ${data.sessionId})
      `;
      return true;
    });
    if (!closed) return NextResponse.json({ error: "Sesi sudah ditutup atau tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ ok: true });
  }

  if (data.action === "scan") {
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Khusus pengurus." }, { status: 403 });
    if (!scanAllowed(user.id)) return NextResponse.json({ error: "Pemindaian terlalu cepat. Tunggu sebentar." }, { status: 429 });

    let qr;
    try {
      qr = await verifyAttendanceToken(data.token);
    } catch {
      return NextResponse.json({ error: "QR kedaluwarsa atau tidak valid." }, { status: 400 });
    }

    const [session] = await sql`
      SELECT id, late_after, token_version
      FROM attendance_sessions
      WHERE id = ${qr.sessionId} AND closed_at IS NULL
    `;
    if (!session || session.token_version !== qr.tokenVersion) {
      return NextResponse.json({ error: "Sesi QR sudah tidak aktif." }, { status: 410 });
    }

    const [student] = await sql`
      SELECT id, full_name, username, avatar
      FROM users WHERE id = ${qr.studentId} AND role = 'STUDENT'
    `;
    if (!student) return NextResponse.json({ error: "Siswa tidak ditemukan." }, { status: 404 });

    const status = new Date() > new Date(session.late_after) ? "LATE" : "PRESENT";
    const [record] = await sql`
      INSERT INTO attendance_records (
        session_id, student_id, status, source, scanned_at, recorded_by
      ) VALUES (
        ${session.id}, ${student.id}, ${status}, 'QR', NOW(), ${user.id}
      )
      ON CONFLICT (session_id, student_id) DO NOTHING
      RETURNING id, status, scanned_at
    `;

    if (!record) {
      const [existing] = await sql`
        SELECT status, scanned_at FROM attendance_records
        WHERE session_id = ${session.id} AND student_id = ${student.id}
      `;
      return NextResponse.json({ ok: true, duplicate: true, student, record: existing });
    }

    await sql`
      INSERT INTO audit_logs (actor_id, action, subject_id)
      VALUES (${user.id}, 'SCAN_ATTENDANCE_QR', ${student.id})
    `;
    return NextResponse.json({ ok: true, duplicate: false, student, record });
  }

  if (data.action === "status") {
    if (user.role !== "ADMIN") return NextResponse.json({ error: "Khusus pengurus." }, { status: 403 });
    const [student] = await sql`SELECT id FROM users WHERE id = ${data.studentId} AND role = 'STUDENT'`;
    if (!student) return NextResponse.json({ error: "Siswa tidak ditemukan." }, { status: 404 });
    const [active] = await sql`
      SELECT id FROM attendance_sessions WHERE id = ${data.sessionId} AND closed_at IS NULL
    `;
    if (!active) return NextResponse.json({ error: "Sesi sudah ditutup atau tidak ditemukan." }, { status: 409 });

    await sql.begin(async (tx) => {
      await tx`
        INSERT INTO attendance_records (
          session_id, student_id, status, source, scanned_at, recorded_by, note
        ) VALUES (
          ${data.sessionId}, ${data.studentId}, ${data.status}, 'MANUAL',
          ${data.status === "PRESENT" || data.status === "LATE" ? sql`NOW()` : null},
          ${user.id}, ${data.note || null}
        )
        ON CONFLICT (session_id, student_id) DO UPDATE SET
          status = EXCLUDED.status,
          source = 'MANUAL',
          scanned_at = EXCLUDED.scanned_at,
          recorded_by = EXCLUDED.recorded_by,
          note = EXCLUDED.note
      `;
      await tx`
        INSERT INTO audit_logs (actor_id, action, subject_id)
        VALUES (${user.id}, ${`SET_ATTENDANCE_${data.status}`}, ${data.studentId})
      `;
    });
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
}
