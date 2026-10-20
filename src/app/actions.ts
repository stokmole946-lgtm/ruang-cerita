"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createSession, destroySession, getSession, requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { currentPeriod } from "@/lib/time";

const clean = (value: FormDataEntryValue | null) => String(value ?? "").trim();

function safeInternalRedirect(path: string | null | undefined, fallback: string): string {
  if (!path) return fallback;
  const trimmed = path.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    trimmed.includes("://") ||
    trimmed.includes("\r") ||
    trimmed.includes("\n")
  ) {
    return fallback;
  }
  if (!/^\/[a-zA-Z0-9_\-\/]*(\?[a-zA-Z0-9_=&%\-]*)?$/.test(trimmed)) {
    return fallback;
  }
  return trimmed;
}

interface LoginAttempt {
  count: number;
  blockedUntil: number;
  lastAttempt: number;
}
const loginAttempts = new Map<string, LoginAttempt>();
const MAX_LOGIN_MAP_SIZE = 1000;
const DUMMY_HASH = "$2b$12$e80yqVb8YjFpG9Kx.kYJqu1rA6L7x4Z3yN8P0Q5R9T1U2V3W4X5Y6";

function isLoginBlocked(username: string): boolean {
  const record = loginAttempts.get(username);
  if (!record) return false;
  if (Date.now() < record.blockedUntil) return true;
  if (Date.now() > record.blockedUntil && record.blockedUntil > 0) {
    loginAttempts.delete(username);
    return false;
  }
  return false;
}

function registerFailedLogin(username: string) {
  if (loginAttempts.size >= MAX_LOGIN_MAP_SIZE) {
    const oldestKey = loginAttempts.keys().next().value;
    if (oldestKey) loginAttempts.delete(oldestKey);
  }
  const record = loginAttempts.get(username) || { count: 0, blockedUntil: 0, lastAttempt: Date.now() };
  record.count += 1;
  record.lastAttempt = Date.now();
  if (record.count >= 5) {
    record.blockedUntil = Date.now() + 2 * 60 * 1000; // 2 menit lockout
  }
  loginAttempts.set(username, record);
}

function resetLoginAttempts(username: string) {
  loginAttempts.delete(username);
}

export async function loginAction(formData: FormData) {
  const username = clean(formData.get("username")).toLowerCase();
  const password = clean(formData.get("password"));
  if (!username || !password) redirect("/login?error=Lengkapi+username+dan+password");

  if (isLoginBlocked(username)) {
    redirect("/login?error=Terlalu+banyak+percobaan+gagal.+Tunggu+2+menit.");
  }

  const rows = await sql`SELECT * FROM users WHERE lower(username) = ${username} LIMIT 1`;
  const user = rows[0];

  // Constant-time comparison using dummy hash if user doesn't exist
  const passwordMatch = await bcrypt.compare(password, user ? user.password_hash : DUMMY_HASH);

  if (!user || !passwordMatch) {
    registerFailedLogin(username);
    const attempt = loginAttempts.get(username);
    const delay = Math.min((attempt?.count || 1) * 200 + 150, 2000);
    await new Promise((r) => setTimeout(r, delay));
    redirect("/login?error=Username+atau+password+salah");
  }

  resetLoginAttempts(username);

  await createSession({
    id: user.id,
    username: user.username,
    fullName: user.full_name,
    role: user.role,
    mustChangePassword: user.must_change_password,
  });
  redirect(user.role === "ADMIN" ? "/pengurus" : "/dashboard");
}

export async function logoutAction() {
  await destroySession();
  redirect("/login");
}

export async function changePasswordAction(formData: FormData) {
  const user = await getSession();
  if (!user) redirect("/login");
  const rawFrom = clean(formData.get("from"));
  const back = safeInternalRedirect(rawFrom === "ganti-password" ? "/ganti-password" : rawFrom, "/profil");
  const password = clean(formData.get("password"));
  const confirmation = clean(formData.get("confirmation"));
  if (password.length < 8) redirect(`${back}?error=Password+minimal+8+karakter`);
  if (password.length > 128) redirect(`${back}?error=Password+maksimal+128+karakter`);
  if (password === "123") redirect(`${back}?error=Gunakan+password+baru`);
  if (password !== confirmation) redirect(`${back}?error=Konfirmasi+password+tidak+sama`);
  const hash = await bcrypt.hash(password, 12);
  await sql`UPDATE users SET password_hash = ${hash}, must_change_password = FALSE WHERE id = ${user.id}`;
  await createSession({ ...user, mustChangePassword: false });
  await sql`INSERT INTO audit_logs (actor_id, action, subject_id) VALUES (${user.id}, 'CHANGE_PASSWORD', ${user.id})`;
  redirect(`${back}?success=Password+berhasil+diganti`);
}

export async function updateContactAction(formData: FormData) {
  const user = await getSession();
  if (!user) redirect("/login");
  const whatsapp = clean(formData.get("whatsapp")).replace(/[^0-9]/g, "").slice(0, 20);
  await sql`UPDATE users SET whatsapp = ${whatsapp || null} WHERE id = ${user.id}`;
  revalidatePath("/profil");
  redirect("/profil?success=Kontak+WhatsApp+berhasil+disimpan");
}

