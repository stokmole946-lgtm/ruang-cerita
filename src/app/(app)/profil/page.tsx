import { changePasswordAction, logoutAction, updateContactAction } from "@/app/actions";
import { Notice } from "@/components/notice";
import { requireUser } from "@/lib/auth";
import { sql } from "@/lib/db";

export default async function ProfilePage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  const user = await requireUser("STUDENT");
  const params = await searchParams;

  const [dbUser] = await sql`SELECT whatsapp, avatar FROM users WHERE id = ${user.id}`;

  return (
    <div className="space-y-6 max-w-3xl">
      <header>
        <h1 className="page-title">Profil akun.</h1>
        <p className="text-sm text-[#555951]">Informasi akun dan pengaturan keamanan kamu.</p>
      </header>

      <Notice {...params} />

      <section className="panel p-6 sm:p-8 space-y-6">
        <div className="border-b-2 border-[#20201e] pb-6 space-y-4">
          <div className="flex items-center gap-4">
            <div className="size-16 rounded-[10px] bg-[#ffdb59] border-2 border-[#20201e] shadow-[3px_3px_0_#20201e] overflow-hidden flex items-center justify-center font-black text-2xl shrink-0">
              {dbUser?.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={dbUser.avatar} alt={user.fullName} className="size-full object-cover" />
              ) : (
                <span>{user.fullName.slice(0, 1)}</span>
              )}
            </div>
            <div>
              <h2 className="text-2xl font-extrabold">{user.fullName}</h2>
              <p className="text-sm text-[#555951]">Siswa · X SIJA B</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4 pt-2">
            <div className="border border-[#20201e] rounded-[7px] p-3 bg-[#eeeee5]">
              <span className="block text-xs font-bold text-[#555951]">USERNAME</span>
              <span className="text-base font-extrabold">@{user.username}</span>
            </div>
            <div className="border border-[#20201e] rounded-[7px] p-3 bg-[#eeeee5]">
              <span className="block text-xs font-bold text-[#555951]">KELAS</span>
              <span className="text-base font-extrabold">X SIJA B</span>
            </div>
          </div>
        </div>

        <div>
          <h3 className="text-xl font-extrabold mb-2">Ganti password</h3>
          <p className="text-sm text-[#555951] mb-4">
            Gunakan password minimal 8 karakter yang mudah kamu ingat dan tidak dibagikan ke orang lain.
          </p>
          <form action={changePasswordAction} className="space-y-4">
            <input type="hidden" name="from" value="profil" />
            <label className="block font-bold text-sm">
              Password baru
              <input
                className="field mt-1"
                type="password"
                name="password"
                minLength={8}
                required
                placeholder="Minimal 8 karakter"
              />
            </label>
            <label className="block font-bold text-sm">
              Ulangi password baru
              <input
                className="field mt-1"
                type="password"
                name="confirmation"
                minLength={8}
                required
                placeholder="Ketik sekali lagi"
              />
            </label>
            <button className="btn-primary" type="submit">
              Perbarui password
            </button>
          </form>
        </div>

        <div className="border-t-2 border-[#20201e] pt-6 space-y-4">
          <div>
            <h3 className="text-xl font-extrabold">Kontak Darurat / WhatsApp</h3>
            <p className="text-sm text-[#555951] mt-1">
              Pengurus bisa menghubungimu lewat nomor ini saat kamu kirim cerita <strong>mendesak</strong> dengan nama terbuka.
            </p>
          </div>
          <form action={updateContactAction} className="space-y-3">
            <label className="block font-bold text-sm">
              Nomor WhatsApp
              <input
                className="field mt-1 w-full max-w-md"
                type="tel"
                name="whatsapp"
                defaultValue={dbUser?.whatsapp ?? ""}
                placeholder="Contoh: 081234567890"
              />
            </label>
            <button className="btn-secondary !min-h-[40px] text-xs font-black" type="submit">
              Simpan Nomor WhatsApp
            </button>
          </form>
        </div>

        <div className="border-t-2 border-[#20201e] pt-6 flex items-center justify-between">
          <div>
            <p className="font-bold text-sm">Keluar dari akun?</p>
            <p className="text-xs text-[#555951]">Sesi di perangkat ini akan diakhiri.</p>
          </div>
          <form action={logoutAction}>
            <button className="btn-danger" type="submit">
              Keluar akun
            </button>
          </form>
        </div>
      </section>
    </div>
  );
}
