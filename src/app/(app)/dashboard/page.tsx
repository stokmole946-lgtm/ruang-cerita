import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowUpRight,
  Broom,
  CalendarBlank,
  ChatDots,
  ChatTeardropDots,
  Clock,
  EnvelopeSimple,
  HeartBreak,
  Lightbulb,
  Megaphone,
  PaperPlaneTilt,
  Smiley,
} from "@phosphor-icons/react/dist/ssr";
import { Notice } from "@/components/notice";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getTodayPiketInfo } from "@/lib/piket";
import { currentPeriod, formatDate, periodLabel } from "@/lib/time";

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const user = await requireUser();
  if (user.role === "ADMIN") redirect("/pengurus");
  const params = await searchParams;
  const piketInfo = getTodayPiketInfo();

  const [reports, announcements, events, inbox, latestCurhats, [todayPiketDoc]] = await Promise.all([
    sql`SELECT *, to_char(period, 'YYYY-MM-DD') AS period_key FROM monthly_reports WHERE student_id = ${user.id} ORDER BY period DESC LIMIT 3`,
    sql`SELECT * FROM class_posts WHERE kind = 'announcement' AND starts_at <= now() AND ends_at >= now() ORDER BY starts_at DESC LIMIT 1`,
    sql`SELECT * FROM class_posts WHERE kind = 'event' AND ends_at >= now() ORDER BY starts_at LIMIT 3`,
    sql`
      SELECT r.id, r.forwarded_at, r.message,
        CASE WHEN r.reveal_sender THEN u.full_name ELSE 'Seseorang dari kelasmu' END AS sender
      FROM monthly_reports r
      JOIN users u ON u.id = r.student_id
      WHERE r.recipient_id = ${user.id} AND r.forwarded_at IS NOT NULL
      ORDER BY r.forwarded_at DESC
      LIMIT 2
    `,
    sql`
      SELECT id, content, urgent, is_anonymous, status, reply, replied_at, created_at
      FROM student_curhats
      WHERE student_id = ${user.id}
      ORDER BY created_at DESC
      LIMIT 1
    `,
    sql`
      SELECT * FROM piket_logs WHERE piket_date = ${piketInfo.todayDateISO}::date LIMIT 1
    `,
  ]);

  const currentReport = reports.find((r) => r.period_key === currentPeriod());
  const isReportDone = currentReport?.status === "DONE";
  const lastCurhat = latestCurhats[0] ?? null;

  return (
    <div className="space-y-7">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="badge !bg-[#ffdb59] mb-2">{periodLabel()} · X SIJA B</span>
          <h1 className="page-title">Halo, {user.fullName.split(" ")[0]}!</h1>
          <p className="text-sm text-[#555951]">
            Website ini adalah tempat kamu curhat online ke pengurus kelas secara aman dan bebas.
          </p>
        </div>
        <span className="badge !bg-[#b9e2ce]">Akun Siswa</span>
      </header>

      <Notice {...params} />

      {/* Hero Utama: FITUR CURHAT KAPAN SAJA (Bebas) */}
      <section className="panel p-6 sm:p-8 bg-[#ffdb59] border-2 border-[#20201e] space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="badge !bg-white text-xs font-black flex items-center gap-1.5">
              <ChatTeardropDots size={16} weight="fill" className="text-[#345bdc]" />
              FITUR BARU · CURHAT KAPAN SAJA
            </span>
            <span className="text-xs font-bold text-[#20201e]/80">Bebas & Tanpa Batas</span>
          </div>
          <span className="badge !bg-[#b9e2ce] text-xs">Aktif 24/7</span>
        </div>

        <div>
          <h2 className="text-3xl sm:text-4xl font-black leading-tight text-[#20201e]">
            Ada unek-unek hari ini? Curhat ke pengurus sekarang.
          </h2>
          <p className="mt-2 text-sm text-[#353930] leading-6 max-w-2xl font-medium">
            Tidak perlu menunggu akhir bulan! Kamu bisa curhat kapan saja, di mana saja, berkali-kali. Mau curhat masalah tugas, capek, atau minta bantuan mediasi pengurus, kami siap mendengarkan.
          </p>
        </div>

        {/* Status curhat terakhir siswa jika ada */}
        {lastCurhat ? (
          <div className="border-2 border-[#20201e] rounded-[8px] p-3.5 bg-white shadow-[2px_2px_0_#20201e] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-extrabold flex items-center gap-1.5 text-[#345bdc]">
                <Clock size={15} weight="bold" /> Curhat Terakhirmu ({formatDate(lastCurhat.created_at)}):
              </span>
              <span
                className={`badge text-[11px] ${
                  lastCurhat.status === "DONE"
                    ? "!bg-[#b9e2ce]"
                    : lastCurhat.status === "IN_PROGRESS"
                    ? "!bg-[#ffdb59]"
                    : "!bg-stone-200"
                }`}
              >
                {lastCurhat.status === "DONE"
                  ? "✓ Sudah Diberi Solusi"
                  : lastCurhat.status === "IN_PROGRESS"
                  ? "Sedang Ditangani"
                  : "Menunggu Pengurus"}
              </span>
            </div>
            <p className="text-xs text-[#20201e] line-clamp-1 italic">
              &ldquo;{lastCurhat.content}&rdquo;
            </p>
            {lastCurhat.reply ? (
              <div className="text-xs text-[#113a27] bg-[#b9e2ce]/40 p-2 rounded border border-[#20201e]/20 font-medium">
                <strong>Solusi Pengurus:</strong> {lastCurhat.reply}
              </div>
            ) : null}
          </div>
        ) : null}

        {/* Tombol Aksi Curhat */}
        <div className="pt-1 flex flex-wrap items-center gap-4">
          <Link href="/curhat" className="btn-primary !min-h-[50px] !text-base !px-6">
            💬 Tulis Curhat ke Pengurus Sekarang
            <ArrowUpRight size={20} weight="bold" />
          </Link>
          <Link href="/curhat" className="btn-secondary !min-h-[50px] !text-sm">
            Lihat Semua Curhatmu ({latestCurhats.length ? "Aktif" : "0"})
          </Link>
        </div>
      </section>

      {/* Bagian Laporan Bulanan (Keluh, Pesan, Kesan, Saran) */}
      <section className="panel p-6 bg-[#fffef9] border-2 border-[#20201e] space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#20201e]/20 pb-3">
          <div>
            <span className="badge !bg-[#c5d3ff] text-xs font-black mb-1">PROGRAM RUTIN KELAS</span>
            <h3 className="text-xl font-black">Laporan Bulanan X SIJA B ({periodLabel()})</h3>
            <p className="text-xs text-[#555951] mt-0.5">
              Pengumpulan aspirasi rutin 4 kategori (Keluh, Pesan, Kesan, Saran) 1x per bulan.
            </p>
          </div>

          <span
            className={`badge text-xs ${
              currentReport
                ? isReportDone
                  ? "!bg-[#b9e2ce]"
                  : "!bg-[#ffdb59]"
                : "!bg-[#ffa18b]"
            }`}
          >
            {currentReport
              ? isReportDone
                ? "✓ Selesai Ditanggapi"
                : "Sudah Dikirim"
              : "Belum Diisi"}
          </span>
        </div>

        {/* 4 Pilihan Box Mini */}
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
          <div className="border border-[#20201e] rounded-[6px] p-2.5 bg-[#ffa18b]/15">
            <span className="font-bold text-[#d94833] flex items-center gap-1">
              <HeartBreak size={14} weight="fill" /> 1. Keluh
            </span>
            <p className="text-[#555951] mt-1">Masalah tugas/kendala</p>
          </div>
          <div className="border border-[#20201e] rounded-[6px] p-2.5 bg-[#c5d3ff]/20">
            <span className="font-bold text-[#2563eb] flex items-center gap-1">
              <PaperPlaneTilt size={14} weight="fill" /> 2. Pesan
            </span>
            <p className="text-[#555951] mt-1">Titip pesan ke teman</p>
          </div>
          <div className="border border-[#20201e] rounded-[6px] p-2.5 bg-[#b9e2ce]/20">
            <span className="font-bold text-[#059669] flex items-center gap-1">
              <Smiley size={14} weight="fill" /> 3. Kesan
            </span>
            <p className="text-[#555951] mt-1">Suasana kelas bulan ini</p>
          </div>
          <div className="border border-[#20201e] rounded-[6px] p-2.5 bg-[#ffdb59]/20">
            <span className="font-bold text-[#d97706] flex items-center gap-1">
              <Lightbulb size={14} weight="fill" /> 4. Saran
            </span>
            <p className="text-[#555951] mt-1">Ide baru kelas kita</p>
          </div>
        </div>

        <div className="pt-2 flex flex-wrap items-center justify-between gap-3">
          <Link
            href={currentReport ? "/riwayat" : "/cerita-baru"}
            className="btn-secondary !min-h-[40px] !text-xs font-black"
          >
            {currentReport ? "Buka Riwayat Laporan Bulanan →" : "✍️ Isi Laporan Bulanan Sekarang →"}
          </Link>
          <span className="text-[11px] text-[#555951]">
            {currentReport
              ? `Terkirim pada ${formatDate(currentReport.created_at)}`
              : "Dilengkapi 1x setiap bulan untuk evaluasi kelas."}
          </span>
        </div>
      </section>

      {/* Widget Piket Hari Ini */}
      <section className="panel p-6 bg-[#fffef9] border-2 border-[#20201e] space-y-4 shadow-[3px_3px_0_#20201e]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#20201e]/20 pb-3">
          <div>
            <span className="badge !bg-[#ffdb59] text-xs font-black mb-1">JADWAL & DOKUMENTASI</span>
            <h3 className="text-xl font-black flex items-center gap-2">
              <Broom size={22} weight="fill" className="text-[#345bdc]" />
              Piket Hari {piketInfo.schedule.dayName}
            </h3>
            <p className="text-xs text-[#555951] mt-0.5">
              Penanggung Jawab: <strong className="text-[#20201e]">⭐ {piketInfo.schedule.coordinator.name}</strong>
            </p>
          </div>

          <span
            className={`badge text-xs flex items-center gap-1 ${
              todayPiketDoc ? "!bg-[#b9e2ce] text-[#113a27]" : "!bg-[#ffa18b] text-[#481c17]"
            }`}
          >
            {todayPiketDoc ? "✓ Sudah Difoto & Rapi" : "⚠️ Wajib Foto Piket"}
          </span>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="space-y-1">
            <span className="text-[#555951] font-bold block">Regu Piket Hari Ini:</span>
            <div className="flex flex-wrap gap-1.5">
              {piketInfo.schedule.members.map((m) => (
                <span
                  key={m.name}
                  className={`px-2 py-0.5 rounded-[4px] border border-[#20201e] text-[11px] font-bold ${
                    m.isCoordinator ? "bg-[#ffdb59]" : "bg-white"
                  }`}
                >
                  {m.isCoordinator ? "⭐ " : ""}{m.name}
                </span>
              ))}
            </div>
          </div>

          <Link href="/piket" className="btn-primary !min-h-[38px] !py-1 !px-4 text-xs font-black">
            {todayPiketDoc ? "Lihat Foto Piket →" : "📸 Unggah Foto Piket →"}
          </Link>
        </div>
      </section>

      {/* Grid: Pesan Masuk, Pengumuman, Agenda */}
      <div className="dashboard-grid">
        {/* Kolom Kiri: Pesan Masuk untukmu */}
        <div className="space-y-6">
          <section className="panel p-6">
            <div className="section-title">
              <h2 className="flex items-center gap-2">
                <EnvelopeSimple size={22} weight="bold" />
                Pesan Masuk Untukmu
              </h2>
              <Link href="/kotak-masuk">Buka Kotak Masuk</Link>
            </div>

            {inbox.length ? (
              <div className="space-y-3">
                {inbox.map((msg) => (
                  <Link
                    key={msg.id}
                    href="/kotak-masuk"
                    className="block p-4 border-2 border-[#20201e] rounded-[8px] bg-[#c5d3ff]/20 hover:bg-[#c5d3ff]/40 transition shadow-[2px_2px_0_#20201e]"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-extrabold text-[#345bdc]">Dari: {msg.sender}</span>
                      <span className="text-[#555951]">{formatDate(msg.forwarded_at)}</span>
                    </div>
                    <p className="text-sm mt-2 line-clamp-2 leading-relaxed">{msg.message}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="empty">
                Belum ada pesan dari teman kelas. Jika ada yang menitipkan pesan untukmu lewat pengurus, pesan akan tampil di sini.
              </p>
            )}
          </section>

          <section className="panel p-6">
            <div className="section-title">
              <h2 className="flex items-center gap-2">
                <ChatDots size={22} weight="bold" />
                Riwayat Laporan Sebelumnya
              </h2>
              <Link href="/riwayat">Semua</Link>
            </div>

            {reports.length ? (
              <div className="divide-y border-y border-[#20201e]/20">
                {reports.map((r) => (
                  <Link
                    key={r.id}
                    href="/riwayat"
                    className="py-3 flex items-center justify-between hover:bg-stone-50 transition px-1"
                  >
                    <div>
                      <p className="font-extrabold text-sm">Periode {periodLabel(r.period_key)}</p>
                      <p className="text-xs text-[#555951]">Terkirim {formatDate(r.created_at)}</p>
                    </div>
                    <span
                      className={`badge text-xs ${
                        r.status === "DONE"
                          ? "!bg-[#b9e2ce]"
                          : r.status === "IN_PROGRESS"
                          ? "!bg-[#ffdb59]"
                          : "!bg-stone-200"
                      }`}
                    >
                      {r.status === "DONE" ? "Sudah dibalas" : r.status === "IN_PROGRESS" ? "Diproses" : "Terkirim"}
                    </span>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="empty">Belum ada riwayat laporan sebelumnya.</p>
            )}
          </section>
        </div>

        {/* Kolom Kanan: Papan Kabar Pengumuman & Agenda Kalender */}
        <div className="space-y-6">
          <section className="panel p-6">
            <div className="section-title">
              <h2 className="flex items-center gap-2">
                <Megaphone size={22} weight="bold" />
                Papan Kabar Kelas
              </h2>
              <Link href="/pengumuman">Semua info</Link>
            </div>

            {announcements[0] ? (
              <div className="border-2 border-[#20201e] rounded-[8px] p-4 bg-[#ffa18b]/20 space-y-2">
                <span className="badge !bg-[#ffa18b] text-xs">PENGUMUMAN PENGURUS</span>
                <h3 className="text-xl font-extrabold">{announcements[0].title}</h3>
                <p className="text-sm leading-6 line-clamp-4">{announcements[0].content}</p>
                <div className="pt-2">
                  <Link href="/pengumuman" className="btn-secondary !min-h-[36px] !py-1 text-xs">
                    Baca selengkapnya →
                  </Link>
                </div>
              </div>
            ) : (
              <p className="empty">Belum ada pengumuman baru dari pengurus kelas.</p>
            )}
          </section>

          <section className="panel p-6">
            <div className="section-title">
              <h2 className="flex items-center gap-2">
                <CalendarBlank size={22} weight="bold" />
                Agenda Terdekat
              </h2>
              <Link href="/kalender">Buka kalender</Link>
            </div>

            <div className="board-list">
              {events.length ? (
                events.map((e) => (
                  <Link key={e.id} href={`/kalender#event-${e.id}`} className="board-row">
                    <span className="date-stamp">
                      {new Intl.DateTimeFormat("id-ID", {
                        day: "2-digit",
                        month: "short",
                        timeZone: "Asia/Jakarta",
                      }).format(new Date(e.starts_at))}
                    </span>
                    <div>
                      <p className="font-bold text-sm">{e.title}</p>
                      <p className="text-xs text-[#555951]">{e.category}</p>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="empty">Belum ada agenda kelas dalam waktu dekat.</p>
              )}
            </div>
          </section>
        </div>
      </div>

      {/* Emergency guidance */}
      <div className="border-2 border-[#20201e] rounded-[8px] p-4 bg-white flex items-center justify-between text-xs leading-5">
        <div>
          <span className="font-extrabold text-[#d94833] uppercase">Perhatian penting: </span>
          <span>
            Jika kamu mengalami perundungan, kekerasan, atau sedang dalam kondisi darurat, jangan menunggu balasan website. Segera hubungi orang tua, wali kelas, atau guru BK.
          </span>
        </div>
      </div>
    </div>
  );
}
