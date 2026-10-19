import { redirect } from "next/navigation";
import { changePasswordAction } from "@/app/actions";
import { Brand } from "@/components/brand";
import { Notice } from "@/components/notice";
import { getSession } from "@/lib/auth";

export default async function ChangePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>;
}) {
  const user = await getSession();
  if (!user) redirect("/login");
  const params = await searchParams;

  return (
    <main className="auth-page">
      <div className="auth-top">
        <Brand />
        <span className="badge">Keamanan Akun</span>
      </div>
      <div className="auth-content !max-w-xl !grid-cols-1">
        <section className="panel auth-card">
          <span className="badge !bg-[#b9e2ce]">Opsional</span>
          <h1 className="text-3xl font-extrabold mt-3">Ganti password.</h1>
          <p className="mt-2 text-sm text-[#555951]">
            Hai <strong>{user.fullName}</strong>! Kalau ingin mengganti password <code>123</code> dengan password pribadi (min. 8 karakter), silakan isi di bawah.
          </p>

          <form action={changePasswordAction} className="mt-6 space-y-4">
            <Notice error={params.error} success={params.success} />
            <input type="hidden" name="from" value="ganti-password" />
            <label className="block">
              <span className="block text-sm font-bold mb-1">Password baru</span>
              <input
                name="password"
                type="password"
                minLength={8}
                required
                className="field"
                placeholder="Minimal 8 karakter"
              />
            </label>
            <label className="block">
              <span className="block text-sm font-bold mb-1">Ulangi password</span>
              <input
                name="confirmation"
                type="password"
                minLength={8}
                required
                className="field"
                placeholder="Ketik sekali lagi"
              />
            </label>
            <button className="btn-primary w-full mt-2" type="submit">
              Simpan password baru →
            </button>
          </form>
        </section>
      </div>
    </main>
  );
}
