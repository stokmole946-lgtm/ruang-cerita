import type { SessionUser } from "@/lib/auth";
import { logoutAction } from "@/app/actions";
import { sql } from "@/lib/db";
import { getTodayPiketInfo } from "@/lib/piket";
import { Brand } from "./brand";
import { Navigation, type NavBadges } from "./navigation";
import { AppDrawer } from "./app-drawer";

export async function AppShell({
  user,
  children,
}: {
  user: SessionUser;
  children: React.ReactNode;
}) {
  const admin = user.role === "ADMIN";
  const todayInfo = getTodayPiketInfo();

  // Ambil data profil terkini (avatar, whatsapp, bio)
  const [dbUser] = await sql`
    SELECT id, full_name, username, role, avatar, whatsapp, bio
    FROM users
    WHERE id = ${user.id}
  `;

  // Cek apakah hari ini piket belum difoto
  const [todayPiketDoc] = await sql`
    SELECT id FROM piket_logs WHERE piket_date = ${todayInfo.todayDateISO}::date LIMIT 1
  `;
  const piketNeedPhoto = !todayInfo.isWeekend && !todayPiketDoc;

  const badges: NavBadges = {};

  if (piketNeedPhoto) {
    badges["/piket"] = { text: "Foto", color: "warning" };
  }

  // Notifikasi chat yang belum dibaca
  const [chatUnread] = await sql`
    SELECT COUNT(*)::int AS count
    FROM chat_messages m
    JOIN chat_members mine ON mine.conversation_id = m.conversation_id
    WHERE mine.user_id = ${user.id}
      AND m.sender_id != ${user.id}
      AND m.created_at > COALESCE(mine.last_read_at, '1970-01-01'::timestamptz)
  `;
  if (chatUnread && chatUnread.count > 0) {
    badges["/chat"] = { text: chatUnread.count, color: "success" };
  }

  if (admin) {
    // Pengurus: notifikasi curhat siswa baru yang belum pernah dilihat pengurus
    const [stats] = await sql`
      SELECT
        COUNT(*)::int AS pending_curhat
      FROM student_curhats
      WHERE admin_read_at IS NULL
    `;
    if (stats && stats.pending_curhat > 0) {
      badges["/pengurus/curhat"] = { text: stats.pending_curhat, color: "danger" };
    }
  } else {
    // Siswa: kotak pesan masuk yang belum dibaca
    const [inbox] = await sql`
      SELECT COUNT(*)::int AS count
      FROM monthly_reports
      WHERE recipient_id = ${user.id}
        AND forwarded_at IS NOT NULL
        AND read_at IS NULL
    `;
    if (inbox && inbox.count > 0) {
      badges["/kotak-masuk"] = { text: inbox.count, color: "info" };
    }

    // Siswa: curhat yang baru saja dibalas pengurus dan belum dilihat siswa
    const [curhatReplied] = await sql`
      SELECT COUNT(*)::int AS count
      FROM student_curhats
      WHERE student_id = ${user.id}
        AND reply IS NOT NULL
        AND (student_read_at IS NULL OR student_read_at < replied_at)
    `;
    if (curhatReplied && curhatReplied.count > 0) {
      badges["/curhat"] = { text: curhatReplied.count, color: "success" };
    }
  }

  const drawerUserData = {
    id: user.id,
    fullName: dbUser?.full_name || user.fullName,
    username: dbUser?.username || user.username,
    role: dbUser?.role || user.role,
    avatar: dbUser?.avatar || null,
    whatsapp: dbUser?.whatsapp || null,
    bio: dbUser?.bio || null,
  };

  return (
    <div className="app-frame">
      <aside className="app-sidebar">
        <div className="flex items-center justify-between">
          <Brand />
          <AppDrawer user={drawerUserData} admin={admin} />
        </div>
        <Navigation admin={admin} badges={badges} />
        <div className="app-user">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-full border-2 border-[#20201e] overflow-hidden bg-[#ffdb59] flex items-center justify-center font-black text-sm shrink-0 shadow-[2px_2px_0_#20201e]">
              {drawerUserData.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={drawerUserData.avatar} alt={user.fullName} className="size-full object-cover" />
              ) : (
                <span>{user.fullName.slice(0, 1).toUpperCase()}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <strong className="block truncate text-sm">{user.fullName}</strong>
              <p className="text-[11px] text-[#555951]">
                {admin ? "Pengurus" : "Siswa"} · X SIJA B
              </p>
            </div>
          </div>
          <form action={logoutAction}>
            <button className="mt-3 text-xs font-bold text-[#d94833] hover:underline" type="submit">
              Keluar akun →
            </button>
          </form>
        </div>
      </aside>

      <div className="mobile-header">
        <div className="flex items-center gap-2">
          <AppDrawer user={drawerUserData} admin={admin} />
          <Brand compact />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="badge !bg-[#ffdb59] text-[10px] font-black">X SIJA B</span>
        </div>
      </div>

      <main className="app-main">{children}</main>

      <Navigation admin={admin} mobile badges={badges} />
    </div>
  );
}
