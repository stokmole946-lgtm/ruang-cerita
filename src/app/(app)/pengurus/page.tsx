import Link from "next/link";
import {
  Broom,
  Chats,
  Star,
  Warning,
  ChatTeardropDots,
  CheckCircle,
  HeartBreak,
  Lightbulb,
  Megaphone,
  PaperPlaneTilt,
  ShieldCheck,
  Siren,
  User,
  Users,
} from "@phosphor-icons/react/dist/ssr";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getTodayPiketInfo } from "@/lib/piket";
import { currentPeriod, formatDate, periodLabel } from "@/lib/time";

export default async function AdminDashboard() {
  await requireUser("ADMIN");
  const piketInfo = getTodayPiketInfo();

  const [reportStats] = await sql`
    SELECT COUNT(*)::int AS total,
      COUNT(r.id)::int AS submitted,
      COUNT(*) FILTER (WHERE r.id IS NULL)::int AS missing,
      COUNT(*) FILTER (WHERE r.urgent = TRUE AND r.status != 'DONE')::int AS urgent,
      COUNT(*) FILTER (WHERE r.id IS NOT NULL AND r.status != 'DONE')::int AS pending
    FROM users u
    LEFT JOIN monthly_reports r ON r.student_id = u.id AND r.period = ${currentPeriod()}
    WHERE u.role = 'STUDENT'
  `;

  const [curhatStats] = await sql`
    SELECT
      COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE status != 'DONE')::int AS pending,
      COUNT(*) FILTER (WHERE urgent = TRUE AND status != 'DONE')::int AS urgent
    FROM student_curhats
  `;

  const [recentCurhats, recentReports, missingStudents, activeAnnouncements, upcomingEvents, [todayPiketDoc]] = await Promise.all([
    sql`
      SELECT c.*, u.full_name AS student_name, u.username AS student_username
      FROM student_curhats c
      JOIN users u ON u.id = c.student_id
      ORDER BY c.urgent DESC, CASE c.status WHEN 'NEW' THEN 0 WHEN 'IN_PROGRESS' THEN 1 ELSE 2 END, c.created_at DESC
      LIMIT 4
    `,
    sql`
      SELECT r.id, r.created_at, r.status, r.urgent, r.complaint, r.message, r.suggestion, r.forwarded_at,
        u.full_name AS student_name, u.username AS student_username,
        target.full_name AS recipient_name
      FROM monthly_reports r
      JOIN users u ON u.id = r.student_id
      JOIN users target ON target.id = r.recipient_id
      WHERE r.period = ${currentPeriod()}
      ORDER BY r.urgent DESC, CASE r.status WHEN 'NEW' THEN 0 WHEN 'IN_PROGRESS' THEN 1 ELSE 2 END, r.created_at DESC
      LIMIT 4
    `,
    sql`
      SELECT u.id, u.full_name, u.username
      FROM users u
      LEFT JOIN monthly_reports r ON r.student_id = u.id AND r.period = ${currentPeriod()}
      WHERE u.role = 'STUDENT' AND r.id IS NULL
      ORDER BY u.full_name
      LIMIT 10
    `,
    sql`
      SELECT * FROM class_posts
      WHERE kind = 'announcement' AND starts_at <= now() AND ends_at >= now()
      ORDER BY starts_at DESC
      LIMIT 2
    `,
    sql`
      SELECT * FROM class_posts
      WHERE kind = 'event' AND ends_at >= now()
      ORDER BY starts_at
      LIMIT 3
    `,
    sql`
      SELECT * FROM piket_logs WHERE piket_date = ${piketInfo.todayDateISO}::date LIMIT 1
    `,
  ]);

  const cards = [
    {
      label: "Curhat Butuh Solusi",
      value: curhatStats.pending,
      detail: `dari total ${curhatStats.total} curhat`,
      icon: ChatTeardropDots,
      bg: curhatStats.pending > 0 ? "bg-[#ffdb59]" : "bg-stone-200",
    },
    {
      label: "Curhat Prioritas",
      value: curhatStats.urgent,
      detail: "mendesak / darurat",
      icon: Siren,
      bg: curhatStats.urgent > 0 ? "bg-[#ffa18b]" : "bg-stone-200",
    },
    {
      label: "Laporan Bulanan",
      value: reportStats.submitted,
      detail: `dari ${reportStats.total} siswa (${periodLabel()})`,
      icon: CheckCircle,
      bg: "bg-[#b9e2ce]",
    },
    {
      label: "Belum Isi Laporan",
      value: reportStats.missing,
      detail: "wajib evaluasi bulanan",
      icon: Users,
      bg: "bg-[#c5d3ff]",
    },
  ];

  return (
    <div className="space-y-7">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="badge !bg-[#ffdb59] mb-2">{periodLabel()} · X SIJA B</span>
          <h1 className="page-title">Yuk, cek kabar kelas.</h1>
          <p className="text-sm text-[#555951]">
            Ada teman yang butuh didengerin. Cek cerita masuk dan bantu sebisamu.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/chat" className="btn-secondary">
            <Chats size={18} weight="bold" />
            Chat kelas
          </Link>
          <Link href="/pengurus/curhat" className="btn-primary">
            <ChatTeardropDots size={18} weight="fill" />
            Buka Curhat Siswa ({curhatStats.pending})
          </Link>
          <Link href="/pengurus/laporan" className="btn-secondary">
            Laporan Bulanan ({reportStats.submitted})
          </Link>
        </div>
      </header>

      {/* Stats Cards */}
      <section className="grid grid-cols-2 xl:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <article key={c.label} className={`panel p-5 ${c.bg}`}>
              <div className="flex items-center justify-between">
                <span className="text-sm font-extrabold uppercase">{c.label}</span>
                <Icon size={24} weight="bold" />
              </div>
              <p className="text-4xl font-black mt-4">{c.value}</p>
              <p className="text-xs font-bold mt-1 text-[#20201e]/80">{c.detail}</p>
            </article>
          );
        })}
      </section>

      {/* Widget Pemantauan Piket Hari Ini */}
      <section className="panel p-5 sm:p-6 bg-[#fffef9] border-2 border-[#20201e] shadow-[3px_3px_0_#20201e] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="badge !bg-[#ffdb59] text-xs font-black">PEMANTAUAN PIKET</span>
            <span
              className={`badge text-xs flex items-center gap-1 ${
                todayPiketDoc ? "!bg-[#b9e2ce] text-[#113a27]" : "!bg-[#ffa18b] text-[#481c17]"
              }`}
            >
              {todayPiketDoc ? <CheckCircle size={16} aria-hidden="true" /> : <Warning size={16} aria-hidden="true" />}
              {todayPiketDoc ? "Foto sudah masuk" : "Belum ada foto"}
            </span>
          </div>
          <h3 className="text-lg font-black flex items-center gap-2">
            <Broom size={20} weight="fill" className="text-[#345bdc]" />
            Piket {piketInfo.schedule.dayName} · <Star size={16} weight="fill" aria-label="Penanggung jawab" /> {piketInfo.schedule.coordinator.name}
          </h3>
          <p className="text-xs text-[#555951]">
            Petugas: {piketInfo.schedule.members.map((m) => m.name).join(", ")}
          </p>
        </div>

        <Link href="/piket" className="btn-secondary !min-h-[40px] !text-xs font-black shrink-0">
          {todayPiketDoc ? "Lihat Bukti Foto →" : "Cek Jadwal & Unggah →"}
        </Link>
      </section>

      {/* SECTION 1 (FITUR UTAMA BARU): CURHAT SISWA MASUK (Kapan Saja) */}
      <section className="panel p-6 sm:p-7 space-y-5 bg-[#fffef9] border-2 border-[#20201e]">
        <div className="section-title">
          <div>
            <span className="badge !bg-[#c5d3ff] text-xs font-black mb-1">FITUR BEBAS</span>
            <h2 className="text-2xl font-black flex items-center gap-2">
              <ChatTeardropDots size={26} weight="fill" className="text-[#345bdc]" />
              Curhat Siswa Masuk (Kapan Saja)
            </h2>
            <p className="text-xs text-[#555951] mt-1">
              Curhat personal dan keluhan mendesak yang dikirim siswa kapan saja tanpa menunggu akhir bulan.
            </p>
          </div>
          <Link href="/pengurus/curhat" className="btn-primary text-xs">
            Buka Semua Curhat ({curhatStats.total}) →
          </Link>
        </div>

        {recentCurhats.length ? (
          <div className="grid md:grid-cols-2 gap-4 pt-2">
            {recentCurhats.map((c) => {
              const isDone = c.status === "DONE";
              const isInProgress = c.status === "IN_PROGRESS";
              const statusBadge = isDone
                ? { label: "Selesai Diberi Solusi", bg: "!bg-[#b9e2ce]" }
                : isInProgress
                ? { label: "Sedang Ditangani", bg: "!bg-[#ffdb59]" }
                : { label: "Butuh Solusi", bg: "!bg-[#ffa18b]" };

              return (
                <div
                  key={c.id}
                  className={`border-2 border-[#20201e] rounded-[10px] p-5 flex flex-col justify-between gap-4 shadow-[3px_3px_0_#20201e] ${
                    c.urgent ? "bg-[#ffa18b]/20" : "bg-white"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2 border-b-2 border-[#20201e]/20 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          {c.is_anonymous ? (
                            <span className="badge !bg-[#c5d3ff] text-xs font-black flex items-center gap-1">
                              <ShieldCheck size={14} weight="fill" /> Siswa Anonim
                            </span>
                          ) : (
                            <span className="font-black text-base flex items-center gap-1">
                              <User size={15} weight="bold" /> {c.student_name}
                            </span>
                          )}

                          {c.urgent ? (
                            <span className="badge !bg-[#ffa18b] text-[10px] py-0.5">
                              <Siren size={13} weight="fill" /> PRIORITAS
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-[#555951] mt-1">
                          {c.is_anonymous ? "Identitas disembunyikan" : `@${c.student_username}`} · {formatDate(c.created_at)}
                        </p>
                      </div>

                      <span className={`badge text-[11px] ${statusBadge.bg}`}>
                        {statusBadge.label}
                      </span>
                    </div>

                    {/* Preview Curhat */}
                    <div className="bg-[#f5f2e9] p-3 rounded-[6px] border border-[#20201e]/20">
                      <p className="text-sm text-[#20201e] line-clamp-3 leading-relaxed italic">
                        &ldquo;{c.content}&rdquo;
                      </p>
                    </div>

                    {c.reply ? (
                      <div className="text-xs text-[#113a27] bg-[#b9e2ce]/30 p-2.5 rounded border border-[#20201e]/20">
                        <strong>Solusi Pengurus:</strong> {c.reply}
                      </div>
                    ) : null}
                  </div>

                  <div className="pt-2 border-t-2 border-[#20201e]/20 flex items-center justify-between">
                    <span className="text-[11px] text-[#555951]">
                      {isDone ? "Sudah selesai ditanggapi" : "Menunggu tanggapan pengurus"}
                    </span>
                    <Link
                      href="/pengurus/curhat"
                      className="btn-primary !min-h-[38px] !py-1 !px-4 text-xs font-black"
                    >
                      {c.reply ? "Edit Solusi →" : "Beri Solusi →"}
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border-2 border-dashed border-[#20201e] rounded-[10px] p-6 text-center bg-white">
            <ChatTeardropDots size={36} className="mx-auto text-[#555951] mb-2" />
            <h4 className="text-base font-bold">Belum ada curhat bebas yang masuk.</h4>
            <p className="text-xs text-[#555951] mt-1">
              Saat siswa mengirim curhat lewat menu Curhat, pesan mereka akan muncul di sini.
            </p>
          </div>
        )}
      </section>

      {/* SECTION 2: LAPORAN BULANAN KELAS (4 Bagian) */}
      <section className="panel p-6 sm:p-7 space-y-5">
        <div className="section-title">
          <div>
            <span className="badge !bg-[#ffdb59] text-xs mb-1">RUTIN BULANAN</span>
            <h2 className="text-2xl font-black flex items-center gap-2">
              Laporan Bulanan Kelas ({periodLabel()})
            </h2>
            <p className="text-xs text-[#555951] mt-1">
              Evaluasi 4 bagian (Keluh, Pesan, Kesan, Saran) rutin tiap akhir bulan.
            </p>
          </div>
          <Link href="/pengurus/laporan" className="btn-secondary text-xs">
            Buka Antrean Laporan →
          </Link>
        </div>

        {recentReports.length ? (
          <div className="grid md:grid-cols-2 gap-4 pt-2">
            {recentReports.map((r) => {
              const isDone = r.status === "DONE";
              const isInProgress = r.status === "IN_PROGRESS";
              const statusBadge = isDone
                ? { label: "Selesai Diberi Solusi", bg: "!bg-[#b9e2ce]" }
                : isInProgress
                ? { label: "Sedang Ditangani", bg: "!bg-[#ffdb59]" }
                : { label: "Butuh Solusi", bg: "!bg-[#ffa18b]" };

              return (
                <div
                  key={r.id}
                  className={`border-2 border-[#20201e] rounded-[10px] p-5 flex flex-col justify-between gap-4 shadow-[3px_3px_0_#20201e] ${
                    r.urgent ? "bg-[#ffa18b]/30" : "bg-white"
                  }`}
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2 border-b-2 border-[#20201e]/20 pb-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="text-lg font-black">{r.student_name}</h3>
                          {r.urgent ? (
                            <span className="badge !bg-[#ffa18b] text-[10px] py-0.5">
                              <Siren size={13} weight="fill" /> PRIORITAS
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-[#555951]">@{r.student_username} · {formatDate(r.created_at)}</p>
                      </div>

                      <span className={`badge text-[11px] ${statusBadge.bg}`}>
                        {statusBadge.label}
                      </span>
                    </div>

                    {/* Preview snippets */}
                    <div className="space-y-2 text-xs">
                      <div className="bg-[#ffa18b]/20 p-2.5 rounded-[6px] border border-[#20201e]/20">
                        <span className="font-bold text-[#d94833] flex items-center gap-1 mb-1">
                          <HeartBreak size={13} weight="fill" /> KELUHAN:
                        </span>
                        <p className="text-sm text-[#20201e] line-clamp-2 leading-relaxed italic">
                          &ldquo;{r.complaint}&rdquo;
                        </p>
                      </div>

                      <div className="bg-[#c5d3ff]/20 p-2.5 rounded-[6px] border border-[#20201e]/20 flex items-center justify-between">
                        <span className="font-bold text-[#2563eb] flex items-center gap-1">
                          <PaperPlaneTilt size={13} weight="fill" /> PESAN:
                        </span>
                        <span className="text-[#353930]">
                          Untuk: <strong>{r.recipient_name}</strong>{" "}
                          {r.forwarded_at ? (
                            <span className="text-[#059669] font-bold">(Terkirim)</span>
                          ) : (
                            <span className="text-[#d97706] font-bold">(Belum diteruskan)</span>
                          )}
                        </span>
                      </div>

                      <div className="bg-[#ffdb59]/20 p-2.5 rounded-[6px] border border-[#20201e]/20">
                        <span className="font-bold text-[#d97706] flex items-center gap-1 mb-1">
                          <Lightbulb size={13} weight="fill" /> SARAN KELAS:
                        </span>
                        <p className="text-xs text-[#20201e] line-clamp-1">
                          {r.suggestion}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="pt-2 border-t-2 border-[#20201e]/20 flex items-center justify-between">
                    <span className="text-[11px] text-[#555951] font-medium">
                      {isDone ? "Sudah selesai ditangani" : "Klik untuk membaca & menulis solusi"}
                    </span>
                    <Link
                      href={`/pengurus/laporan/${r.id}`}
                      className="btn-primary !min-h-[40px] !py-1 !px-4 text-xs font-black"
                    >
                      Beri Solusi →
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="border-2 border-dashed border-[#20201e] rounded-[10px] p-8 text-center bg-[#fffef9]">
            <p className="text-sm text-[#555951]">Belum ada laporan bulanan masuk untuk periode ini.</p>
          </div>
        )}
      </section>

      {/* Two Column Section: Siswa Belum Mengisi Laporan & Pengumuman */}
      <div className="dashboard-grid">
        {/* Kolom Kiri: Siswa Belum Mengisi Laporan */}
        <section className="panel p-6">
          <div className="section-title">
            <div>
              <h2 className="flex items-center gap-2">
                <Users size={22} weight="bold" />
                Belum Isi Laporan Bulanan ({reportStats.missing})
              </h2>
              <p className="text-xs text-[#555951] mt-0.5">Siswa yang belum mengirim evaluasi bulan ini</p>
            </div>
            <Link href="/pengurus/siswa">Kelola</Link>
          </div>

          {missingStudents.length ? (
            <div className="divide-y border-y border-[#20201e]/20 max-h-[320px] overflow-y-auto pr-1">
              {missingStudents.map((s) => (
                <div key={s.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <p className="font-extrabold text-sm">{s.full_name}</p>
                    <p className="text-xs text-[#555951]">@{s.username}</p>
                  </div>
                  <span className="badge !bg-stone-200 text-[10px]">Belum</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="empty text-[#113a27] font-bold">Luar biasa! Semua 32 siswa sudah mengisi laporan bulan ini!</p>
          )}
        </section>

        {/* Kolom Kanan: Pengumuman & Agenda */}
        <div className="space-y-6">
          <section className="panel p-6">
            <div className="section-title">
              <h2 className="flex items-center gap-2">
                <Megaphone size={22} weight="bold" />
                Pengumuman Kelas
              </h2>
              <Link href="/pengumuman">Kelola</Link>
            </div>
            {activeAnnouncements.length ? (
              <div className="space-y-3">
                {activeAnnouncements.map((a) => (
                  <article key={a.id} className="border-2 border-[#20201e] rounded-[8px] p-4 bg-[#ffdb59]/20">
                    <h3 className="font-extrabold text-base">{a.title}</h3>
                    <p className="text-sm mt-1 line-clamp-2">{a.content}</p>
                    <div className="flex items-center justify-between mt-3 text-xs text-[#555951]">
                      <span>Hingga {formatDate(a.ends_at)}</span>
                      <Link href={`/pengurus/kelas?id=${a.id}`} className="font-bold underline">Edit</Link>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="empty">Belum ada pengumuman yang aktif saat ini.</p>
            )}
          </section>

          <section className="panel p-6">
            <div className="section-title">
              <h2>Agenda Terdekat</h2>
              <Link href="/kalender">Buka kalender</Link>
            </div>
            {upcomingEvents.length ? (
              <div className="board-list">
                {upcomingEvents.map((e) => (
                  <div key={e.id} className="board-row">
                    <span className="date-stamp">
                      {new Intl.DateTimeFormat("id-ID", { day: "2-digit", month: "short", timeZone: "Asia/Jakarta" }).format(new Date(e.starts_at))}
                    </span>
                    <div>
                      <p className="font-bold text-sm">{e.title}</p>
                      <p className="text-xs text-[#555951]">{e.category}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="empty">Belum ada agenda terdekat.</p>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
