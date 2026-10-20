import Link from "next/link";
import { ArrowUpRight, CheckCircle, Clock } from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatDate, periodLabel } from "@/lib/time";

export default async function HistoryPage() {
  const user = await requireUser("STUDENT");
  const reports = await sql`
    SELECT r.*, u.full_name AS recipient_name
    FROM monthly_reports r
    JOIN users u ON u.id = r.recipient_id
    WHERE r.student_id = ${user.id}
    ORDER BY r.period DESC
  `;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="page-title">Riwayat ceritamu.</h1>
          <p className="text-sm text-[#555951]">
            Catatan keluh, pesan, kesan, dan saran yang pernah kamu kirimkan.
          </p>
        </div>
        <Link href="/cerita-baru" className="btn-primary">
          Tulis cerita baru <ArrowUpRight size={18} weight="bold" />
        </Link>
      </header>

      <div className="space-y-5">
        {reports.length ? (
          reports.map((r) => {
            const isDone = r.status === "DONE";
            const isInProgress = r.status === "IN_PROGRESS";
            const statusLabel = isDone ? "Selesai ditanggapi" : isInProgress ? "Sedang ditangani" : "Menunggu dibaca";
            const statusBadgeColor = isDone ? "!bg-[#b9e2ce]" : isInProgress ? "!bg-[#ffdb59]" : "!bg-stone-200";

            return (
              <article key={r.id} className="panel p-6 space-y-5">
                <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#20201e] pb-4">
                  <div>
                    <span className={`badge ${statusBadgeColor}`}>
                      {isDone ? <CheckCircle size={16} weight="fill" /> : <Clock size={16} weight="bold" />}
                      {statusLabel}
                    </span>
                    <h2 className="text-2xl font-extrabold mt-2">
                      Laporan {periodLabel(String(r.period).slice(0, 10))}
                    </h2>
                    <p className="text-xs text-[#555951] mt-1">
                      Dikirim pada {formatDate(r.created_at)}
                    </p>
                  </div>
                  {r.urgent ? (
                    <span className="badge !bg-[#ffa18b]">Prioritas tinggi</span>
                  ) : null}
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="border-2 border-[#20201e] rounded-[8px] p-4 bg-[#ffa18b]/30">
                    <span className="badge !bg-[#ffa18b]">1. Keluh</span>
                    <p className="mt-3 text-sm leading-6 whitespace-pre-wrap">{r.complaint}</p>
                    {r.complaint_reply ? (
                      <div className="mt-4 pt-3 border-t-2 border-[#20201e]/30 bg-white/70 p-3 rounded-[6px]">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#345bdc]">Tanggapan Pengurus:</p>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{r.complaint_reply}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-[#555951] mt-3 italic">Belum ada tanggapan pengurus.</p>
                    )}
                  </div>

                  <div className="border-2 border-[#20201e] rounded-[8px] p-4 bg-[#c5d3ff]/40">
                    <span className="badge !bg-[#c5d3ff]">2. Pesan</span>
                    <p className="mt-1 text-xs text-[#555951]">
                      Untuk: <strong>{r.recipient_name}</strong> ({r.reveal_sender ? "Nama dicantumkan" : "Dirahasiakan"})
                    </p>
                    <p className="mt-3 text-sm leading-6 whitespace-pre-wrap">{r.message}</p>
                    {r.forwarded_at ? (
                      <p className="text-xs font-bold text-[#113a27] mt-3 bg-[#b9e2ce] p-2 border border-[#20201e] rounded-[4px]">
                        <CheckCircle size={16} className="inline mr-1" aria-hidden="true" /> Pesan sudah diteruskan ke penerima.
                      </p>
                    ) : (
                      <p className="text-xs text-[#555951] mt-3 italic">Menunggu verifikasi pengurus untuk diteruskan.</p>
                    )}
                    {r.message_note ? (
                      <div className="mt-3 pt-2 border-t border-[#20201e]/20 text-xs">
                        <span className="font-bold">Catatan:</span> {r.message_note}
                      </div>
                    ) : null}
                  </div>

                  <div className="border-2 border-[#20201e] rounded-[8px] p-4 bg-[#b9e2ce]/30">
                    <span className="badge !bg-[#b9e2ce]">3. Kesan</span>
                    <p className="mt-3 text-sm leading-6 whitespace-pre-wrap">{r.impression}</p>
                    {r.impression_reply ? (
                      <div className="mt-4 pt-3 border-t-2 border-[#20201e]/30 bg-white/70 p-3 rounded-[6px]">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#345bdc]">Tanggapan Pengurus:</p>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{r.impression_reply}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-[#555951] mt-3 italic">Belum ada tanggapan pengurus.</p>
                    )}
                  </div>

                  <div className="border-2 border-[#20201e] rounded-[8px] p-4 bg-[#ffdb59]/30">
                    <span className="badge !bg-[#ffdb59]">4. Saran</span>
                    <p className="mt-3 text-sm leading-6 whitespace-pre-wrap">{r.suggestion}</p>
                    {r.suggestion_reply ? (
                      <div className="mt-4 pt-3 border-t-2 border-[#20201e]/30 bg-white/70 p-3 rounded-[6px]">
                        <p className="text-xs font-bold uppercase tracking-wider text-[#345bdc]">Tanggapan Pengurus:</p>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{r.suggestion_reply}</p>
                      </div>
                    ) : (
                      <p className="text-xs text-[#555951] mt-3 italic">Belum ada tanggapan pengurus.</p>
                    )}
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <section className="panel p-8 text-center">
            <h2 className="text-2xl font-bold">Belum ada riwayat cerita.</h2>
            <p className="empty">
              Cerita yang kamu kirimkan setiap bulan akan tersimpan di sini beserta solusi atau tanggapan dari pengurus.
            </p>
            <Link href="/cerita-baru" className="btn-primary mt-4">
              Mulai isi cerita sekarang →
            </Link>
          </section>
        )}
      </div>
    </div>
  );
}
