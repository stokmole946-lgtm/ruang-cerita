'use client';

import { useEffect, useRef, useState } from 'react';
import { BrowserQRCodeReader } from '@zxing/browser';
import {
  Camera,
  CheckCircle,
  Clock,
  MagnifyingGlass,
  Play,
  Stop,
  Users,
  Warning,
  X,
} from '@phosphor-icons/react';
import { ATTENDANCE_STATUS, type AttendanceStatus, attendanceStatusClass } from '@/lib/attendance';

interface Session {
  id: string;
  title: string;
  starts_at: string;
  late_after: string;
  closed_at: string | null;
}

interface StudentRow {
  id: string;
  full_name: string;
  username: string;
  avatar: string | null;
  record_id: string | null;
  status: AttendanceStatus | null;
  scanned_at: string | null;
  note: string | null;
  source: string | null;
}

interface DashboardData {
  activeSession: Session | null;
  students: StudentRow[];
  recentSessions: Array<Session & { recorded_count: number }>;
}

interface MonthlyStudent {
  id: string;
  full_name: string;
  username: string;
  avatar: string | null;
  present: number;
  late: number;
  excused: number;
  sick: number;
  absent: number;
  attendance_percentage: number;
}

interface MonthlyClassData {
  period: { key: string; label: string };
  totalSessions: number;
  totals: Record<AttendanceStatus, number>;
  students: MonthlyStudent[];
}

function currentJakartaMonth() {
  return new Intl.DateTimeFormat('en-CA', { year: 'numeric', month: '2-digit', timeZone: 'Asia/Jakarta' }).format(new Date());
}

