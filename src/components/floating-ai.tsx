'use client';

import { useEffect, useRef, useState } from 'react';
import { Brain, PaperPlaneRight, Robot, Sparkle, X } from '@phosphor-icons/react';

interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  learned?: boolean;
}

const prompts = [
  'Siapa piket hari ini?',
  'Cek agenda dan tugas terdekat',
  'Bantu aku belajar subnetting',
  'Jelaskan cara kerja absensi QR',
];

export function FloatingAi() {
  const [open, setOpen] = useState(false);
  const [fabHidden, setFabHidden] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<AiMessage[]>([
    { id: 'welcome', role: 'assistant', text: 'Halo! Aku Ruang AI, asisten X SIJA B. Mau cek piket, agenda, absensi, atau belajar materi SIJA?' },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFabHidden(localStorage.getItem('rc-ai-fab-hidden') === '1');
    const show = () => setOpen(true);
    const restore = () => {
      setFabHidden(false);
      localStorage.removeItem('rc-ai-fab-hidden');
    };
    window.addEventListener('ai:open', show);
    window.addEventListener('ai:restore-fab', restore);
    return () => {
      window.removeEventListener('ai:open', show);
      window.removeEventListener('ai:restore-fab', restore);
    };
  }, []);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const hideFab = () => {
    setFabHidden(true);
    localStorage.setItem('rc-ai-fab-hidden', '1');
  };

  const send = async (value = input) => {
    const text = value.trim();
    if (!text || loading) return;
    setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text }),
        cache: 'no-store',
      });
      const data = await response.json();
      setMessages((current) => [...current, {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: response.ok ? data.answer : data.error || 'AI sedang bermasalah. Coba lagi nanti.',
        learned: Boolean(data.learned),
      }]);
    } catch {
      setMessages((current) => [...current, { id: crypto.randomUUID(), role: 'assistant', text: 'Koneksi ke Ruang AI gagal. Coba lagi sebentar.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!fabHidden && !open ? (
        <div className="ai-fab-wrap">
          <button type="button" onClick={() => setOpen(true)} className="ai-fab" aria-label="Buka Ruang AI">
            <span className="ai-fab-glow" /><Robot size={27} weight="fill" /><span className="ai-fab-dot" />
          </button>
          <button type="button" onClick={hideFab} className="ai-fab-hide" aria-label="Sembunyikan tombol AI"><X size={11} weight="bold" /></button>
        </div>
      ) : null}

      {open ? (
        <div className="ai-overlay" onClick={() => setOpen(false)}>
          <section className="ai-sheet" onClick={(event) => event.stopPropagation()} aria-label="Ruang AI">
            <header className="ai-sheet-header">
              <div className="ai-avatar"><Brain size={23} weight="fill" /></div>
              <div className="flex-1 min-w-0"><h2>Ruang AI</h2><p><span /> Asisten SIJA · grounded data kelas</p></div>
              <button type="button" onClick={() => setOpen(false)} className="ai-close" aria-label="Tutup Ruang AI"><X size={18} weight="bold" /></button>
            </header>

            <div className="ai-privacy"><Sparkle size={15} weight="fill" /> AI tidak diberi akses ke curhat, password, token, atau chat privat.</div>
            <div className="ai-messages">
              {messages.map((message) => <article key={message.id} className={`ai-message ${message.role}`}>
                <p>{message.text}</p>{message.learned ? <small>Memori tersimpan</small> : null}
              </article>)}
              {loading ? <div className="ai-typing"><i /><i /><i /></div> : null}
              <div ref={endRef} />
            </div>

            {messages.length < 3 ? <div className="ai-chips">{prompts.map((prompt) => <button key={prompt} type="button" onClick={() => void send(prompt)}>{prompt}</button>)}</div> : null}
            <form className="ai-composer" onSubmit={(event) => { event.preventDefault(); void send(); }}>
              <textarea value={input} onChange={(event) => setInput(event.target.value)} rows={1} maxLength={1200} placeholder="Tanya materi SIJA atau info kelas..." onKeyDown={(event) => { if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); void send(); } }} />
              <button type="submit" disabled={!input.trim() || loading} aria-label="Kirim ke AI"><PaperPlaneRight size={20} weight="fill" /></button>
            </form>
            <footer className="ai-home-indicator"><span /></footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
