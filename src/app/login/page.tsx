import { redirect } from "next/navigation";
import { Brand } from "@/components/brand";
import { LoginForm } from "./login-form";
import { getSession } from "@/lib/auth";
export default async function LoginPage({searchParams}:{searchParams:Promise<{error?:string}>}) {
 if(await getSession()) redirect("/dashboard"); const params=await searchParams;
 return <main className="auth-page"><div className="auth-top"><Brand/><span className="badge">Satu kelas. Banyak cerita.</span></div><div className="auth-content"><section className="auth-poster"><h1>Cerita nggak<br/>harus <span>dipendam.</span></h1><p>Yang bikin capek, yang bikin senang, atau ide untuk kelas kita. Semua punya tempat di sini.</p><div className="category-strip"><span>Keluh</span><span>Pesan</span><span>Kesan</span><span>Saran</span></div></section><section className="panel auth-card"><h2>Masuk ke ruangmu.</h2><p>Pakai akun kelasmu. Ceritamu dibaca oleh pengurus terpilih.</p><LoginForm error={params.error}/><p className="login-help">Lupa password? Hubungi pengurus kelas untuk mengatur ulang akun.</p></section></div></main>;
}