async function attendanceApi(body?: object) {
  const response = await fetch('/api/attendance', {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || 'Terjadi kendala absensi.');
  return data;
}

export function AdminAttendance() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [title, setTitle] = useState(`Absensi ${new Date().toLocaleDateString('id-ID', { dateStyle: 'long' })}`);
  const [lateMinutes, setLateMinutes] = useState(15);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [feedback, setFeedback] = useState<{ kind: 'success' | 'warning' | 'error'; text: string } | null>(null);
  const [month, setMonth] = useState(currentJakartaMonth);
  const [monthly, setMonthly] = useState<MonthlyClassData | null>(null);
  const [monthlySearch, setMonthlySearch] = useState('');
  const videoRef = useRef<HTMLVideoElement>(null);
  const scannerControls = useRef<{ stop: () => void } | null>(null);
  const scanning = useRef(false);

  const refresh = async () => {
    try {
      setData(await attendanceApi());
    } catch (error) {
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'Gagal memuat data.' });
    }
  };

  useEffect(() => {
    void refresh();
    const timer = window.setInterval(() => void refresh(), 3_000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/attendance/monthly?month=${month}`, { cache: 'no-store' })
      .then(async (response) => {
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || 'Gagal memuat rekap bulanan.');
        if (!cancelled) setMonthly(result);
      })
      .catch((error) => { if (!cancelled) setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'Gagal memuat rekap.' }); });
    return () => { cancelled = true; };
  }, [month, data?.activeSession]);

  useEffect(() => {
    if (!scannerOpen || !videoRef.current) return;
    const reader = new BrowserQRCodeReader();
    let cancelled = false;

    void reader.decodeFromConstraints(
      { video: { facingMode: { ideal: 'environment' } } },
      videoRef.current,
      async (result) => {
        if (!result || scanning.current || cancelled) return;
        scanning.current = true;
        try {
          const response = await attendanceApi({ action: 'scan', token: result.getText() });
          setFeedback({
            kind: response.duplicate ? 'warning' : 'success',
            text: response.duplicate
              ? `${response.student.full_name} sudah tercatat.`
              : `${response.student.full_name} berhasil: ${ATTENDANCE_STATUS[response.record.status as AttendanceStatus]}.`,
          });
          await refresh();
        } catch (error) {
          setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'QR tidak valid.' });
        } finally {
          window.setTimeout(() => { scanning.current = false; }, 1_500);
        }
      },
    ).then((controls) => { scannerControls.current = controls; }).catch((error) => {
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'Kamera tidak dapat dibuka.' });
      setScannerOpen(false);
    });

    return () => {
      cancelled = true;
      scannerControls.current?.stop();
      scannerControls.current = null;
    };
  }, [scannerOpen]);

  const startSession = async () => {
    setBusy(true);
    try {
      await attendanceApi({ action: 'start', title, lateMinutes });
      setFeedback({ kind: 'success', text: 'Sesi aktif. QR siswa sekarang tersedia.' });
      await refresh();
    } catch (error) {
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'Gagal memulai sesi.' });
    } finally { setBusy(false); }
  };

  const closeSession = async () => {
    if (!data?.activeSession || !confirm('Tutup sesi? Siswa tanpa catatan akan otomatis menjadi Alfa.')) return;
    setBusy(true);
    try {
      await attendanceApi({ action: 'close', sessionId: data.activeSession.id });
      setScannerOpen(false);
      setFeedback({ kind: 'success', text: 'Sesi ditutup. Siswa yang belum tercatat menjadi Alfa.' });
      await refresh();
    } catch (error) {
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'Gagal menutup sesi.' });
    } finally { setBusy(false); }
  };

  const setStatus = async (studentId: string, status: AttendanceStatus) => {
    if (!data?.activeSession) return;
    const note = status === 'EXCUSED' || status === 'SICK'
      ? prompt(`Catatan ${ATTENDANCE_STATUS[status]} (opsional):`) || ''
      : '';
    try {
      await attendanceApi({ action: 'status', sessionId: data.activeSession.id, studentId, status, note });
      await refresh();
    } catch (error) {
      setFeedback({ kind: 'error', text: error instanceof Error ? error.message : 'Gagal mengubah status.' });
    }
  };

  const filtered = (data?.students || []).filter((student) =>
    `${student.full_name} ${student.username}`.toLowerCase().includes(search.toLowerCase()),
  );
  const recorded = (data?.students || []).filter((student) => student.status).length;
  const present = (data?.students || []).filter((student) => student.status === 'PRESENT' || student.status === 'LATE').length;

  return (
    <div className="space-y-6 max-w-6xl">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div><span className="badge !bg-[#ffdb59] mb-2">PANEL PENGURUS</span><h1 className="page-title">Absensi Kelas.</h1><p className="text-sm text-[#555951]">Mulai sesi, pindai QR dinamis siswa, lalu tutup sesi untuk menetapkan Alfa.</p></div>
        {data?.activeSession && <button className="btn-danger flex items-center gap-2" onClick={closeSession} disabled={busy}><Stop size={18} weight="fill" /> Tutup Sesi</button>}
      </header>

      {feedback && (
        <div className={`panel p-4 flex items-center justify-between gap-3 ${feedback.kind === 'success' ? '!bg-[#b9e2ce]' : feedback.kind === 'warning' ? '!bg-[#ffdb59]' : '!bg-[#ffa18b]'}`}>
          <p className="font-black text-sm flex items-center gap-2">{feedback.kind === 'success' ? <CheckCircle size={20} weight="fill" /> : <Warning size={20} weight="fill" />}{feedback.text}</p>
          <button onClick={() => setFeedback(null)} aria-label="Tutup pemberitahuan"><X size={18} /></button>
        </div>
      )}

      {!data?.activeSession ? (
        <section className="panel p-6 sm:p-8 bg-[#fffef9]">
          <div className="grid lg:grid-cols-[1fr_auto] gap-5 items-end">
            <div className="grid sm:grid-cols-[1fr_180px] gap-4">
              <label className="font-black text-sm">Judul sesi<input className="field mt-1" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} /></label>
              <label className="font-black text-sm">Terlambat setelah<input className="field mt-1" type="number" min={0} max={180} value={lateMinutes} onChange={(e) => setLateMinutes(Number(e.target.value))} /><span className="text-[10px] text-[#555951]">menit</span></label>
            </div>
            <button className="btn-primary flex items-center justify-center gap-2" onClick={startSession} disabled={busy || title.trim().length < 3}><Play size={19} weight="fill" /> Mulai Sesi Absen</button>
          </div>
        </section>
      ) : (
        <>
          <section className="panel p-5 sm:p-6 !bg-[#b9e2ce]">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div><span className="badge !bg-white">SESI AKTIF</span><h2 className="text-2xl font-black mt-3">{data.activeSession.title}</h2><p className="text-xs font-bold mt-1">Batas terlambat: {new Date(data.activeSession.late_after).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })} WIB</p></div>
              <button className="btn-primary !bg-[#ffdb59] flex items-center gap-2" onClick={() => setScannerOpen(true)}><Camera size={20} weight="bold" /> Buka Scanner QR</button>
            </div>
          </section>

          <div className="grid grid-cols-3 gap-3">
            <div className="panel p-4 !bg-white"><p className="text-xs font-black">TOTAL SISWA</p><p className="text-3xl font-black mt-1">{data.students.length}</p></div>
            <div className="panel p-4 !bg-[#b9e2ce]"><p className="text-xs font-black">HADIR</p><p className="text-3xl font-black mt-1">{present}</p></div>
            <div className="panel p-4 !bg-[#ffdb59]"><p className="text-xs font-black">TERCATAT</p><p className="text-3xl font-black mt-1">{recorded}</p></div>
          </div>
        </>
      )}

      <section className="panel p-5 sm:p-7">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-5"><h2 className="text-xl font-black flex items-center gap-2"><Users size={22} weight="fill" /> Daftar Siswa</h2><label className="relative"><MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2" /><input className="field !pl-10 !py-2" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Cari siswa..." /></label></div>
        <div className="space-y-2">
          {filtered.map((student) => (
            <article key={student.id} className="border-2 border-[#20201e] rounded-[9px] p-3 bg-white flex flex-col sm:flex-row sm:items-center gap-3 shadow-[2px_2px_0_#20201e]">
              <div className="size-10 rounded-full border-2 border-[#20201e] overflow-hidden bg-[#ffdb59] grid place-items-center font-black shrink-0">{student.avatar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={student.avatar} alt="" className="size-full object-cover" />
              ) : student.full_name[0]}</div>
              <div className="flex-1 min-w-0"><p className="font-black truncate">{student.full_name}</p><p className="text-xs text-[#555951]">@{student.username}{student.scanned_at ? ` · ${new Date(student.scanned_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}` : ''}</p></div>
              {student.status ? <span className={`badge ${attendanceStatusClass(student.status)}`}>{ATTENDANCE_STATUS[student.status]}</span> : <span className="badge !bg-[#eeeee5]">Belum</span>}
              {data?.activeSession && <div className="flex flex-wrap gap-1.5">
                {(['PRESENT', 'EXCUSED', 'SICK', 'ABSENT'] as AttendanceStatus[]).map((status) => <button key={status} onClick={() => setStatus(student.id, status)} className={`px-2 py-1 border border-[#20201e] rounded-[5px] text-[10px] font-black ${attendanceStatusClass(status)}`}>{ATTENDANCE_STATUS[status]}</button>)}
              </div>}
            </article>
          ))}
        </div>
      </section>

      <section className="panel p-5 sm:p-7">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-5">
          <div><span className="badge !bg-[#c5d3ff] mb-2">REKAP BULANAN</span><h2 className="text-2xl font-black">Log kehadiran kelas.</h2><p className="text-xs text-[#555951] mt-1">Hanya sesi yang sudah ditutup. Data sesi aktif tidak dihitung.</p></div>
          <div className="flex flex-wrap items-end gap-2"><label className="text-xs font-black">Bulan<input type="month" className="field mt-1 !py-2" value={month} onChange={(event) => setMonth(event.target.value)} min="2024-01" max="2100-12" /></label><a className="btn-primary !min-h-[40px] text-xs" href={`/api/attendance/export?month=${month}`}>Export CSV</a></div>
        </div>
        {monthly ? <>
          <div className="grid sm:grid-cols-[1fr_auto] gap-4 items-center bg-[#ffdb59] border-2 border-[#20201e] rounded-[10px] p-4 shadow-[3px_3px_0_#20201e] mb-4"><div><p className="font-black text-lg">{monthly.period.label}</p><p className="text-xs font-bold">{monthly.totalSessions} sesi final · {monthly.students.length} siswa</p></div><div className="text-3xl font-black">{monthly.totalSessions ? Math.round(((monthly.totals.PRESENT + monthly.totals.LATE) / (monthly.totalSessions * Math.max(monthly.students.length, 1))) * 100) : 0}%</div></div>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 mb-5">{(Object.keys(ATTENDANCE_STATUS) as AttendanceStatus[]).map((status) => <div key={status} className={`border-2 border-[#20201e] rounded-[7px] p-2 ${attendanceStatusClass(status)}`}><p className="text-[10px] font-black">{ATTENDANCE_STATUS[status]}</p><p className="text-2xl font-black">{monthly.totals[status]}</p></div>)}</div>
          <label className="relative block mb-4 max-w-sm"><MagnifyingGlass size={18} className="absolute left-3 top-1/2 -translate-y-1/2" /><input className="field !pl-10 !py-2" value={monthlySearch} onChange={(event) => setMonthlySearch(event.target.value)} placeholder="Cari rekap siswa..." /></label>
          <div className="overflow-x-auto border-2 border-[#20201e] rounded-[9px]">
            <table className="w-full min-w-[760px] text-sm"><thead className="bg-[#eeeee5] border-b-2 border-[#20201e]"><tr>{['Siswa', 'Hadir', 'Telat', 'Izin', 'Sakit', 'Alfa', 'Persentase'].map((heading) => <th key={heading} className="p-3 text-left text-xs font-black uppercase">{heading}</th>)}</tr></thead><tbody className="divide-y divide-[#20201e]/20">{monthly.students.filter((student) => `${student.full_name} ${student.username}`.toLowerCase().includes(monthlySearch.toLowerCase())).map((student) => <tr key={student.id} className="bg-white"><td className="p-3"><p className="font-black">{student.full_name}</p><p className="text-xs text-[#555951]">@{student.username}</p></td><td className="p-3 font-black">{student.present}</td><td className="p-3 font-black">{student.late}</td><td className="p-3 font-black">{student.excused}</td><td className="p-3 font-black">{student.sick}</td><td className="p-3 font-black">{student.absent}</td><td className="p-3"><span className={`badge ${student.attendance_percentage >= 80 ? '!bg-[#b9e2ce]' : student.attendance_percentage >= 60 ? '!bg-[#ffdb59]' : '!bg-[#ffa18b]'}`}>{student.attendance_percentage}%</span></td></tr>)}</tbody></table>
          </div>
        </> : <p className="empty">Memuat rekap bulanan...</p>}
      </section>

      {scannerOpen && (
        <div className="fixed inset-0 z-[100] bg-[#20201e]/90 p-4 flex items-center justify-center">
          <div className="w-full max-w-xl bg-[#fffef9] border-2 border-[#20201e] rounded-[14px] shadow-[6px_6px_0_#ffdb59] overflow-hidden">
            <div className="p-4 flex items-center justify-between border-b-2 border-[#20201e]"><div><h2 className="font-black">Scanner QR Siswa</h2><p className="text-xs text-[#555951]">Arahkan kotak ke QR pada HP siswa.</p></div><button className="xora-icon-btn" onClick={() => setScannerOpen(false)} aria-label="Tutup scanner"><X size={20} weight="bold" /></button></div>
            <div className="relative bg-black aspect-square sm:aspect-video"><video ref={videoRef} className="size-full object-cover" muted playsInline /><div className="absolute inset-[15%] border-4 border-[#ffdb59] rounded-[16px] shadow-[0_0_0_999px_rgba(0,0,0,.35)]" /></div>
            <div className="p-3 bg-[#ffdb59] text-center text-xs font-black"><Clock size={15} className="inline mr-1" /> QR diproses di server dan token hanya berlaku 12 detik.</div>
          </div>
        </div>
      )}
    </div>
  );
}
