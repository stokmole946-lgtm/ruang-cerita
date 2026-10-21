'use client';

import { useRef, useState } from 'react';
import { AppleLogo, Image as ImageIcon, Moon, PaintBrush, Trash } from '@phosphor-icons/react';
import { type AppTheme, type WallpaperPreset, useAppTheme } from '@/components/theme-provider';

const themes: Array<{ id: AppTheme; label: string; detail: string; icon: typeof PaintBrush; colors: string[] }> = [
  { id: 'brutal', label: 'Neo-Brutalism', detail: 'Tegas & ceria', icon: PaintBrush, colors: ['#ffdb59', '#fffef9', '#20201e'] },
  { id: 'ios-glass', label: 'iPhone Glass', detail: 'Liquid glass iOS', icon: AppleLogo, colors: ['#f7f7ff', '#a7c7ff', '#d8b4fe'] },
  { id: 'midnight', label: 'Midnight Cyber', detail: 'Gelap & hemat baterai', icon: Moon, colors: ['#07111f', '#0ea5e9', '#22c55e'] },
];

const wallpapers: Array<{ id: WallpaperPreset; label: string; className: string }> = [
  { id: 'paper', label: 'Paper', className: 'bg-[#f5f2e9]' },
  { id: 'aurora', label: 'Aurora', className: 'bg-gradient-to-br from-[#d8b4fe] via-[#bfdbfe] to-[#fef3c7]' },
  { id: 'blueprint', label: 'Blueprint', className: 'bg-[#dbeafe]' },
  { id: 'nebula', label: 'Nebula', className: 'bg-gradient-to-br from-[#020617] via-[#172554] to-[#581c87]' },
];

function compressWallpaper(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca gambar'));
    reader.onload = () => {
      const image = new window.Image();
      image.onerror = () => reject(new Error('Format gambar tidak didukung'));
      image.onload = () => {
        const maxWidth = 1440;
        const scale = Math.min(1, maxWidth / image.width);
        const canvas = document.createElement('canvas');
        canvas.width = Math.round(image.width * scale);
        canvas.height = Math.round(image.height * scale);
        const context = canvas.getContext('2d');
        if (!context) return reject(new Error('Canvas tidak tersedia'));
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL('image/jpeg', 0.72));
      };
      image.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ThemeSettings() {
  const { theme, wallpaper, customWallpaper, setTheme, setWallpaper, setCustomWallpaper, clearCustomWallpaper } = useAppTheme();
  const fileRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState('');

  const pickWallpaper = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (file.size > 8 * 1024 * 1024) {
      setError('Foto maksimal 8MB sebelum dikompresi.');
      return;
    }
    try {
      const value = await compressWallpaper(file);
      if (value.length > 4_000_000) throw new Error('Hasil kompresi masih terlalu besar');
      setCustomWallpaper(value);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memproses wallpaper.');
    } finally {
      event.target.value = '';
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <p className="text-xs font-black uppercase text-[#555951] mb-2">Gaya UI</p>
        <div className="grid gap-2">
          {themes.map((item) => {
            const Icon = item.icon;
            return <button key={item.id} type="button" onClick={() => setTheme(item.id)} className={`theme-choice ${theme === item.id ? 'active' : ''}`}>
              <span className="theme-choice-icon"><Icon size={18} weight="fill" /></span>
              <span className="flex-1 text-left"><strong className="block text-xs">{item.label}</strong><span className="text-[10px] opacity-70">{item.detail}</span></span>
              <span className="flex gap-1">{item.colors.map((color) => <i key={color} style={{ background: color }} />)}</span>
            </button>;
          })}
        </div>
      </div>
      <div>
        <p className="text-xs font-black uppercase text-[#555951] mb-2">Wallpaper</p>
        <div className="grid grid-cols-2 gap-2">
          {wallpapers.map((item) => <button key={item.id} type="button" onClick={() => setWallpaper(item.id)} className={`wallpaper-choice ${wallpaper === item.id ? 'active' : ''}`}><span className={`wallpaper-preview ${item.className}`} />{item.label}</button>)}
          <button type="button" onClick={() => fileRef.current?.click()} className={`wallpaper-choice ${wallpaper === 'custom' ? 'active' : ''}`}>
            <span className="wallpaper-preview grid place-items-center overflow-hidden">
              {customWallpaper ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={customWallpaper} alt="" className="size-full object-cover" />
              ) : <ImageIcon size={20} />}
            </span>
            Foto Sendiri
          </button>
        </div>
        <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pickWallpaper} />
        {customWallpaper ? <button type="button" onClick={clearCustomWallpaper} className="mt-2 text-[11px] font-black text-[#d94833] flex items-center gap-1"><Trash size={14} /> Hapus wallpaper pribadi</button> : null}
        {error ? <p className="mt-2 text-[11px] font-bold text-[#d94833]">{error}</p> : null}
      </div>
    </div>
  );
}
