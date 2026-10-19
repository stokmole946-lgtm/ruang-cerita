import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { currentPeriod,periodLabel } from "@/lib/time";
import { StoryWizard } from "@/components/story-wizard";
import { Notice } from "@/components/notice";
export default async function NewStory({searchParams}:{searchParams:Promise<{error?:string}>}){const u=await requireUser("STUDENT");const existing=await sql`SELECT id FROM monthly_reports WHERE student_id=${u.id} AND period=${currentPeriod()}`;if(existing.length)redirect("/riwayat");const students=await sql`SELECT id,full_name FROM users WHERE role='STUDENT' AND id!=${u.id} ORDER BY full_name`;const p=await searchParams;return <div className="max-w-3xl space-y-6"><header><h1 className="page-title">Pelan-pelan, cerita aja.</h1><p>{periodLabel()} · Empat bagian. Satu ruang untuk didengar.</p></header><Notice error={p.error}/><StoryWizard students={students.map(s=>({id:s.id,full_name:s.full_name}))}/></div>;}
