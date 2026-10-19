import type { SessionUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import { sql } from "@/lib/db";
import { getTodayPiketInfo } from "@/lib/piket";
import { Brand } from "./brand";
import { Navigation, type NavBadges } from "./navigation";

export async function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const admin = user.role === "ADMIN";
  const todayInfo = getTodayPiketInfo();

  // Cek apakah hari ini piket belum difoto
  const [todayPiketDoc] = await sql`
    SELECT id FROM piket_logs WHERE piket_date = ${todayInfo.todayDateISO}::date LIMIT 1
  `;
  const piketNeedPhoto = !todayInfo.isWeekend && !todayPiketDoc;

  const badges: NavBadges = {};

  if (piketNeedPhoto) {
    badges["/piket"] = { text: "Foto", color: "warning" };
  }

  if (admin) {
    const [stats] = await sql`
      SELECT
        COUNT(*) FILTER (WHERE status = 'NEW')::int AS pending_curhat
      FROM student_curhats
    `;
    if (stats.pending_curhat > 0) {
      badges["/pengurus/curhat"] = { text: stats.pending_curhat, color: "danger" };
    }
  } else {
    const [inbox] = await sql`
      SELECT COUNT(*)::int AS count
      FROM monthly_reports
      WHERE recipient_id = ${user.id} AND forwarded_at IS NOT NULL
    `;
    if (inbox.count > 0) {
      badges["/kotak-masuk"] = { text: inbox.count, color: "info" };
    }
  }

  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <Brand />
        <Navigation admin={admin} badges={badges} />
        <div className="app-user">
          <strong>{user.fullName}</strong>
          <p className="mt-1 text-xs">
            {admin ? "Pengurus" : "Siswa"} · X SIJA B
          </p>
          <form action={logoutAction}>
            <button className="mt-4 font-bold underline" type="submit">
              Keluar dari akun
            </button>
          </form>
        </div>
      </aside>

      <div className="mobile-header">
        <Brand />
        <form action={logoutAction}>
          <button className="badge" type="submit">
            Keluar
          </button>
        </form>
      </div>

      <main className="app-main">{children}</main>

      <Navigation admin={admin} mobile badges={badges} />
    </div>
  );
}
