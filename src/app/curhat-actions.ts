"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { sendPushToRole, sendPushToUser } from "@/lib/push-notifications";

const clean = (val: FormDataEntryValue | null) => String(val ?? "").trim();

const curhatSchema = z.object({
  content: z.string().trim().min(3, "Isi curhat minimal 3 karakter").max(5000, "Maksimal 5000 karakter"),
  urgent: z.boolean().default(false),
  isAnonymous: z.boolean().default(false),
});

export async function submitCurhatAction(formData: FormData) {
  const user = await requireUser("STUDENT");

  const parsed = curhatSchema.safeParse({
    content: clean(formData.get("content")),
    urgent: formData.get("urgent") === "on",
    isAnonymous: formData.get("isAnonymous") === "on",
  });

  if (!parsed.success) {
    const msg = encodeURIComponent(parsed.error.issues[0]?.message || "Isi curhat tidak valid");
    redirect(`/curhat?error=${msg}`);
  }

  const { content, urgent, isAnonymous } = parsed.data;

  await sql`
    INSERT INTO student_curhats (
      student_id, content, urgent, is_anonymous, status
    ) VALUES (
      ${user.id}, ${content}, ${urgent}, ${isAnonymous}, 'NEW'
    )
  `;

  // Kirim notifikasi realtime ke seluruh pengurus
  void sendPushToRole('ADMIN', {
    title: `💬 Curhat Siswa Masuk ${urgent ? '(Mendesak!)' : ''}`,
    body: isAnonymous ? 'Ada curhat baru dari siswa anonim.' : `Ada curhat baru dari ${user.fullName}.`,
    url: '/pengurus/curhat',
    tag: 'curhat-new',
  });

  revalidatePath("/curhat");
  revalidatePath("/dashboard");
  revalidatePath("/pengurus");
  revalidatePath("/pengurus/curhat");
  redirect("/curhat?success=Curhatmu+berhasil+terkirim.+Pengurus+akan+segera+membaca+dan+merespons.");
}

export async function replyCurhatAction(formData: FormData) {
  const admin = await requireUser("ADMIN");
  const curhatId = clean(formData.get("curhatId"));
  const reply = clean(formData.get("reply"));
  const statusInput = clean(formData.get("status"));
  const status = statusInput === "IN_PROGRESS" ? "IN_PROGRESS" : reply ? "DONE" : "NEW";

  if (!curhatId || !z.string().uuid().safeParse(curhatId).success) {
    redirect("/pengurus/curhat?error=ID+curhat+tidak+valid");
  }
  if (reply.length > 5000) {
    redirect("/pengurus/curhat?error=Tanggapan+maksimal+5000+karakter");
  }

  await sql.begin(async (tx) => {
    await tx`
      UPDATE student_curhats
      SET
        reply = ${reply || null},
        replied_by = ${admin.id},
        replied_at = ${reply ? sql`NOW()` : null},
        status = ${status}::report_status
      WHERE id = ${curhatId}
    `;

    await tx`
      INSERT INTO audit_logs (actor_id, action, subject_id)
      VALUES (${admin.id}, 'REPLY_CURHAT', ${curhatId})
    `;
  });

  // Kirim notifikasi realtime ke siswa pemilik curhat
  void (async () => {
    try {
      const [curhat] = await sql`
        SELECT student_id FROM student_curhats WHERE id = ${curhatId} LIMIT 1
      `;
      if (curhat?.student_id) {
        await sendPushToUser(curhat.student_id, {
          title: '💬 Tanggapan Curhat Diterima',
          body: 'Pengurus kelas telah menanggapi curhatmu. Ketuk untuk membaca solusinya.',
          url: '/curhat',
          tag: `curhat-${curhatId}`,
        });
      }
    } catch (err) {
      console.error('Error sending curhat reply push:', err);
    }
  })();

  revalidatePath("/curhat");
  revalidatePath("/dashboard");
  revalidatePath("/pengurus");
  revalidatePath("/pengurus/curhat");
  redirect(`/pengurus/curhat?success=Tanggapan+berhasil+disimpan`);
}

export async function deleteCurhatAction(formData: FormData) {
  const user = await requireUser();
  const curhatId = clean(formData.get("curhatId"));

  if (!curhatId || !z.string().uuid().safeParse(curhatId).success) {
    redirect(user.role === "ADMIN" ? "/pengurus/curhat" : "/curhat");
  }

  if (user.role === "ADMIN") {
    await sql`DELETE FROM student_curhats WHERE id = ${curhatId}`;
    await sql`INSERT INTO audit_logs (actor_id, action, subject_id) VALUES (${user.id}, 'DELETE_CURHAT', ${curhatId})`;
    revalidatePath("/pengurus/curhat");
    revalidatePath("/pengurus");
    redirect("/pengurus/curhat?success=Curhat+berhasil+dihapus");
  } else {
    // Siswa hanya bisa hapus curhat miliknya sendiri jika status masih NEW
    await sql`DELETE FROM student_curhats WHERE id = ${curhatId} AND student_id = ${user.id} AND status = 'NEW'`;
    revalidatePath("/curhat");
    revalidatePath("/dashboard");
    redirect("/curhat?success=Curhat+berhasil+dibatalkan");
  }
}
