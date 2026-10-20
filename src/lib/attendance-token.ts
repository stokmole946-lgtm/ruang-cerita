import { createHash } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";
import { sql } from "@/lib/db";

const issuer = "ruang-cerita";
const audience = "attendance-scan";

async function encryptionKey() {
  let source = process.env.ATTENDANCE_QR_SECRET;
  if (!source) {
    const [stored] = await sql`
      SELECT secret FROM app_secrets WHERE name = 'attendance_qr'
    `;
    source = stored?.secret;
  }
  if (!source) throw new Error("Secret QR absensi belum tersedia");
  return createHash("sha256").update(source).digest();
}

export interface AttendanceQrPayload {
  studentId: string;
  sessionId: string;
  tokenVersion: string;
}

export async function createAttendanceToken(payload: AttendanceQrPayload) {
  return new EncryptJWT({
    sid: payload.studentId,
    ses: payload.sessionId,
    ver: payload.tokenVersion,
  })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM", typ: "JWT" })
    .setIssuer(issuer)
    .setAudience(audience)
    .setJti(crypto.randomUUID())
    .setIssuedAt()
    .setExpirationTime("12s")
    .encrypt(await encryptionKey());
}

export async function verifyAttendanceToken(token: string): Promise<AttendanceQrPayload> {
  const { payload } = await jwtDecrypt(token, await encryptionKey(), {
    issuer,
    audience,
    clockTolerance: 1,
  });

  if (
    typeof payload.sid !== "string" ||
    typeof payload.ses !== "string" ||
    typeof payload.ver !== "string"
  ) {
    throw new Error("Payload QR tidak valid");
  }

  return {
    studentId: payload.sid,
    sessionId: payload.ses,
    tokenVersion: payload.ver,
  };
}
