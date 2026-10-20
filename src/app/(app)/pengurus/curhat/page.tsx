import Link from "next/link";
import {
  ChatTeardropDots,
  CheckCircle,
  Funnel,
  MagnifyingGlass,
  PaperPlaneTilt,
  ShieldCheck,
  Siren,
  Trash,
  User,
  WhatsappLogo,
} from "@phosphor-icons/react/dist/ssr";
import { deleteCurhatAction, replyCurhatAction } from "@/app/curhat-actions";
import { Notice } from "@/components/notice";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatDate } from "@/lib/time";

export default async function PengurusCurhatPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string; q?: string; success?: string; error?: string }>;
}) {
  await requireUser("ADMIN");
  const params = await searchParams;
  const q = params.q ? `%${params.q.trim().toLowerCase()}%` : null;

  const [stats] = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status = 'NEW')::int AS pending,
      COUNT(*) FILTER (WHERE status = 'IN_PROGRESS')::int AS in_progress,
      COUNT(*) FILTER (WHERE status = 'DONE')::int AS done,
      COUNT(*) FILTER (WHERE urgent = TRUE AND status != 'DONE')::int AS urgent
    FROM student_curhats
  `;

  const curhats = await sql`
    SELECT c.*,
      u.full_name AS student_name,
      u.username AS student_username,
      u.whatsapp AS student_whatsapp,
      replier.full_name AS replier_name
    FROM student_curhats c
    JOIN users u ON u.id = c.student_id
    LEFT JOIN users replier ON replier.id = c.replied_by
    WHERE (${params.priority === "true"} = FALSE OR c.urgent = TRUE)
      AND (${params.status ?? "ALL"} = 'ALL' OR c.status::text = ${params.status ?? "ALL"})
      AND (
        ${q}::text IS NULL
        OR lower(c.content) LIKE ${q}
        OR (c.is_anonymous = FALSE AND (lower(u.full_name) LIKE ${q} OR lower(u.username) LIKE ${q}))
      )
    ORDER BY c.urgent DESC, CASE c.status WHEN 'NEW' THEN 0 WHEN 'IN_PROGRESS' THEN 1 ELSE 2 END, c.created_at DESC
  `;

  const filters = [
    ["Semua", "ALL"],
    ["Butuh Solusi", "NEW"],
    ["Sedang Ditangani", "IN_PROGRESS"],
    ["Selesai", "DONE"],
  ] as const;

  return (
    <div className="space-y-7 max-w-4xl">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="badge !bg-[#c5d3ff] mb-2 flex items-center gap-1.5 w-fit">
            <ChatTeardropDots size={16} weight="fill" /> Ruang Curhat Siswa · X SIJA B
          </span>
          <h1 className="page-title">Kotak Curhat Siswa.</h1>
          <p className="text-sm text-[#555951]">
            Baca curhat bebas, keluhan harian, dan berikan solusi untuk siswa kelas kita kapan saja.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/pengurus" className="btn-secondary text-xs">
            ← Dashboard
          </Link>
          <Link href="/pengurus/laporan" className="btn-secondary text-xs">
            Laporan Bulanan →
          </Link>
        </div>
      </header>

      <Notice success={params.success} error={params.error} />

      {/* Mini Stat Badges */}
      <section className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="border-2 border-[#20201e] rounded-[8px] p-3.5 bg-white shadow-[2px_2px_0_#20201e]">
          <span className="text-[11px] font-bold text-[#555951] uppercase">Total Curhat</span>
          <p className="text-2xl font-black mt-1">{stats.total}</p>
        </div>
        <div className="border-2 border-[#20201e] rounded-[8px] p-3.5 bg-[#ffa18b]/30 shadow-[2px_2px_0_#20201e]">
          <span className="text-[11px] font-bold text-[#d94833] uppercase flex items-center gap-1">
            <Siren size={14} weight="fill" /> Urgent Belum Selesai
          </span>
          <p className="text-2xl font-black mt-1 text-[#d94833]">{stats.urgent}</p>
        </div>
        <div className="border-2 border-[#20201e] rounded-[8px] p-3.5 bg-[#ffdb59]/30 shadow-[2px_2px_0_#20201e]">
          <span className="text-[11px] font-bold text-[#d97706] uppercase">Butuh Solusi</span>
          <p className="text-2xl font-black mt-1 text-[#d97706]">{stats.pending}</p>
        </div>
        <div className="border-2 border-[#20201e] rounded-[8px] p-3.5 bg-[#b9e2ce]/40 shadow-[2px_2px_0_#20201e]">
          <span className="text-[11px] font-bold text-[#059669] uppercase">Sudah Diberi Solusi</span>
          <p className="text-2xl font-black mt-1 text-[#059669]">{stats.done}</p>
        </div>
      </section>

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
                  href={`/pengurus/curhat?status=${value}${params.priority ? "&priority=true" : ""}${params.q ? `&q=${encodeURIComponent(params.q)}` : ""}`}
                  className={`border-2 border-[#20201e] px-3 py-1.5 rounded-[6px] text-xs font-extrabold transition ${
                    isActive ? "bg-[#345bdc] text-white shadow-[2px_2px_0_#20201e]" : "bg-[#fffef9] hover:bg-[#f2eee1]"
                  }`}
                >
                  {label}
                </Link>
              );
            })}
            <Link
              href={`/pengurus/curhat?priority=${params.priority === "true" ? "false" : "true"}${params.status ? `&status=${params.status}` : ""}`}
              className={`border-2 border-[#20201e] px-3 py-1.5 rounded-[6px] text-xs font-extrabold flex items-center gap-1.5 ${
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
              placeholder="Cari isi curhat..."
              className="field !py-1.5 !px-3 text-xs w-48 sm:w-56"
            />
            {params.status ? <input type="hidden" name="status" value={params.status} /> : null}
            <button className="btn-secondary !min-h-[38px] !py-1 !px-3 text-xs">
              <MagnifyingGlass size={16} weight="bold" />
            </button>
          </form>
        </div>

        {/* List of Curhats */}
        <div className="space-y-5 pt-2">
          {curhats.length ? (
            curhats.map((c) => {
              const isDone = c.status === "DONE";
              const isInProgress = c.status === "IN_PROGRESS";
              const statusBadge = isDone
                ? { label: "Selesai Diberi Solusi", bg: "!bg-[#b9e2ce]" }
                : isInProgress
                ? { label: "Sedang Ditangani", bg: "!bg-[#ffdb59]" }
                : { label: "Butuh Solusi", bg: "!bg-[#ffa18b]" };

              return (
                <article
                  key={c.id}
                  className={`border-2 border-[#20201e] rounded-[10px] p-5 sm:p-6 space-y-4 shadow-[3px_3px_0_#20201e] ${
                    c.urgent ? "bg-[#ffa18b]/15" : "bg-white"
                  }`}
                >
                  {/* Top Bar */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#20201e]/20 pb-3">
                    <div className="flex items-center gap-2">
                      {c.is_anonymous ? (
                        <div className="flex items-center gap-1.5">
                          <span className="badge !bg-[#c5d3ff] text-xs font-black flex items-center gap-1">
                            <ShieldCheck size={14} weight="fill" /> Anonim
                          </span>
                          <span className="text-xs text-[#555951] italic">(Nama disembunyikan oleh siswa)</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <span className="font-black text-base flex items-center gap-1">
                            <User size={15} weight="bold" /> {c.student_name}
                          </span>
                          <span className="text-xs text-[#555951]">@{c.student_username}</span>
                        </div>
                      )}

                      {c.urgent ? (
                        <span className="badge !bg-[#ffa18b] text-[10px] py-0.5">
                          <Siren size={13} weight="fill" /> PRIORITAS TINGGI
                        </span>
                      ) : null}

                      {c.urgent && !c.is_anonymous && c.student_whatsapp ? (
                        <a
                          href={`https://wa.me/${c.student_whatsapp.startsWith("0") ? "62" + c.student_whatsapp.slice(1) : c.student_whatsapp}?text=${encodeURIComponent(
                            `Halo ${c.student_name}, kami dari pengurus kelas X SIJA B ingin menanyakan kabar dan merespons curhat mendesakmu di Ruang Cerita.`
                          )}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="badge !bg-[#25D366] text-white hover:opacity-90 flex items-center gap-1 text-[10px] font-black"
                          title="Hubungi langsung via WhatsApp"
                        >
                          <WhatsappLogo size={16} aria-hidden="true" />Chat WhatsApp
                        </a>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3">
                      <span className={`badge text-xs ${statusBadge.bg}`}>
                        {statusBadge.label}
                      </span>
                      <span className="text-xs text-[#555951]">{formatDate(c.created_at)}</span>
                    </div>
                  </div>

                  {/* Curhat Content */}
                  <div className="bg-[#fffef9] p-4 rounded-[8px] border-2 border-[#20201e]/20">
                    <span className="block text-[11px] font-black text-[#555951] uppercase tracking-wider mb-1">
                      Isi Curhat Siswa:
                    </span>
                    <p className="text-sm sm:text-base text-[#20201e] leading-relaxed whitespace-pre-wrap">
                      {c.content}
                    </p>
                  </div>

                  {/* Reply Form */}
                  <div className="pt-2">
                    <form action={replyCurhatAction} className="space-y-3 bg-[#f5f2e9] p-4 rounded-[8px] border-2 border-[#20201e]">
                      <input type="hidden" name="curhatId" value={c.id} />

                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <label className="text-xs font-black text-[#20201e] flex items-center gap-1.5 uppercase">
                          <PaperPlaneTilt size={15} weight="bold" />
                          {c.reply ? "Edit Solusi / Tanggapan Pengurus:" : "Tulis Solusi / Tanggapan untuk Siswa:"}
                        </label>

                        {/* Status selector */}
                        <div className="flex items-center gap-2 text-xs font-bold">
                          <span>Status:</span>
                          <select
                            name="status"
                            defaultValue={c.status}
                            className="border-2 border-[#20201e] rounded-[5px] px-2 py-1 text-xs bg-white"
                          >
                            <option value="DONE">Selesai (Sudah ada solusi)</option>
                            <option value="IN_PROGRESS">Sedang Ditangani (Butuh proses)</option>
                            <option value="NEW">Belum Selesai</option>
                          </select>
                        </div>
                      </div>

                      <textarea
                        name="reply"
                        rows={3}
                        defaultValue={c.reply ?? ""}
                        placeholder="Ketik tanggapan atau solusi pengurus di sini. Siswa akan langsung melihat balasan ini di akun mereka..."
                        className="field w-full text-xs sm:text-sm resize-y bg-white"
                      />

                      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                        <span className="text-[11px] text-[#555951]">
                          {c.replied_at
                            ? `Terakhir dibalas oleh ${c.replier_name ?? "Pengurus"} pada ${formatDate(c.replied_at)}`
                            : "Balasan akan langsung muncul di halaman curhat siswa."}
                        </span>

                        <div className="flex items-center gap-2">
                          <button type="submit" className="btn-primary !min-h-[38px] !py-1 !px-4 text-xs font-black">
                            <CheckCircle size={16} weight="bold" />
                            {c.reply ? "Perbarui Tanggapan" : "Kirim Solusi Sekarang"}
                          </button>
                        </div>
                      </div>
                    </form>
                  </div>

                  {/* Delete button (bottom right) */}
                  <div className="flex justify-end pt-1">
                    <form action={deleteCurhatAction}>
                      <input type="hidden" name="curhatId" value={c.id} />
                      <button
                        type="submit"
                        className="text-xs text-[#d94833] hover:underline flex items-center gap-1 font-bold"
                        title="Hapus curhat ini"
                      >
                        <Trash size={14} /> Hapus arsip curhat
                      </button>
                    </form>
                  </div>
                </article>
              );
            })
          ) : (
            <div className="panel p-8 text-center bg-[#fffef9] border-2 border-dashed border-[#20201e]">
              <ChatTeardropDots size={40} className="mx-auto text-[#555951] mb-2" />
              <h3 className="text-xl font-bold">Tidak ada curhat pada filter ini.</h3>
              <p className="text-xs text-[#555951] mt-1">
                Semua curhat bebas yang dikirim siswa akan muncul di antrean ini.
              </p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