export async function updateAvatarAction(formData: FormData) {
  const user = await getSession();
  if (!user) redirect("/login");
  const avatar = clean(formData.get("avatar"));
  const rawFrom = clean(formData.get("from"));
  const from = safeInternalRedirect(rawFrom, "/dashboard");

  if (avatar) {
    if (avatar.length > 1_500_000 || !/^data:image\/(jpeg|png|webp|gif|jpg);base64,/i.test(avatar)) {
      redirect(`${from}?error=Format+atau+ukuran+foto+profil+tidak+valid`);
    }
  }

  await sql`UPDATE users SET avatar = ${avatar || null} WHERE id = ${user.id}`;
  revalidatePath("/dashboard");
  revalidatePath("/profil");
  revalidatePath("/pengurus");
  revalidatePath("/chat");
  redirect(`${from}?success=Foto+profil+berhasil+diperbarui`);
}

const reportSchema = z.object({
  complaint: z.string().trim().min(3).max(3000),
  message: z.string().trim().min(3).max(3000),
  impression: z.string().trim().min(3).max(3000),
  suggestion: z.string().trim().min(3).max(3000),
  recipientId: z.string().uuid(),
});

export async function submitReportAction(formData: FormData) {
  const user = await requireUser("STUDENT");
  const parsed = reportSchema.safeParse({
    complaint: clean(formData.get("complaint")),
    message: clean(formData.get("message")),
    impression: clean(formData.get("impression")),
    suggestion: clean(formData.get("suggestion")),
    recipientId: clean(formData.get("recipientId")),
  });
  if (!parsed.success) redirect("/cerita-baru?error=Lengkapi+semua+bagian+minimal+3+karakter");
  const { complaint, message, impression, suggestion, recipientId } = parsed.data;

  if (recipientId === user.id) {
    redirect("/cerita-baru?error=Penerima+pesan+tidak+boleh+diri+sendiri");
  }

  const [validRecipient] = await sql`
    SELECT id FROM users WHERE id = ${recipientId} AND role = 'STUDENT' LIMIT 1
  `;
  if (!validRecipient) {
    redirect("/cerita-baru?error=Penerima+pesan+tidak+valid");
  }

  const urgent = formData.get("urgent") === "on";
  const revealSender = formData.get("revealSender") === "on";
  try {
    await sql`
      INSERT INTO monthly_reports (
        student_id, period, complaint, message, impression, suggestion,
        recipient_id, reveal_sender, urgent
      ) VALUES (
        ${user.id}, ${currentPeriod()}, ${complaint}, ${message}, ${impression}, ${suggestion},
        ${recipientId}, ${revealSender}, ${urgent}
      )
    `;
  } catch (error) {
    if (String(error).includes("monthly_reports_student_id_period_key")) {
      redirect("/dashboard?error=Laporan+bulan+ini+sudah+dikirim");
    }
    throw error;
  }
  revalidatePath("/dashboard");
  redirect("/dashboard?success=Cerita+bulan+ini+berhasil+dikirim");
}

export async function replyReportAction(formData: FormData) {
  const admin = await requireUser("ADMIN");
  const reportId = clean(formData.get("reportId"));
  if (!z.string().uuid().safeParse(reportId).success) {
    redirect("/pengurus?error=ID+laporan+tidak+valid");
  }
  const complaintReply = clean(formData.get("complaintReply")).slice(0, 3000);
  const impressionReply = clean(formData.get("impressionReply")).slice(0, 3000);
  const suggestionReply = clean(formData.get("suggestionReply")).slice(0, 3000);
  const messageNote = clean(formData.get("messageNote")).slice(0, 1000);
  const forward = formData.get("forward") === "on";
  const complete = complaintReply && impressionReply && suggestionReply && forward;
  await sql.begin(async (tx) => {
    const [updated] = await tx`
      UPDATE monthly_reports SET
        complaint_reply = ${complaintReply || null}, impression_reply = ${impressionReply || null},
        suggestion_reply = ${suggestionReply || null}, message_note = ${messageNote || null},
        forwarded_at = CASE WHEN ${forward} THEN COALESCE(forwarded_at, NOW()) ELSE forwarded_at END,
        responded_at = CASE WHEN ${Boolean(complete)} THEN NOW() ELSE responded_at END,
        status = ${complete ? "DONE" : "IN_PROGRESS"}::report_status
      WHERE id = ${reportId}
      RETURNING id
    `;
    if (updated) {
      await tx`INSERT INTO audit_logs (actor_id, action, subject_id) VALUES (${admin.id}, 'RESPOND_REPORT', ${reportId})`;
    }
  });
  revalidatePath("/pengurus");
  redirect(`/pengurus/laporan/${reportId}?success=Tanggapan+berhasil+disimpan`);
}

export async function updateStudentAction(formData: FormData) {
  const admin = await requireUser("ADMIN");
  const studentId = clean(formData.get("studentId"));
  if (!z.string().uuid().safeParse(studentId).success) {
    redirect("/pengurus/siswa?error=ID+siswa+tidak+valid");
  }
  const email = clean(formData.get("email")).slice(0, 100);
  const reset = formData.get("reset") === "true";
  if (email && !z.string().email().safeParse(email).success) redirect("/pengurus/siswa?error=Format+email+tidak+valid");
  if (reset) {
    const hash = await bcrypt.hash("123", 12);
    await sql`UPDATE users SET password_hash = ${hash}, must_change_password = TRUE WHERE id = ${studentId} AND role = 'STUDENT'`;
    await sql`INSERT INTO audit_logs (actor_id, action, subject_id) VALUES (${admin.id}, 'RESET_PASSWORD', ${studentId})`;
  } else {
    await sql`UPDATE users SET email = ${email || null} WHERE id = ${studentId} AND role = 'STUDENT'`;
  }
  revalidatePath("/pengurus/siswa");
  redirect("/pengurus/siswa?success=Data+siswa+berhasil+diperbarui");
}
