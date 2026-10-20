import Link from "next/link";
import { ArrowUpRight, Funnel, MagnifyingGlass, Siren } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { currentPeriod, formatDate, periodLabel } from "@/lib/time";

export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; q?: string }>;
}) {
  await requireUser("ADMIN");
  const params = await searchParams;
  const q = params.q ? `%${params.q.trim().toLowerCase()}%` : null;

  const reports = await sql`
    SELECT r.id, r.period, r.created_at, r.urgent, r.status, r.forwarded_at,
      r.complaint_reply IS NOT NULL AS has_complaint_reply,
      r.impression_reply IS NOT NULL AS has_impression_reply,
      r.suggestion_reply IS NOT NULL AS has_suggestion_reply,
      u.full_name, u.username
    FROM monthly_reports r
    JOIN users u ON u.id = r.student_id
    WHERE r.period = ${currentPeriod()}
      AND (${params.priority === "true"} = FALSE OR r.urgent = TRUE)
      AND (${params.status ?? "ALL"} = 'ALL' OR r.status::text = ${params.status ?? "ALL"})
      AND (${q}::text IS NULL OR lower(u.full_name) LIKE ${q} OR lower(u.username) LIKE ${q})
    ORDER BY r.urgent DESC, CASE r.status WHEN 'NEW' THEN 0 WHEN 'IN_PROGRESS' THEN 1 ELSE 2 END, r.created_at DESC
  `;

  const filters = [
    ["Semua", "ALL"],
    ["Baru", "NEW"],
    ["Ditangani", "IN_PROGRESS"],
    ["Selesai", "DONE"],
  ] as const;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <span className="badge !bg-[#ffdb59] mb-2">{periodLabel()}</span>
          <h1 className="page-title">Antrean laporan.</h1>
          <p className="text-sm text-[#555951]">
            Kelola dan berikan tanggapan untuk setiap bagian cerita siswa.
          </p>
        </div>
      </header>

      {/* Filters and Search Bar */}
      <section className="panel p-4 sm:p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="flex items-center gap-1.5 text-xs font-bold mr-1">
              <Funnel size={16} weight="bold" /> Filter:
            </span>
            {filters.map(([label, value]) => {
              const isActive = (!params.status && value === "ALL") || params.status === value;
              return (
                <Link
                  key={value}
                  href={`/pengurus/laporan?status=${value}${params.priority ? "&priority=true" : ""}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}`}
                  className={`border-2 border-[#20201e] px-3.5 py-1.5 rounded-[6px] text-xs font-extrabold transition ${
                    isActive ? "bg-[#345bdc] text-white shadow-[2px_2px_0_#20201e]" : "bg-[#fffef9] hover:bg-[#f2eee1]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            <Link
              href={`/pengurus/laporan?priority=${params.priority === "true" ? "false" : "true"}${params.status ? `&status=${params.status}` : ""}`}
              className={`border-2 border-[#20201e] px-3.5 py-1.5 rounded-[6px] text-xs font-extrabold flex items-center gap-1.5 ${
                params.priority === "true" ? "bg-[#ffa18b] text-[#481c17] shadow-[2px_2px_0_#20201e]" : "bg-[#fffef9]"
              }`}
            >
              <Siren size={15} weight="bold" />
              Prioritas
            </Link>
          </div>

          <form method="GET" className="flex items-center gap-2">
            <input
              type="text"
              name="q"
              defaultValue={params.q ?? ""}
              placeholder="Cari nama siswa..."
              className="field !py-1.5 !px-3 text-xs w-48"
            />
            {params.status ? <input type="hidden" name="status" value={params.status} /> : null}
            <button className="btn-secondary !min-h-[38px] !py-1 !px-3 text-xs">
              <MagnifyingGlass size={16} weight="bold" />
            </button>
          </form>
        </div>

        {/* Reports List */}
        <div className="space-y-3 pt-2">
          {reports.length ? (
            reports.map((report) => {
              const answeredCount =
                (report.has_complaint_reply ? 1 : 0) +
                (report.has_impression_reply ? 1 : 0) +
                (report.has_suggestion_reply ? 1 : 0) +
                (report.forwarded_at ? 1 : 0);

              return (
                <div
                  key={report.id}
                  className={`border-2 border-[#20201e] rounded-[10px] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition shadow-[3px_3px_0_#20201e] ${
                    report.urgent ? "bg-[#ffa18b]/30" : "bg-white"
                  }`}
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-base font-extrabold">{report.full_name}</span>
                      <span className="text-xs text-[#555951]">@{report.username}</span>
                      {report.urgent ? (
                        <span className="badge !bg-[#ffa18b] text-[10px] py-0.5">PRIORITAS</span>
                      ) : null}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-[#555951]">
                      <span>Dikirim: {formatDate(report.created_at)}</span>
                      <span>·</span>
                      <span className="font-bold">
                        {answeredCount}/4 bagian ditangani
                      </span>
                      {report.forwarded_at ? (
                        <span className="text-[#113a27] font-bold">Pesan diteruskan</span>
                      ) : (
                        <span className="text-[#a54c15]">Pesan belum diteruskan</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <span
                      className={`badge text-xs ${
                        report.status === "DONE"
                          ? "!bg-[#b9e2ce]"
                          : report.status === "IN_PROGRESS"
                          ? "!bg-[#ffdb59]"
                          : "!bg-stone-200"
                      }`}
                    >
                      {report.status === "DONE" ? "Selesai" : report.status === "IN_PROGRESS" ? "Ditangani" : "Baru"}
                    </span>
                    <Link
                      href={`/pengurus/laporan/${report.id}`}
                      className="btn-primary !min-h-[38px] !py-1.5 !px-3.5 text-xs"
                    >
                      Buka & Tanggapi <ArrowUpRight size={15} weight="bold" />
                    </Link>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="empty text-center py-10">
              Tidak ada laporan pada filter ini.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
