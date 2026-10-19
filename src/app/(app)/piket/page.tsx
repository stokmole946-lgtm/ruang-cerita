import Link from "next/link";
import {
  Broom,
  CalendarBlank,
  Camera,
  CheckCircle,
  Sparkle,
  Trash,
  Warning,
} from "@phosphor-icons/react/dist/ssr";
import { deletePiketPhotoAction } from "@/app/piket-actions";
import { Notice } from "@/components/notice";
import { PiketUpload } from "@/components/piket-upload";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { PIKET_SCHEDULE, getTodayPiketInfo } from "@/lib/piket";
import { formatDate } from "@/lib/time";

export default async function PiketPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const user = await requireUser();
  const params = await searchParams;

  const todayInfo = getTodayPiketInfo();

  // Ambil dokumentasi piket hari ini (jika sudah ada)
  const [todayDoc] = await sql`
    SELECT p.*, u.full_name AS uploader_name, u.username AS uploader_username
    FROM piket_logs p
    JOIN users u ON u.id = p.uploaded_by
    WHERE p.piket_date = ${todayInfo.todayDateISO}::date
    ORDER BY p.created_at DESC
    LIMIT 1
  `;

  // Ambil riwayat foto dokumentasi piket sebelumnya
  const pastLogs = await sql`
    SELECT p.*, u.full_name AS uploader_name, u.username AS uploader_username
    FROM piket_logs p
    JOIN users u ON u.id = p.uploaded_by
    ORDER BY p.piket_date DESC, p.created_at DESC
    LIMIT 12
  `;

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="badge !bg-[#ffdb59] mb-2 flex items-center gap-1.5 w-fit">
            <Broom size={16} weight="fill" /> Kebersihan Kelas · X SIJA B
          </span>
          <h1 className="page-title">Jadwal & Foto Piket.</h1>
          <p className="text-sm text-[#555951]">
            Jadwal 32 siswa, koordinator penanggung jawab (⭐), dan wajib setor foto dokumentasi kebersihan setiap hari.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/dashboard" className="btn-secondary text-xs">
            ← Beranda
          </Link>
          <Link href="/kalender" className="btn-secondary text-xs">
            <CalendarBlank size={15} /> Kalender Kelas
          </Link>
        </div>
      </header>

      <Notice {...params} />

      {/* SECTION 1: PIKET HARI INI & STATUS DOKUMENTASI */}
      <section className="panel p-6 sm:p-8 bg-[#fffef9] border-2 border-[#20201e] space-y-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b-2 border-[#20201e]/20 pb-4">
          <div>
            <span className="badge !bg-[#345bdc] text-white text-xs font-black mb-1">HARI INI</span>
            <h2 className="text-2xl sm:text-3xl font-black">
              Piket Hari {todayInfo.schedule.dayName}
            </h2>
            <p className="text-xs text-[#555951] mt-0.5">
              Koordinator Penanggung Jawab:{" "}
              <strong className="text-[#20201e]">⭐ {todayInfo.schedule.coordinator.name}</strong>
            </p>
          </div>

          <span
            className={`badge text-xs flex items-center gap-1 ${
              todayDoc ? "!bg-[#b9e2ce] text-[#113a27]" : "!bg-[#ffa18b] text-[#481c17]"
            }`}
          >
            {todayDoc ? (
              <>
                <CheckCircle size={15} weight="fill" /> Sudah Difoto & Rapi
              </>
            ) : (
              <>
                <Warning size={15} weight="fill" /> Belum Ada Foto Dokumentasi
              </>
            )}
          </span>
        </div>

        {/* Anggota Regu Piket Hari Ini */}
        <div className="space-y-2">
          <span className="text-xs font-black uppercase text-[#555951] tracking-wider block">
            Anggota Regu Bertugas ({todayInfo.schedule.members.length} Siswa):
          </span>
          <div className="flex flex-wrap gap-2">
            {todayInfo.schedule.members.map((m) => (
              <span
                key={m.name}
                className={`border-2 border-[#20201e] px-3 py-1 rounded-[6px] text-xs font-black flex items-center gap-1 shadow-[2px_2px_0_#20201e] ${
                  m.isCoordinator ? "bg-[#ffdb59] text-[#20201e]" : "bg-white text-[#20201e]"
                }`}
              >
                {m.isCoordinator ? <Sparkle size={13} weight="fill" className="text-[#d97706]" /> : null}
                {m.name} {m.isCoordinator ? "(⭐ Koordinator)" : ""}
              </span>
            ))}
          </div>
        </div>

        {/* Kondisi Dokumentasi Hari Ini */}
        {todayDoc ? (
          <div className="border-2 border-[#20201e] rounded-[10px] p-5 bg-[#b9e2ce]/20 space-y-4 shadow-[2px_2px_0_#20201e]">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#20201e]/20 pb-3">
              <span className="font-black text-sm text-[#113a27] flex items-center gap-1.5">
                <CheckCircle size={18} weight="fill" /> Bukti Kebersihan Hari Ini Sudah Masuk!
              </span>
              <span className="text-xs text-[#555951]">
                Diunggah oleh: <strong>{todayDoc.uploader_name}</strong> · {formatDate(todayDoc.created_at)}
              </span>
            </div>

            <div className="grid md:grid-cols-2 gap-4 items-start">
              <div className="border-2 border-[#20201e] rounded-[8px] overflow-hidden max-h-[360px] bg-white flex items-center justify-center">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={todayDoc.photo_url}
                  alt="Foto Kebersihan Hari Ini"
                  className="w-full object-cover max-h-[360px]"
                />
              </div>

              <div className="space-y-3">
                <div className="bg-white p-3.5 rounded-[8px] border border-[#20201e]/20">
                  <span className="text-xs font-bold text-[#555951] block uppercase mb-1">
                    Catatan Kebersihan:
                  </span>
                  <p className="text-sm font-medium leading-relaxed italic text-[#20201e]">
                    &ldquo;{todayDoc.note || "Kelas sudah bersih, lantai disapu & dipel, sampah terbuang."}&rdquo;
                  </p>
                </div>

                <p className="text-xs text-[#555951] leading-5">
                  Terima kasih regu piket hari ini dan koordinator{" "}
                  <strong>⭐ {todayInfo.schedule.coordinator.name}</strong> atas dedikasinya menjaga ruang kelas kita tetap nyaman belajar!
                </p>

                {user.role === "ADMIN" || user.id === todayDoc.uploaded_by ? (
                  <form action={deletePiketPhotoAction} className="pt-2">
                    <input type="hidden" name="logId" value={todayDoc.id} />
                    <button
                      type="submit"
                      className="text-xs text-[#d94833] hover:underline font-bold flex items-center gap-1"
                    >
                      <Trash size={14} /> Hapus & ganti foto ini
                    </button>
                  </form>
                ) : null}
              </div>
            </div>
          </div>
        ) : (
          <div className="pt-2">
            <PiketUpload dayName={todayInfo.schedule.dayName} />
          </div>
        )}
      </section>

      {/* SECTION 2: JADWAL LENGKAP SENIN - JUMAT */}
      <section className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-2xl font-black flex items-center gap-2">
              <CalendarBlank size={24} weight="bold" />
              Jadwal Lengkap Senin — Jumat
            </h2>
            <p className="text-xs text-[#555951] mt-0.5">
              32 siswa kelas X SIJA B terbagi merata dengan 1 penanggung jawab (⭐) per hari.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {PIKET_SCHEDULE.map((day) => {
            const isToday = day.dayKey === todayInfo.activeDayKey;
            return (
              <article
                key={day.dayKey}
                className={`panel p-5 space-y-3.5 border-2 border-[#20201e] shadow-[3px_3px_0_#20201e] ${
                  isToday ? "bg-[#ffdb59]/40 ring-2 ring-[#20201e]" : "bg-white"
                }`}
              >
                <div className="flex items-center justify-between border-b-2 border-[#20201e]/20 pb-2.5">
                  <div>
                    <h3 className="text-xl font-black tracking-tight">{day.dayName}</h3>
                    <p className="text-[11px] text-[#555951]">{day.members.length} Anggota</p>
                  </div>
                  {isToday ? (
                    <span className="badge !bg-[#345bdc] text-white text-[10px]">HARI INI</span>
                  ) : null}
                </div>

                {/* Koordinator Highlight */}
                <div className="bg-[#ffdb59] border-2 border-[#20201e] rounded-[7px] p-2.5 shadow-[2px_2px_0_#20201e]">
                  <span className="text-[10px] font-black uppercase text-[#20201e]/80 block mb-0.5">
                    Penanggung Jawab (Koordinator):
                  </span>
                  <div className="flex items-center gap-1.5 font-black text-sm text-[#20201e]">
                    <Sparkle size={16} weight="fill" className="text-[#d97706]" />
                    {day.coordinator.name} ⭐
                  </div>
                </div>

                {/* Anggota List */}
                <div className="space-y-1.5 pt-1">
                  <span className="text-[11px] font-bold text-[#555951] uppercase block">
                    Regu Piket:
                  </span>
                  <ul className="divide-y divide-[#20201e]/10 text-xs">
                    {day.members.map((m) => (
                      <li key={m.name} className="py-1.5 flex items-center justify-between">
                        <span className={m.isCoordinator ? "font-black text-[#20201e]" : "text-[#353930]"}>
                          {m.name}
                        </span>
                        {m.isCoordinator ? (
                          <span className="badge !bg-[#ffdb59] text-[10px] py-0 px-1.5">PJ ⭐</span>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              </article>
            );
          })}
        </div>
      </section>

      {/* SECTION 3: GALERI ARSIP FOTO PIKET KELAS */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-black flex items-center gap-2">
              <Camera size={24} weight="bold" />
              Galeri Arsip Foto Piket ({pastLogs.length})
            </h2>
            <p className="text-xs text-[#555951] mt-0.5">
              Bukti visual kebersihan kelas dari hari-hari sebelumnya.
            </p>
          </div>
        </div>

        {pastLogs.length ? (
          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4">
            {pastLogs.map((log) => (
              <div
                key={log.id}
                className="border-2 border-[#20201e] rounded-[8px] bg-white overflow-hidden shadow-[3px_3px_0_#20201e] flex flex-col justify-between"
              >
                <div className="relative aspect-video bg-stone-100 border-b-2 border-[#20201e] overflow-hidden">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={log.photo_url} alt="Foto Piket" className="w-full h-full object-cover" />
                  <span className="absolute top-2 left-2 badge !bg-white text-[11px] font-black">
                    {log.day_name}
                  </span>
                </div>

                <div className="p-3.5 space-y-2 text-xs flex-1 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between text-[#555951] text-[11px] mb-1">
                      <span>{formatDate(log.piket_date)}</span>
                      <span>Oleh: <strong>{log.uploader_name.split(" ")[0]}</strong></span>
                    </div>
                    {log.note ? (
                      <p className="text-[#20201e] italic line-clamp-2">&ldquo;{log.note}&rdquo;</p>
                    ) : (
                      <p className="text-[#555951] italic">Piket selesai rapi.</p>
                    )}
                  </div>

                  {user.role === "ADMIN" || user.id === log.uploaded_by ? (
                    <form action={deletePiketPhotoAction} className="pt-2 border-t border-[#20201e]/15 flex justify-end">
                      <input type="hidden" name="logId" value={log.id} />
                      <button
                        type="submit"
                        className="text-[11px] text-[#d94833] hover:underline font-bold flex items-center gap-1"
                      >
                        <Trash size={12} /> Hapus
                      </button>
                    </form>
                  ) : null}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="panel p-8 text-center bg-[#fffef9] border-2 border-dashed border-[#20201e]">
            <Camera size={36} className="mx-auto text-[#555951] mb-2" />
            <h4 className="text-base font-bold">Belum ada foto arsip piket.</h4>
            <p className="text-xs text-[#555951] mt-1">
              Foto yang diunggah regu piket setiap hari akan tersimpan di galeri ini.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
