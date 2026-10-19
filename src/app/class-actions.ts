"use server";
import { z } from "zod";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
const schema=z.object({id:z.union([z.literal(""),z.string().uuid()]),kind:z.enum(["event","announcement"]),title:z.string().trim().min(3).max(120),content:z.string().trim().min(3).max(5000),category:z.enum(["Tugas","Ujian","Kegiatan","Info kelas"]),starts:z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/),ends:z.string().regex(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/)});
export async function saveClassPost(form:FormData) {
 const admin=await requireUser("ADMIN"); const data=schema.safeParse(Object.fromEntries(form));
 if(!data.success) redirect("/pengurus/kelas?error=Periksa+judul,+isi,+dan+tanggal");
 const d=data.data; const start=new Date(d.starts+":00+07:00"); const end=new Date(d.ends+":00+07:00");
 if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||end<start) redirect("/pengurus/kelas?error=Tanggal+selesai+harus+setelah+tanggal+mulai");
 await sql.begin(async tx=>{ if(d.id) await tx`UPDATE class_posts SET title=${d.title},content=${d.content},category=${d.category},starts_at=${start},ends_at=${end} WHERE id=${d.id} AND kind=${d.kind}`; else await tx`INSERT INTO class_posts(kind,title,content,category,starts_at,ends_at,created_by) VALUES(${d.kind},${d.title},${d.content},${d.category},${start},${end},${admin.id})`; await tx`INSERT INTO audit_logs(actor_id,action) VALUES(${admin.id},'SAVE_CLASS_POST')`; });
 for(const path of ["/dashboard","/pengurus","/kalender","/pengumuman"]) revalidatePath(path);
 redirect(d.kind==="event"?"/kalender":"/pengumuman");
}
export async function deleteClassPost(form:FormData) { const admin=await requireUser("ADMIN"); const id=z.string().uuid().parse(form.get("id")); await sql.begin(async tx=>{await tx`DELETE FROM class_posts WHERE id=${id}`;await tx`INSERT INTO audit_logs(actor_id,action,subject_id) VALUES(${admin.id},'DELETE_CLASS_POST',${id})`;}); revalidatePath("/dashboard"); revalidatePath("/kalender"); revalidatePath("/pengumuman"); redirect("/pengumuman"); }
