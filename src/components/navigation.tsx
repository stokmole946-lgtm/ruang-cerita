"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
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
  const links = admin
    ? ([
        ["/pengurus", "Dashboard", House],
        ["/pengurus/curhat", "Curhat Siswa", ChatTeardropDots],
        ["/piket", "Piket Kelas", Broom],
        ["/pengurus/laporan", "Laporan Bulanan", Notebook],
        ["/pengurus/siswa", "Siswa", Users],
        ["/kalender", "Kalender", CalendarBlank],
        ["/pengumuman", "Info kelas", Megaphone],
      ] as const)
    : ([
        ["/dashboard", "Beranda", House],
        ["/curhat", "Curhat", ChatTeardropDots],
        ["/piket", "Piket Kelas", Broom],
        ["/riwayat", "Laporan", Notebook],
        ["/kalender", "Kalender", CalendarBlank],
        ["/kotak-masuk", "Kotak masuk", EnvelopeSimple],
        ["/profil", "Profil", UserCircle],
      ] as const);

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
