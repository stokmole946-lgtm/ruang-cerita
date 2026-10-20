import {
  ChatTeardropDots,
  CheckCircle,
  Clock,
  HeartBreak,
  PaperPlaneTilt,
  ShieldCheck,
  Siren,
  Trash,
  User,
} from "@phosphor-icons/react/dist/ssr";
import { deleteCurhatAction, submitCurhatAction } from "@/app/curhat-actions";
import { Notice } from "@/components/notice";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";
import { formatDate } from "@/lib/time";

export default async function CurhatPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const user = await requireUser("STUDENT");
  const params = await searchParams;

  const curhats = await sql`
    SELECT c.*, u.full_name AS replier_name
    FROM student_curhats c
    LEFT JOIN users u ON u.id = c.replied_by
    WHERE c.student_id = ${user.id}
    ORDER BY c.created_at DESC
  `;

  return (
    <div className="space-y-7 max-w-4xl">
      {/* Header */}
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="badge !bg-[#c5d3ff] mb-2 flex items-center gap-1.5 w-fit">
            <ChatTeardropDots size={16} weight="fill" /> Ruang Curhat Bebas · X SIJA B
          </span>
          <h1 className="page-title">Cerita aja dulu.</h1>
          <p className="text-sm text-[#555951]">
            Nggak harus nunggu masalah besar. Kalau pengin cerita, di sini tempatnya.
          </p>
        </div>
        <span className="badge !bg-[#b9e2ce]">Kapan Saja</span>
      </header>

      <Notice {...params} />

      {/* Form Curhat Baru */}
      <section className="panel p-6 sm:p-8 bg-[#fffef9] space-y-6">
        <div className="border-b-2 border-[#20201e] pb-4">
          <span className="badge !bg-[#ffdb59] text-xs font-black mb-1">GILIRAN KAMU CERITA</span>
          <h2 className="text-2xl font-black">Ada apa hari ini? Tumpahkan di sini.</h2>
          <p className="text-xs text-[#555951] mt-1">
            Ceritakan masalah pelajaran, unek-unek kelas, capek, atau hal personal yang ingin kamu sampaikan ke pengurus.
          </p>
        </div>

        <form action={submitCurhatAction} className="space-y-5">
          <label className="block">
            <span className="block text-sm font-black mb-2 text-[#20201e]">
              Isi Curhatmu <span className="text-[#d94833]">*</span>
            </span>
            <textarea
              name="content"
              required
              rows={5}
              minLength={3}
              maxLength={5000}
              placeholder="Belakangan ini aku ngerasa…"
              className="field w-full leading-relaxed resize-y"
            />
            <span className="block text-right text-[11px] text-[#555951] mt-1">
              Bebas tulis dengan bahasamu sendiri (3 - 5000 karakter).
            </span>
          </label>

          <div className="grid sm:grid-cols-2 gap-3 pt-1">
            {/* Opsi Urgent */}
            <label className="border-2 border-[#20201e] rounded-[8px] p-3.5 bg-[#ffa18b]/15 hover:bg-[#ffa18b]/25 cursor-pointer flex items-start gap-3 transition">
              <input type="checkbox" name="urgent" className="mt-0.5 size-5 accent-[#d94833]" />
              <div className="text-xs leading-5">
                <span className="font-black text-[#d94833] flex items-center gap-1">
                  <Siren size={15} weight="fill" /> Ini Mendesak / Butuh Bantuan Cepat
                </span>
                <p className="text-[#555951] mt-0.5">
                  Tandai jika kamu merasa tertekan, butuh mediasi segera, atau ada kendala genting.
                </p>
              </div>
            </label>

            {/* Opsi Anonim */}
            <label className="border-2 border-[#20201e] rounded-[8px] p-3.5 bg-[#c5d3ff]/15 hover:bg-[#c5d3ff]/25 cursor-pointer flex items-start gap-3 transition">
              <input type="checkbox" name="isAnonymous" className="mt-0.5 size-5 accent-[#345bdc]" />
              <div className="text-xs leading-5">
                <span className="font-black text-[#345bdc] flex items-center gap-1">
                  <ShieldCheck size={15} weight="fill" /> Kirim sebagai Anonim
                </span>
                <p className="text-[#555951] mt-0.5">
                  Namamu akan disembunyikan dari pengurus kelas agar kamu lebih nyaman bercerita.
                </p>
              </div>
            </label>
          </div>

          <div className="pt-2 flex flex-wrap items-center justify-between gap-4">
            <button type="submit" className="btn-primary !min-h-[48px] !px-6 !text-base">
              <PaperPlaneTilt size={20} weight="bold" /> Kirim ceritaku
            </button>
            <span className="text-xs text-[#555951] font-medium">
              Pengurus kelas akan membaca dan memberikan solusi secepatnya.
            </span>
          </div>
        </form>
      </section>

      {/* Riwayat Curhat Pribadi */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-black flex items-center gap-2">
            <Clock size={22} weight="bold" />
            Riwayat Curhatmu ({curhats.length})
          </h2>
          <span className="text-xs text-[#555951]">Hanya kamu dan pengurus yang dapat melihat</span>
        </div>

        {curhats.length ? (
          <div className="space-y-4">
            {curhats.map((c) => {
              const isDone = c.status === "DONE";
              const isInProgress = c.status === "IN_PROGRESS";
              const statusBadge = isDone
                ? { label: "Sudah Diberi Solusi", bg: "!bg-[#b9e2ce]", icon: CheckCircle }
                : isInProgress
                ? { label: "Sedang Ditangani", bg: "!bg-[#ffdb59]", icon: Clock }
                : { label: "Menunggu Pengurus", bg: "!bg-stone-200", icon: Clock };
              const StatusIcon = statusBadge.icon;

              return (
                <article
                  key={c.id}
                  className={`panel p-5 sm:p-6 space-y-4 border-2 border-[#20201e] shadow-[3px_3px_0_#20201e] ${
                    c.urgent ? "bg-[#ffa18b]/15" : "bg-white"
                  }`}
                >
                  {/* Top Bar Card */}
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-[#20201e]/20 pb-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`badge text-xs flex items-center gap-1 ${statusBadge.bg}`}>
                        <StatusIcon size={14} weight="fill" />
                        {statusBadge.label}
                      </span>
                      {c.is_anonymous ? (
                        <span className="badge !bg-[#c5d3ff] text-xs flex items-center gap-1">
                          <ShieldCheck size={14} weight="fill" /> Dikirim Anonim
                        </span>
                      ) : (
                        <span className="badge !bg-white text-xs flex items-center gap-1">
                          <User size={14} weight="bold" /> Nama Terbuka
                        </span>
                      )}
                      {c.urgent ? (
                        <span className="badge !bg-[#ffa18b] text-xs flex items-center gap-1">
                          <Siren size={14} weight="fill" /> PRIORITAS TINGGI
                        </span>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-[#555951]">
                      <span>Dikirim: {formatDate(c.created_at)}</span>
                      {c.status === "NEW" ? (
                        <form action={deleteCurhatAction}>
                          <input type="hidden" name="curhatId" value={c.id} />
                          <button
                            type="submit"
                            title="Batalkan curhat"
                            className="text-[#d94833] hover:underline flex items-center gap-1 font-bold"
                          >
                            <Trash size={14} /> Batalkan
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>

                  {/* Isi Curhat */}
                  <div className="space-y-2">
                    <p className="text-base text-[#20201e] whitespace-pre-wrap leading-relaxed">
                      {c.content}
                    </p>
                  </div>

                  {/* Solusi dari Pengurus */}
                  {c.reply ? (
                    <div className="mt-4 pt-4 border-t-2 border-[#20201e] rounded-[8px] bg-[#b9e2ce]/30 p-4 space-y-2 border-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="font-extrabold text-[#113a27] flex items-center gap-1.5 uppercase">
                          <CheckCircle size={16} weight="fill" /> Solusi / Balasan dari Pengurus:
                        </span>
                        {c.replied_at ? (
                          <span className="text-[#555951]">{formatDate(c.replied_at)}</span>
                        ) : null}
                      </div>
                      <p className="text-sm text-[#20201e] whitespace-pre-wrap leading-relaxed font-medium">
                        {c.reply}
                      </p>
                    </div>
                  ) : (
                    <div className="pt-2 text-xs text-[#555951] italic flex items-center gap-1.5">
                      <Clock size={15} />
                      Curhatmu sudah masuk ke dashboard pengurus dan sedang menunggu respons.
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        ) : (
          <div className="panel p-8 text-center bg-[#fffef9] border-2 border-dashed border-[#20201e]">
            <HeartBreak size={36} className="mx-auto text-[#555951] mb-2" />
            <h3 className="text-lg font-bold">Belum ada curhat yang kamu kirimkan.</h3>
            <p className="text-xs text-[#555951] mt-1">
              Ada hal yang mengganjal atau butuh bantuan pengurus? Tulis di formulir di atas kapan pun kamu mau.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}
