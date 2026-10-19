"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getTodayPiketInfo } from "@/lib/piket";

const clean = (val: FormDataEntryValue | null) => String(val ?? "").trim();

const piketUploadSchema = z.object({
  photoData: z.string().min(10, "Foto dokumentasi wajib disertakan"),
  note: z.string().max(500, "Catatan maksimal 500 karakter").optional(),
});

export async function uploadPiketPhotoAction(formData: FormData) {
  const user = await requireUser();
  const rawPhoto = clean(formData.get("photoData"));
  const rawNote = clean(formData.get("note"));

  const parsed = piketUploadSchema.safeParse({
    photoData: rawPhoto,
    note: rawNote,
  });

  if (!parsed.success) {
    const msg = encodeURIComponent(parsed.error.issues[0]?.message || "Format foto tidak valid");
    redirect(`/piket?error=${msg}`);
  }

  const { photoData, note } = parsed.data;

  // Pastikan data adalah data URI gambar
  if (!photoData.startsWith("data:image/")) {
    redirect("/piket?error=Foto+harus+berupa+format+gambar+valid");
  }

  const info = getTodayPiketInfo();
  const dayName = info.schedule.dayName;
  const piketDate = info.todayDateISO;

  await sql`
    INSERT INTO piket_logs (
      piket_date, day_name, photo_url, note, uploaded_by
    ) VALUES (
      ${piketDate}::date, ${dayName}, ${photoData}, ${note || null}, ${user.id}
    )
  `;

  await sql`
    INSERT INTO audit_logs (actor_id, action)
    VALUES (${user.id}, 'UPLOAD_PIKET_PHOTO')
  `;

  revalidatePath("/piket");
  revalidatePath("/dashboard");
  revalidatePath("/pengurus");
  redirect("/piket?success=Dokumentasi+piket+hari+ini+berhasil+diunggah!");
}

export async function deletePiketPhotoAction(formData: FormData) {
  const user = await requireUser();
  const logId = clean(formData.get("logId"));

  if (!logId) {
    redirect("/piket");
  }

  if (user.role === "ADMIN") {
    await sql`DELETE FROM piket_logs WHERE id = ${logId}`;
  } else {
    // Siswa hanya bisa menghapus foto yang ia unggah sendiri
    await sql`DELETE FROM piket_logs WHERE id = ${logId} AND uploaded_by = ${user.id}`;
  }

  revalidatePath("/piket");
  revalidatePath("/dashboard");
  revalidatePath("/pengurus");
  redirect("/piket?success=Foto+dokumentasi+berhasil+dihapus");
}
