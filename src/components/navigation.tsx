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
        ["/curhat", "Curhat", ChatTeardropDots],
        ["/piket", "Piket Kelas", Broom],
        ["/riwayat", "Laporan", Notebook],
        ["/kalender", "Kalender", CalendarBlank],
        ["/kotak-masuk", "Kotak masuk", EnvelopeSimple],
        ["/profil", "Profil", UserCircle],
      ] as const);

  if (mobile) {
    const primary = admin
      ? [["/pengurus", "Beranda", House], ["/pengurus/curhat", "Curhat", ChatTeardropDots], ["/piket", "Piket", Broom], ["/pengurus/laporan", "Laporan", Notebook]] as const
      : [["/dashboard", "Beranda", House], ["/curhat", "Curhat", ChatTeardropDots], ["/piket", "Piket", Broom], ["/kotak-masuk", "Pesan", EnvelopeSimple]] as const;
    const extra = [...links.filter(([href]) => !primary.some(([path]) => path === href)), ...(!admin ? [["/pengumuman", "Kabar kelas", Megaphone] as const] : [])];
    const extraActive = extra.some(([href]) => pathname === href);
    return <>
      <nav className="mobile-tabs" aria-label="Navigasi HP">
        {primary.map(([href, label, Icon]) => <Link key={href} href={href} aria-current={pathname === href || (href !== "/pengurus" && pathname.startsWith(href + "/")) ? "page" : undefined}>
          <span className="tab-icon"><Icon size={23} weight={pathname === href ? "fill" : "regular"}/>{badges[href] && <span className="tab-count" aria-label={`${badges[href]?.text} pemberitahuan`}>{badges[href]?.text === "Foto" ? "!" : badges[href]?.text}</span>}</span><span>{label}</span>
        </Link>)}
        <button type="button" onClick={openMenu} aria-haspopup="dialog" className={extraActive ? "tab-selected" : ""}><span className="tab-icon"><List size={23}/></span><span>Lainnya</span></button>
      </nav>
      <dialog ref={dialog} className="mobile-menu-sheet" onClose={() => { document.body.style.overflow = ""; }} onClick={e => { if (e.target === e.currentTarget) closeMenu(); }} aria-labelledby="mobile-menu-title">
        <div className="sheet-content"><div className="sheet-heading"><div><p className="kicker">X SIJA B · {admin ? "Pengurus" : "Ruangmu"}</p><h2 id="mobile-menu-title">Mau ke mana?</h2></div><button type="button" onClick={closeMenu} aria-label="Tutup menu"><X size={24}/></button></div>
          <nav aria-label="Menu lainnya">{extra.map(([href,label,Icon]) => <Link key={href} href={href} onClick={closeMenu} aria-current={pathname === href ? "page" : undefined}><Icon size={23}/><span>{label}</span><span aria-hidden="true">→</span></Link>)}</nav>
          <form action={logoutAction}><button className="sheet-logout" type="submit">Keluar akun</button></form>
        </div>
      </dialog>
    </>;
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
