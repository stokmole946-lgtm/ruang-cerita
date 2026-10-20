import Link from "next/link";
import { notFound } from "next/navigation";
import { CheckCircle, PaperPlaneTilt, Siren } from "@phosphor-icons/react/dist/ssr";
import { replyReportAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatDate, periodLabel } from "@/lib/time";

export default async function ReportDetail({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ success?: string }>;
}) {
  await requireUser("ADMIN");
  const { id } = await params;
  const query = await searchParams;

  const rows = await sql`
    SELECT r.*, u.full_name, u.username, target.full_name AS recipient_name
    FROM monthly_reports r
    JOIN users u ON u.id = r.student_id
    JOIN users target ON target.id = r.recipient_id
    WHERE r.id = ${id}
    LIMIT 1
  `;
  const report = rows[0];
  if (!report) notFound();

  const entries = [
    {
      label: "1. Keluh",
      bg: "bg-[#ffa18b]/30",
      badgeBg: "!bg-[#ffa18b]",
      content: report.complaint,
      fieldName: "complaintReply",
      currentReply: report.complaint_reply,
      placeholder: "Tuliskan solusi atau dukungan nyata untuk keluhan siswa ini...",
    },
    {
      label: "3. Kesan",
      bg: "bg-[#b9e2ce]/30",
      badgeBg: "!bg-[#b9e2ce]",
      content: report.impression,
      fieldName: "impressionReply",
      currentReply: report.impression_reply,
      placeholder: "Tanggapi kesan siswa terhadap kelas...",
    },
    {
      label: "4. Saran",
      bg: "bg-[#ffdb59]/30",
      badgeBg: "!bg-[#ffdb59]",
      content: report.suggestion,
      fieldName: "suggestionReply",
      currentReply: report.suggestion_reply,
      placeholder: "Jelaskan tindak lanjut atau rencana pengurus mengenai saran ini...",
    },
  ];

  return (
    <div className="space-y-6 max-w-4xl">
      <Link href="/pengurus/laporan" className="text-sm font-bold underline inline-flex items-center gap-1">
        ← Kembali ke antrean laporan
      </Link>

      <header className={`panel p-6 sm:p-7 ${report.urgent ? "!bg-[#ffa18b]/40" : ""}`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="badge !bg-[#ffdb59] mb-2">
              Laporan {periodLabel(String(report.period).slice(0, 10))}
            </span>
            <h1 className="text-3xl font-black">{report.full_name}</h1>
            <p className="text-xs text-[#555951] mt-1">
              @{report.username} · Dikirim pada {formatDate(report.created_at)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {report.urgent ? (
              <span className="badge !bg-[#ffa18b] text-sm">
                <Siren size={18} weight="fill" /> Prioritas Tinggi
              </span>
            ) : null}
            <span
              className={`badge text-xs ${
                report.status === "DONE"
                  ? "!bg-[#b9e2ce]"
                  : report.status === "IN_PROGRESS"
                  ? "!bg-[#ffdb59]"
                  : "!bg-stone-200"
              }`}
            >
              Status: {report.status === "DONE" ? "Selesai" : report.status === "IN_PROGRESS" ? "Ditangani" : "Baru"}
            </span>
          </div>
        </div>
      </header>

      <Notice success={query.success} />

      <form action={replyReportAction} className="space-y-6">
        <input type="hidden" name="reportId" value={report.id} />

        {/* 1. Keluh */}
        <section className={`panel p-6 ${entries[0].bg} space-y-4`}>
          <span className={`badge ${entries[0].badgeBg}`}>{entries[0].label}</span>
          <div className="border-2 border-[#20201e] bg-white rounded-[8px] p-4">
            <p className="text-xs font-bold text-[#555951] mb-1">DARI SISWA:</p>
            <p className="text-base leading-7 whitespace-pre-wrap">{entries[0].content}</p>
          </div>
          <div>
            <label className="block text-sm font-extrabold mb-1">Solusi / Tanggapan Pengurus:</label>
            <textarea
              name={entries[0].fieldName}
              defaultValue={entries[0].currentReply ?? ""}
              rows={4}
              className="field"
              placeholder={entries[0].placeholder}
            />
          </div>
        </section>

        {/* 2. Pesan untuk Teman */}
        <section className="panel p-6 bg-[#c5d3ff]/40 space-y-4">
          <div className="flex items-center justify-between">
            <span className="badge !bg-[#c5d3ff]">2. Pesan untuk Teman</span>
            <span className="badge !bg-white text-xs">
              Penerima: {report.recipient_name}
            </span>
          </div>

          <div className="border-2 border-[#20201e] bg-white rounded-[8px] p-4">
            <div className="flex items-center justify-between text-xs font-bold text-[#555951] mb-1">
              <span>DARI SISWA:</span>
              <span className="text-[#345bdc]">
                {report.reveal_sender ? "Nama boleh ditampilkan" : "Pengirim ingin namanya dirahasiakan"}
              </span>
            </div>
            <p className="text-base leading-7 whitespace-pre-wrap">{report.message}</p>
          </div>

          <div>
            <label className="block text-sm font-extrabold mb-1">Catatan Pengurus (opsional, untuk penerima):</label>
            <input
              name="messageNote"
              defaultValue={report.message_note ?? ""}
              className="field"
              placeholder="Contoh: Pesan ini telah diperiksa oleh pengurus kelas..."
            />
          </div>

          <label className="flex items-center gap-3 p-3 bg-white border-2 border-[#20201e] rounded-[7px] cursor-pointer font-extrabold text-sm shadow-[2px_2px_0_#20201e]">
            <input
              name="forward"
              type="checkbox"
              defaultChecked={Boolean(report.forwarded_at)}
              className="size-5 accent-[#345bdc]"
            />
            <CheckCircle size={20} weight="fill" className="text-[#113a27]" />
            <span>Teruskan pesan ini ke kotak masuk {report.recipient_name}</span>
          </label>
        </section>

        {/* 3. Kesan */}
        <section className={`panel p-6 ${entries[1].bg} space-y-4`}>
          <span className={`badge ${entries[1].badgeBg}`}>{entries[1].label}</span>
          <div className="border-2 border-[#20201e] bg-white rounded-[8px] p-4">
            <p className="text-xs font-bold text-[#555951] mb-1">DARI SISWA:</p>
            <p className="text-base leading-7 whitespace-pre-wrap">{entries[1].content}</p>
          </div>
          <div>
            <label className="block text-sm font-extrabold mb-1">Tanggapan Pengurus:</label>
            <textarea
              name={entries[1].fieldName}
              defaultValue={entries[1].currentReply ?? ""}
              rows={4}
              className="field"
              placeholder={entries[1].placeholder}
            />
          </div>
        </section>

        {/* 4. Saran */}
        <section className={`panel p-6 ${entries[2].bg} space-y-4`}>
          <span className={`badge ${entries[2].badgeBg}`}>{entries[2].label}</span>
          <div className="border-2 border-[#20201e] bg-white rounded-[8px] p-4">
            <p className="text-xs font-bold text-[#555951] mb-1">DARI SISWA:</p>
            <p className="text-base leading-7 whitespace-pre-wrap">{entries[2].content}</p>
          </div>
          <div>
            <label className="block text-sm font-extrabold mb-1">Tindak Lanjut Pengurus:</label>
            <textarea
              name={entries[2].fieldName}
              defaultValue={entries[2].currentReply ?? ""}
              rows={4}
              className="field"
              placeholder={entries[2].placeholder}
            />
          </div>
        </section>

        {/* Action bar */}
        <div className="panel p-5 flex flex-wrap items-center justify-between gap-4 bg-[#ffdb59]">
          <p className="text-xs font-bold leading-5">
            Laporan otomatis berubah status menjadi <strong>Selesai</strong> jika Keluh, Kesan, Saran telah ditanggapi dan Pesan telah diteruskan.
          </p>
          <button className="btn-primary" type="submit">
            Simpan Tanggapan <PaperPlaneTilt size={18} weight="bold" />
          </button>
        </div>
      </form>
    </div>
  );
}
