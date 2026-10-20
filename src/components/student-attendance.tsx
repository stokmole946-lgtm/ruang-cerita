'use client';

import { useEffect, useRef, useState } from 'react';
import QRCode from 'qrcode';
import { ArrowsClockwise, CheckCircle, Clock, QrCode, ShieldCheck } from '@phosphor-icons/react';
import { ATTENDANCE_STATUS, type AttendanceStatus, attendanceStatusClass } from '@/lib/attendance';

interface Session {
  id: string;
  title: string;
  starts_at: string;
  late_after: string;
}

interface RecordItem {
  id: string;
  status: AttendanceStatus;
  scanned_at: string | null;
  note: string | null;
  title?: string;
  starts_at?: string;
}

interface AttendanceData {
  activeSession: Session | null;
  record: RecordItem | null;
  token: string | null;
  expiresIn?: number;
  history: RecordItem[];
}

async function getAttendance(mode = 'summary') {
  const response = await fetch(`/api/attendance?mode=${mode}`, { cache: 'no-store' });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Gagal memuat absensi.');
  return data as AttendanceData;
}

export function StudentAttendance({ fullName }: { fullName: string }) {
  const [data, setData] = useState<AttendanceData | null>(null);
  const [qrImage, setQrImage] = useState('');
  const [seconds, setSeconds] = useState(0);
  const [error, setError] = useState('');
  const generationRef = useRef(0);

  const refresh = async () => {
    try {
      const next = await getAttendance('token');
      setData(next);
      setError('');
      if (next.token) {
        const generation = ++generationRef.current;
        const image = await QRCode.toDataURL(next.token, {
          width: 340,
          margin: 2,
          errorCorrectionLevel: 'M',
          color: { dark: '#20201e', light: '#fffef9' },
        });
        if (generation === generationRef.current) {
          setQrImage(image);
          setSeconds(next.expiresIn || 12);
        }
      } else {
        setQrImage('');
        setSeconds(0);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Gagal memuat absensi.');
    }
  };

  useEffect(() => {
    void refresh();
    const tokenTimer = window.setInterval(() => void refresh(), 8_000);
    const countdownTimer = window.setInterval(() => setSeconds((value) => Math.max(0, value - 1)), 1_000);
    return () => {
      window.clearInterval(tokenTimer);
      window.clearInterval(countdownTimer);
    };
  }, []);

  const summary = (data?.history || []).reduce<Record<AttendanceStatus, number>>(
    (result, item) => {
      result[item.status] += 1;
      return result;
    },
    { PRESENT: 0, LATE: 0, EXCUSED: 0, SICK: 0, ABSENT: 0 },
  );

  return (
    <div className="space-y-6 max-w-5xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <span className="badge !bg-[#b9e2ce] mb-2">ABSENSI AMAN · X SIJA B</span>
          <h1 className="page-title">QR kehadiranmu.</h1>
          <p className="text-sm text-[#555951]">Tampilkan QR ini langsung ke pengurus. Jangan kirim screenshot.</p>
        </div>
        <span className="badge !bg-white"><ShieldCheck size={17} weight="fill" /> Token terenkripsi</span>
      </header>

      {error ? <div className="panel p-4 !bg-[#ffa18b] font-bold text-sm">{error}</div> : null}

      {!data ? (
        <section className="panel p-10 text-center"><ArrowsClockwise className="mx-auto animate-spin" size={32} /> Memuat sesi...</section>
      ) : !data.activeSession ? (
        <section className="panel p-8 sm:p-12 text-center bg-[#fffef9]">
          <Clock size={54} className="mx-auto mb-4 text-[#345bdc]" weight="duotone" />
          <h2 className="text-2xl font-black">Belum ada sesi aktif.</h2>
          <p className="text-sm text-[#555951] mt-2">QR akan muncul otomatis setelah pengurus menekan Mulai Sesi Absen.</p>
        </section>
      ) : data.record ? (
        <section className="panel p-8 sm:p-12 text-center !bg-[#b9e2ce]">
          <CheckCircle size={64} weight="fill" className="mx-auto text-[#113a27] mb-4" />
          <span className={`badge ${attendanceStatusClass(data.record.status)}`}>{ATTENDANCE_STATUS[data.record.status]}</span>
          <h2 className="text-3xl font-black mt-4">Absensi berhasil.</h2>
          <p className="mt-2 font-bold">{fullName}</p>
          <p className="text-sm text-[#355b48] mt-1">
            {data.record.scanned_at
              ? new Date(data.record.scanned_at).toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' })
              : data.record.note || 'Status dicatat oleh pengurus.'}
          </p>
        </section>
      ) : (
        <section className="panel p-5 sm:p-8 bg-[#ffdb59]">
          <div className="grid md:grid-cols-[1fr_340px] gap-7 items-center">
            <div>
              <span className="badge !bg-white">SESI SEDANG BERLANGSUNG</span>
              <h2 className="text-3xl font-black mt-4">{data.activeSession.title}</h2>
              <p className="text-sm font-semibold mt-2 max-w-lg">
                Buka halaman ini di depan pengurus. QR berubah otomatis setiap 8 detik dan token lama kedaluwarsa dalam 12 detik.
              </p>
              <div className="mt-5 grid sm:grid-cols-2 gap-3 text-sm">
                <div className="bg-white border-2 border-[#20201e] rounded-[8px] p-3 shadow-[2px_2px_0_#20201e]">
                  <span className="text-xs font-black text-[#555951]">NAMA SISWA</span>
                  <p className="font-black mt-1">{fullName}</p>
                </div>
                <div className="bg-white border-2 border-[#20201e] rounded-[8px] p-3 shadow-[2px_2px_0_#20201e]">
                  <span className="text-xs font-black text-[#555951]">BATAS TERLAMBAT</span>
                  <p className="font-black mt-1">{new Date(data.activeSession.late_after).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB</p>
                </div>
              </div>
            </div>
            <div className="bg-[#fffef9] border-2 border-[#20201e] rounded-[14px] p-4 shadow-[5px_5px_0_#20201e] text-center">
              {qrImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={qrImage} alt="QR absensi dinamis" className="w-full aspect-square" />
              ) : <QrCode size={220} className="mx-auto animate-pulse" />}
              <div className="flex items-center justify-center gap-2 border-t-2 border-[#20201e] pt-3 text-xs font-black">
                <ArrowsClockwise size={16} className="animate-spin" /> QR aktif · {seconds} detik
              </div>
            </div>
          </div>
        </section>
      )}

      <section className="panel p-5 sm:p-7">
        <div className="section-title"><h2>Ringkasan Kehadiran</h2><span className="badge !bg-white">30 sesi terakhir</span></div>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {(Object.keys(ATTENDANCE_STATUS) as AttendanceStatus[]).map((status) => (
            <div key={status} className={`border-2 border-[#20201e] rounded-[8px] p-3 shadow-[2px_2px_0_#20201e] ${attendanceStatusClass(status)}`}>
              <p className="text-[11px] font-black uppercase">{ATTENDANCE_STATUS[status]}</p>
              <p className="text-3xl font-black mt-1">{summary[status]}</p>
            </div>
          ))}
        </div>
        <div className="mt-6 divide-y-2 divide-[#20201e]/20">
          {data?.history.length ? data.history.map((item) => (
            <div key={item.id} className="py-3 flex items-center justify-between gap-3">
              <div><p className="font-black text-sm">{item.title}</p><p className="text-xs text-[#555951]">{item.starts_at ? new Date(item.starts_at).toLocaleDateString('id-ID', { dateStyle: 'long', timeZone: 'Asia/Jakarta' }) : ''}</p></div>
              <span className={`badge ${attendanceStatusClass(item.status)}`}>{ATTENDANCE_STATUS[item.status]}</span>
            </div>
          )) : <p className="empty">Belum ada riwayat absensi.</p>}
        </div>
      </section>
    </div>
  );
}
