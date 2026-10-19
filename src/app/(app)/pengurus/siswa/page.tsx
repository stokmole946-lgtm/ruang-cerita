import { Check, EnvelopeSimple, MagnifyingGlass, Warning } from "@phosphor-icons/react/dist/ssr";
import { updateStudentAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { currentPeriod, periodLabel } from "@/lib/time";
import { ResetButton } from "./reset-button";

export default async function StudentsPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string; q?: string; status?: string }>;
}) {
  await requireUser("ADMIN");
  const params = await searchParams;
  const q = params.q ? `%${params.q.trim().toLowerCase()}%` : null;

  const students = await sql`
    SELECT u.id, u.full_name, u.username, u.email, u.must_change_password,
      (r.id IS NOT NULL) AS submitted,
      r.status AS report_status
    FROM users u
    LEFT JOIN monthly_reports r ON r.student_id = u.id AND r.period = ${currentPeriod()}
    WHERE u.role = 'STUDENT'
      AND (${q}::text IS NULL OR lower(u.full_name) LIKE ${q} OR lower(u.username) LIKE ${q})
      AND (
        ${params.status ?? "ALL"} = 'ALL'
        OR (${params.status === "DONE"} AND r.id IS NOT NULL)
        OR (${params.status === "PENDING"} AND r.id IS NULL)
      )
    ORDER BY u.full_name
  `;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="badge !bg-[#ffdb59] mb-2">{periodLabel()} · 32 Siswa</span>
          <h1 className="page-title">Kelola siswa.</h1>
          <p className="text-sm text-[#555951]">
            Daftar siswa kelas X SIJA B, status pengisian bulan ini, email notifikasi, dan reset password.
          </p>
        </div>
      </header>

      <Notice success={params.success} error={params.error} />

      <section className="panel p-5 space-y-4">
        {/* Search & Filter */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#20201e] pb-4">
          <form method="GET" className="flex items-center gap-2">
            <input
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Cari nama atau username..."
              className="field !py-1.5 !px-3 text-sm w-64"
            />
            {params.status ? <input type="hidden" name="status" value={params.status} /> : null}
            <button className="btn-secondary !min-h-[42px] !py-1 text-xs">
              <MagnifyingGlass size={16} weight="bold" /> Cari
            </button>
          </form>

          <div className="flex items-center gap-2 text-xs font-bold">
            <span>Status:</span>
            {[
              ["Semua", "ALL"],
              ["Sudah isi", "DONE"],
              ["Belum isi", "PENDING"],
            ].map(([label, val]) => (
              <a
                key={val}
                href={`/pengurus/siswa?status=${val}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}`}
                className={`border-2 border-[#20201e] px-3 py-1.5 rounded-[5px] ${
                  (!params.status && val === "ALL") || params.status === val
                    ? "bg-[#345bdc] text-white shadow-[2px_2px_0_#20201e]"
                    : "bg-white hover:bg-stone-100"
                }`}
              >
                {label}
              </a>
            ))}
          </div>
        </div>

        {/* Students List */}
        <div className="space-y-3">
          {students.length ? (
            students.map((student) => (
              <article
                key={student.id}
                className="border-2 border-[#20201e] rounded-[8px] p-4 bg-white flex flex-col lg:flex-row lg:items-center justify-between gap-4 shadow-[2px_2px_0_#20201e]"
              >
                <div className="space-y-1 min-w-[220px]">
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-base">{student.full_name}</span>
                    {student.submitted ? (
                      <span className="badge !bg-[#b9e2ce] text-[10px] py-0.5">
                        <Check size={12} weight="bold" /> Sudah Isi
                      </span>
                    ) : (
                      <span className="badge !bg-[#ffa18b] text-[10px] py-0.5">
                        <Warning size={12} weight="bold" /> Belum Isi
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-[#555951]">
                    Username: <code className="bg-[#eeeee5] px-1 py-0.5 rounded font-bold">@{student.username}</code>
                    {" · "}
                    {student.must_change_password ? (
                      <span className="text-[#a54c15]">Password bawaan (123)</span>
                    ) : (
                      <span className="text-[#113a27]">Password aktif</span>
                    )}
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  {/* Email update form */}
                  <form action={updateStudentAction} className="flex items-center gap-2">
                    <input type="hidden" name="studentId" value={student.id} />
                    <div className="relative">
                      <EnvelopeSimple size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555951]" />
                      <input
                        name="email"
                        type="email"
                        defaultValue={student.email ?? ""}
                        placeholder="email siswa..."
                        className="field !py-1.5 pl-8 text-xs w-48 sm:w-56"
                      />
                    </div>
                    <button className="btn-secondary !min-h-[38px] !py-1 !px-3 text-xs" type="submit">
                      Simpan
                    </button>
                  </form>

                  {/* Password reset form */}
                  <form action={updateStudentAction}>
                    <input type="hidden" name="studentId" value={student.id} />
                    <input type="hidden" name="reset" value="true" />
                    <ResetButton studentName={student.full_name} />
                  </form>
                </div>
              </article>
            ))
          ) : (
            <p className="empty text-center py-8">Tidak ada siswa yang cocok dengan filter atau pencarian.</p>
          )}
        </div>
      </section>
    </div>
  );
}
