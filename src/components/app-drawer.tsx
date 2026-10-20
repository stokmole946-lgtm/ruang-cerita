'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Broom,
  CalendarBlank,
  Camera,
  Chats,
  ChatTeardropDots,
  EnvelopeSimple,
  GearSix,
  House,
  Key,
  List,
  Megaphone,
  Notebook,
  SignOut,
  UserCircle,
  WhatsappLogo,
  X,
} from '@phosphor-icons/react';
import { changePasswordAction, logoutAction, updateAvatarAction, updateContactAction } from '@/app/actions';

export interface DrawerUser {
  id: string;
  fullName: string;
  username: string;
  role: string;
  avatar: string | null;
  whatsapp: string | null;
  bio?: string | null;
}

function compressAvatar(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('Format foto tidak didukung'));
      img.onload = () => {
        const size = Math.min(img.width, img.height);
        const startX = (img.width - size) / 2;
        const startY = (img.height - size) / 2;
        const targetDim = 400;

        const canvas = document.createElement('canvas');
        canvas.width = targetDim;
        canvas.height = targetDim;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas tidak tersedia'));

        ctx.drawImage(img, startX, startY, size, size, 0, 0, targetDim, targetDim);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function AppDrawer({
  user,
  admin,
  trigger = 'header',
}: {
  user: DrawerUser;
  admin: boolean;
  trigger?: 'header' | 'button';
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'profile' | 'password' | 'nav'>('profile');
  const [avatarPreview, setAvatarPreview] = useState<string | null>(user.avatar);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const avatarFormRef = useRef<HTMLFormElement>(null);
  const avatarDataInputRef = useRef<HTMLInputElement>(null);
  const pathname = usePathname();

  const handleAvatarFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingAvatar(true);
      const base64 = await compressAvatar(file);
      setAvatarPreview(base64);

      if (avatarDataInputRef.current && avatarFormRef.current) {
        avatarDataInputRef.current.value = base64;
        avatarFormRef.current.requestSubmit();
      }
    } catch {
      alert('Gagal memproses foto. Silakan coba lagi.');
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const navLinks = admin
    ? [
        { href: '/pengurus', label: 'Beranda Pengurus', icon: House },
        { href: '/chat', label: 'Chat Kelas', icon: Chats },
        { href: '/pengurus/curhat', label: 'Kotak Curhat', icon: ChatTeardropDots },
        { href: '/piket', label: 'Piket Kelas', icon: Broom },
        { href: '/pengurus/laporan', label: 'Laporan Bulanan', icon: Notebook },
        { href: '/pengurus/siswa', label: 'Data Siswa', icon: UserCircle },
        { href: '/kalender', label: 'Kalender Agenda', icon: CalendarBlank },
        { href: '/pengumuman', label: 'Info Kelas', icon: Megaphone },
      ]
    : [
        { href: '/dashboard', label: 'Beranda', icon: House },
        { href: '/chat', label: 'Chat Kelas', icon: Chats },
        { href: '/curhat', label: 'Curhat Bebas', icon: ChatTeardropDots },
        { href: '/piket', label: 'Piket Kelas', icon: Broom },
        { href: '/riwayat', label: 'Laporan Bulanan', icon: Notebook },
        { href: '/kotak-masuk', label: 'Kotak Masuk', icon: EnvelopeSimple },
        { href: '/kalender', label: 'Kalender Agenda', icon: CalendarBlank },
        { href: '/pengumuman', label: 'Info Kelas', icon: Megaphone },
      ];

  return (
    <>
      {/* ── TRIGGER BUTTON ── */}
      {trigger === 'button' ? (
        <button
          type="button"
          onClick={() => {
            setActiveTab('password');
            setIsOpen(true);
          }}
          className="mt-2 text-xs font-bold text-[#345bdc] hover:underline flex items-center gap-1.5"
          title="Pengaturan akun & ganti password"
        >
          <GearSix size={14} weight="bold" />
          <span>Ganti Password & Profil</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="app-drawer-trigger"
          aria-label="Buka menu & profil"
          title="Buka menu & profil"
        >
          <span className="grid place-items-center size-8 rounded-[6px] bg-[#fffef9] border-2 border-[#20201e] shadow-[2px_2px_0_#20201e]">
            <List size={20} weight="bold" />
          </span>
          <div className="avatar-mini size-8 rounded-full border-2 border-[#20201e] overflow-hidden bg-[#ffdb59] flex items-center justify-center font-black text-xs shrink-0 shadow-[1px_1px_0_#20201e]">
            {avatarPreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarPreview} alt={user.fullName} className="size-full object-cover" />
            ) : (
              <span>{user.fullName.slice(0, 1).toUpperCase()}</span>
            )}
          </div>
        </button>
      )}

      {/* ── DRAWER MODAL OVERLAY ── */}
      {isOpen && (
        <div
          className="drawer-overlay fixed inset-0 z-[80] bg-black/60 backdrop-blur-sm flex justify-start animate-fade-in"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="drawer-panel w-full max-w-[380px] h-full bg-[#f5f2e9] border-r-2 border-[#20201e] shadow-[6px_0_0_#20201e] flex flex-col p-5 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Drawer Top Header */}
            <div className="flex items-center justify-between border-b-2 border-[#20201e] pb-4 mb-4">
              <div className="flex items-center gap-2">
                <span className="font-black text-lg tracking-tight">ruangcerita</span>
                <span className="badge !bg-[#ffdb59] text-[10px] font-black">X SIJA B</span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="grid place-items-center size-8 rounded-[6px] bg-[#fffef9] border-2 border-[#20201e] shadow-[2px_2px_0_#20201e] hover:bg-[#ffa18b] transition"
                aria-label="Tutup menu"
              >
                <X size={18} weight="bold" />
              </button>
            </div>

            {/* Profile Avatar Card */}
            <div className="panel p-4 bg-[#fffef9] border-2 border-[#20201e] shadow-[3px_3px_0_#20201e] rounded-[10px] space-y-3 mb-4">
              <div className="flex items-center gap-3">
                <div className="relative group shrink-0">
                  <div className="size-16 rounded-full border-2 border-[#20201e] overflow-hidden bg-[#ffdb59] flex items-center justify-center font-black text-2xl shadow-[2px_2px_0_#20201e]">
                    {avatarPreview ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={avatarPreview} alt={user.fullName} className="size-full object-cover" />
                    ) : (
                      <span>{user.fullName.slice(0, 1).toUpperCase()}</span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="absolute -bottom-1 -right-1 size-6 rounded-full bg-[#345bdc] text-white border border-[#20201e] grid place-items-center shadow hover:scale-110 transition"
                    title="Ganti foto profil"
                    aria-label="Ganti foto profil"
                  >
                    <Camera size={13} weight="bold" />
                  </button>
                </div>

                <div className="min-w-0 flex-1">
                  <h3 className="font-black text-base truncate">{user.fullName}</h3>
                  <p className="text-xs text-[#555951] font-bold">@{user.username}</p>
                  <span className="badge !bg-[#b9e2ce] text-[10px] mt-1 inline-block">
                    {admin ? 'Pengurus Kelas' : 'Siswa X SIJA B'}
                  </span>
                </div>
              </div>

              {/* Hidden file input & form for instant upload */}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                className="hidden"
                onChange={handleAvatarFile}
              />
              <form ref={avatarFormRef} action={updateAvatarAction} className="hidden">
                <input type="hidden" name="from" value={pathname} />
                <input type="hidden" name="avatar" ref={avatarDataInputRef} />
              </form>

              {isUploadingAvatar && (
                <p className="text-xs text-[#345bdc] font-bold animate-pulse text-center">
                  Mengunggah foto profil...
                </p>
              )}
            </div>

            {/* Quick Segmented Tabs (Profil / Ganti Password / Menu) */}
            <div className="grid grid-cols-3 gap-1.5 p-1 bg-[#eeeee5] border-2 border-[#20201e] rounded-[8px] mb-4 text-xs font-black">
              <button
                type="button"
                onClick={() => setActiveTab('profile')}
                className={`py-1.5 rounded-[5px] transition ${
                  activeTab === 'profile' ? 'bg-[#ffdb59] border border-[#20201e] shadow-[1px_1px_0_#20201e]' : 'text-[#555951]'
                }`}
              >
                Profil
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('password')}
                className={`py-1.5 rounded-[5px] transition ${
                  activeTab === 'password' ? 'bg-[#ffdb59] border border-[#20201e] shadow-[1px_1px_0_#20201e]' : 'text-[#555951]'
                }`}
              >
                Ganti PW
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('nav')}
                className={`py-1.5 rounded-[5px] transition ${
                  activeTab === 'nav' ? 'bg-[#ffdb59] border border-[#20201e] shadow-[1px_1px_0_#20201e]' : 'text-[#555951]'
                }`}
              >
                Navigasi
              </button>
            </div>

            {/* ── TAB 1: PROFIL & WHATSAPP ── */}
            {activeTab === 'profile' && (
              <div className="space-y-4">
                <form action={updateContactAction} className="panel p-4 bg-[#fffef9] border-2 border-[#20201e] rounded-[10px] shadow-[2px_2px_0_#20201e] space-y-3">
                  <div className="flex items-center gap-2">
                    <WhatsappLogo size={20} weight="fill" className="text-[#25d366]" />
                    <span className="text-xs font-black uppercase text-[#20201e]">Nomor WhatsApp</span>
                  </div>
                  <p className="text-[11px] text-[#555951]">
                    Diperlukan jika kamu mengirim laporan atau curhat mendesak dengan nama terbuka.
                  </p>
                  <input
                    type="tel"
                    name="whatsapp"
                    defaultValue={user.whatsapp ?? ''}
                    placeholder="Contoh: 081234567890"
                    className="field w-full text-xs"
                  />
                  <button type="submit" className="btn-secondary !min-h-[36px] w-full text-xs font-black">
                    Simpan WhatsApp
                  </button>
                </form>

                <div className="panel p-4 bg-[#fffef9] border-2 border-[#20201e] rounded-[10px] shadow-[2px_2px_0_#20201e] space-y-2">
                  <span className="text-xs font-black text-[#555951]">FOTO PROFIL</span>
                  <p className="text-[11px] text-[#555951]">
                    Foto profilmu akan otomatis tampil di obrolan kelas, bubble pesan grup, dan profilmu.
                  </p>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="btn-primary !min-h-[38px] w-full text-xs font-black flex items-center justify-center gap-2"
                  >
                    <Camera size={16} weight="bold" />
                    Pilih / Ganti Foto Profil
                  </button>
                </div>
              </div>
            )}

            {/* ── TAB 2: FITUR GANTI PASSWORD LANGSUNG ── */}
            {activeTab === 'password' && (
              <div className="panel p-4 bg-[#fffef9] border-2 border-[#20201e] rounded-[10px] shadow-[3px_3px_0_#20201e] space-y-4">
                <div className="flex items-center gap-2 border-b-2 border-[#20201e] pb-2">
                  <Key size={18} weight="bold" className="text-[#345bdc]" />
                  <h4 className="text-sm font-black">Ganti Password Akun</h4>
                </div>
                <p className="text-[11px] text-[#555951]">
                  Gunakan minimal 8 karakter. Jangan gunakan password yang mudah ditebak.
                </p>
                <form action={changePasswordAction} className="space-y-3">
                  <input type="hidden" name="from" value={pathname} />
                  <label className="block">
                    <span className="block text-xs font-bold mb-1">Password Baru</span>
                    <input
                      name="password"
                      type="password"
                      required
                      minLength={8}
                      placeholder="Minimal 8 karakter..."
                      className="field w-full text-xs"
                    />
                  </label>
                  <label className="block">
                    <span className="block text-xs font-bold mb-1">Ulangi Password Baru</span>
                    <input
                      name="confirmation"
                      type="password"
                      required
                      minLength={8}
                      placeholder="Ketik sekali lagi..."
                      className="field w-full text-xs"
                    />
                  </label>
                  <button type="submit" className="btn-primary !min-h-[40px] w-full text-xs font-black">
                    Perbarui Password
                  </button>
                </form>
              </div>
            )}

            {/* ── TAB 3: NAVIGASI MENU LENGKAP ── */}
            {activeTab === 'nav' && (
              <div className="space-y-1">
                {navLinks.map((item) => {
                  const Icon = item.icon;
                  const active = pathname === item.href;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setIsOpen(false)}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-[8px] border-2 transition font-bold text-sm ${
                        active
                          ? 'bg-[#ffdb59] border-[#20201e] shadow-[2px_2px_0_#20201e]'
                          : 'bg-[#fffef9] border-[#20201e] hover:bg-[#eeeee5]'
                      }`}
                    >
                      <Icon size={20} weight={active ? 'fill' : 'bold'} />
                      <span className="flex-1">{item.label}</span>
                      <span className="text-xs opacity-60">→</span>
                    </Link>
                  );
                })}
              </div>
            )}

            {/* Bottom Logout Area */}
            <div className="mt-auto pt-6 border-t-2 border-[#20201e]">
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="btn-danger w-full !min-h-[42px] text-xs font-black flex items-center justify-center gap-2"
                >
                  <SignOut size={18} weight="bold" />
                  Keluar dari Akun
                </button>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
