"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRef } from "react";
import { logoutAction } from "@/app/actions";
import {
  House,
  Notebook,
  CalendarBlank,
  EnvelopeSimple,
  UserCircle,
  Users,
  Megaphone,
  ChatTeardropDots,
  Broom,
  Chats,
  QrCode,
  Scan,
  List,
  X,
} from "@phosphor-icons/react";

export interface NavBadges {
  [path: string]: {
    text: string | number;
    color?: "danger" | "warning" | "success" | "info";
  } | null | undefined;
}

export function Navigation({
  admin,
  mobile = false,
  badges = {},
}: {
  admin: boolean;
  mobile?: boolean;
  badges?: NavBadges;
}) {
  const pathname = usePathname();
  const dialog = useRef<HTMLDialogElement>(null);
  const closeMenu = () => { dialog.current?.close(); document.body.style.overflow = ""; };
  const openMenu = () => { dialog.current?.showModal(); document.body.style.overflow = "hidden"; };
  const links = admin
    ? ([
        ["/pengurus", "Dashboard", House],
        ["/chat", "Chat kelas", Chats],
        ["/pengurus/absen", "Absensi", Scan],
        ["/pengurus/curhat", "Curhat Siswa", ChatTeardropDots],
        ["/piket", "Piket Kelas", Broom],
        ["/pengurus/laporan", "Laporan Bulanan", Notebook],
        ["/pengurus/siswa", "Siswa", Users],
        ["/kalender", "Kalender", CalendarBlank],
        ["/pengumuman", "Info kelas", Megaphone],
      ] as const)
    : ([
        ["/dashboard", "Beranda", House],
        ["/chat", "Chat kelas", Chats],
        ["/absen", "Absensi", QrCode],
        ["/curhat", "Curhat", ChatTeardropDots],
        ["/piket", "Piket Kelas", Broom],
        ["/riwayat", "Laporan", Notebook],
        ["/kalender", "Kalender", CalendarBlank],
        ["/kotak-masuk", "Kotak masuk", EnvelopeSimple],
        ["/profil", "Profil", UserCircle],
      ] as const);

  if (mobile) {
    const primary = admin
      ? ([
          ["/pengurus", "Beranda", House],
          ["/chat", "Chat", Chats],
          ["/pengurus/absen", "Absen", Scan],
          ["/pengurus/curhat", "Curhat", ChatTeardropDots],
        ] as const)
      : ([
          ["/dashboard", "Beranda", House],
          ["/chat", "Chat", Chats],
          ["/absen", "Absen", QrCode],
          ["/curhat", "Curhat", ChatTeardropDots],
        ] as const);

    const extra = [
      ...links.filter(([href]) => !primary.some(([path]) => path === href)),
      ...(!admin ? ([["/pengumuman", "Info kelas", Megaphone]] as const) : []),
    ];

    const extraActive = extra.some(([href]) => pathname === href);

    const extraBadgeCount = extra.reduce((acc, [href]) => {
      const b = badges[href];
      if (!b) return acc;
      if (typeof b.text === "number") return acc + b.text;
      return acc + 1;
    }, 0);

    return (
      <>
        <nav className="mobile-tabs" aria-label="Navigasi HP">
          {primary.map(([href, label, Icon]) => {
            const badge = badges[href];
            const active =
              pathname === href || (href !== "/pengurus" && href !== "/dashboard" && pathname.startsWith(href + "/"));
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined}>
                <span className="tab-icon">
                  <Icon size={22} weight={active ? "fill" : "bold"} />
                  {badge && (
                    <span className="tab-count" aria-label={`${badge.text} pemberitahuan`}>
                      {badge.text === "Foto" ? "!" : badge.text}
                    </span>
                  )}
                </span>
                <span>{label}</span>
              </Link>
            );
          })}
          <button
            type="button"
            onClick={openMenu}
            aria-haspopup="dialog"
            className={extraActive ? "tab-selected" : ""}
          >
            <span className="tab-icon">
              <List size={22} weight={extraActive ? "bold" : "regular"} />
              {extraBadgeCount > 0 && (
                <span className="tab-count" aria-label={`${extraBadgeCount} pemberitahuan di menu lainnya`}>
                  {extraBadgeCount}
                </span>
              )}
            </span>
            <span>Lainnya</span>
          </button>
        </nav>
        <dialog
          ref={dialog}
          className="mobile-menu-sheet"
          onClose={() => {
            document.body.style.overflow = "";
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeMenu();
          }}
          aria-labelledby="mobile-menu-title"
        >
          <div className="sheet-content">
            <div className="sheet-heading">
              <div>
                <p className="kicker">X SIJA B · {admin ? "Pengurus" : "Ruang Siswa"}</p>
                <h2 id="mobile-menu-title">Menu Lainnya</h2>
              </div>
              <button type="button" onClick={closeMenu} aria-label="Tutup menu">
                <X size={22} weight="bold" />
              </button>
            </div>
            <nav aria-label="Menu lainnya">
              {extra.map(([href, label, Icon]) => {
                const badge = badges[href];
                const active = pathname === href;
                return (
                  <Link
                    key={href}
                    href={href}
                    onClick={closeMenu}
                    aria-current={active ? "page" : undefined}
                    className="flex items-center gap-3 p-3 rounded-[10px] border-2 border-[#20201e] bg-[#fffef9] shadow-[2px_2px_0_#20201e] font-bold text-sm"
                  >
                    <Icon size={22} weight={active ? "fill" : "bold"} />
                    <span className="flex-1">{label}</span>
                    {badge && (
                      <span className="badge text-[10px] font-black !bg-[#ffa18b] !text-[#481c17]">
                        {badge.text}
                      </span>
                    )}
                    <span aria-hidden="true" className="text-xs opacity-60">
                      →
                    </span>
                  </Link>
                );
              })}
            </nav>
            <form action={logoutAction} className="mt-4">
              <button className="btn-danger w-full !min-h-[44px] text-xs font-black" type="submit">
                Keluar dari akun
              </button>
            </form>
          </div>
        </dialog>
      </>
    );
  }

  return (
    <nav className={mobile ? "mobile-nav" : ""} aria-label={mobile ? "Navigasi utama mobile" : "Navigasi utama"}>
      {links.map(([href, label, Icon]) => {
        const badge = badges[href];
        const isCurrent =
          pathname === href || (href !== "/pengurus" && href !== "/dashboard" && pathname.startsWith(href + "/"));

        const badgeBg =
          badge?.color === "danger"
            ? "bg-[#ffa18b] text-[#481c17]"
            : badge?.color === "warning"
            ? "bg-[#ffdb59] text-[#20201e]"
            : badge?.color === "success"
            ? "bg-[#b9e2ce] text-[#113a27]"
            : "bg-[#c5d3ff] text-[#1b2b65]";

        return (
          <Link
            key={href}
            href={href}
            className="nav-link relative flex items-center justify-between"
            aria-current={isCurrent ? "page" : undefined}
          >
            <div className="flex items-center gap-2">
              <Icon size={22} weight="bold" />
              <span>{label}</span>
            </div>

            {badge && (
              <span
                className={`text-[10px] font-black px-1.5 py-0.2 rounded-full border border-[#20201e] shadow-[1px_1px_0_#20201e] ${badgeBg}`}
              >
                {badge.text}
              </span>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
