'use client';

import { useEffect, useRef, useState } from 'react';
import { ArrowsClockwise, Brain, Key, PaperPlaneRight, Robot, Sparkle, X } from '@phosphor-icons/react';

interface AiMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  learned?: boolean;
}

const prompts = [
  'Lagi mikirin apa hari ini?',
  'Menurut lo mendingan Linux atau Windows?',
  'Siapa piket hari ini?',
  'Bantu gue belajar subnetting IP',
  'Jokes anak IT dong!',
];

export function FloatingAi() {
  const [open, setOpen] = useState(false);
  const [fabHidden, setFabHidden] = useState(false);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [geminiKey, setGeminiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const [tempKeyInput, setTempKeyInput] = useState('');

  const [messages, setMessages] = useState<AiMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      text: 'Halo! Gue Ruang AI, asisten sekaligus teman ngobrol anak X SIJA B. 🧠✨\n\nGue punya pikiran dan nalar sendiri, paham seluk-beluk materi SIJA (Mikrotik, Cisco, Linux, SQL, coding), dan tahu pantauan kelas kita. Mau ngobrol apa hari ini? Mau diskusi opini, curhat santai, atau butuh bantuan tugas?',
    },
  ]);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setFabHidden(localStorage.getItem('rc-ai-fab-hidden') === '1');
    const savedKey = localStorage.getItem('rc-gemini-key') || '';
    setGeminiKey(savedKey);
    setTempKeyInput(savedKey);

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

  const handleSaveKey = () => {
    const cleaned = tempKeyInput.trim();
    setGeminiKey(cleaned);
    if (cleaned) {
      localStorage.setItem('rc-gemini-key', cleaned);
    } else {
      localStorage.removeItem('rc-gemini-key');
    }
    setShowKeyInput(false);
  };

  const resetChat = () => {
    setMessages([
      {
        id: crypto.randomUUID(),
        role: 'assistant',
        text: 'Obrolan di-reset! Pikiran gue fresh lagi nih. Mau ngebahas topik apa sekarang bro?',
      },
    ]);
  };

  const send = async (value = input) => {
    const text = value.trim();
    if (!text || loading) return;

    const userMessage: AiMessage = { id: crypto.randomUUID(), role: 'user', text };
    setMessages((current) => [...current, userMessage]);
    setInput('');
    setLoading(true);

    // Kumpulkan multi-turn history percakapan
    const history = messages
      .filter((m) => m.id !== 'welcome')
      .slice(-8)
      .map((m) => ({ role: m.role, text: m.text }));

    try {
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (geminiKey) {
        headers['x-gemini-key'] = geminiKey;
      }

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({ message: text, history }),
        cache: 'no-store',
      });
      const data = await response.json();
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: response.ok ? data.answer : data.error || 'AI sedang bermasalah. Coba lagi sebentar.',
          learned: Boolean(data.learned),
        },
      ]);
    } catch {
      setMessages((current) => [
        ...current,
        {
          id: crypto.randomUUID(),
          role: 'assistant',
          text: 'Koneksi ke Ruang AI gagal terhubung. Coba kirim lagi ya.',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {!fabHidden && !open ? (
        <div className="ai-fab-wrap">
          <button type="button" onClick={() => setOpen(true)} className="ai-fab" aria-label="Buka Ruang AI">
            <span className="ai-fab-glow" />
            <Robot size={27} weight="fill" />
            <span className="ai-fab-dot" />
          </button>
          <button type="button" onClick={hideFab} className="ai-fab-hide" aria-label="Sembunyikan tombol AI" title="Sembunyikan tombol floating">
            <X size={11} weight="bold" />
          </button>
        </div>
      ) : null}

      {open ? (
        <div className="ai-overlay" onClick={() => setOpen(false)}>
          <section className="ai-sheet" onClick={(event) => event.stopPropagation()} aria-label="Ruang AI">
            <header className="ai-sheet-header">
              <div className="ai-avatar">
                <Brain size={23} weight="fill" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <h2>Ruang AI</h2>
                  <span className="badge !py-0.5 !px-2 text-[9px] !bg-[#007aff] !text-white font-bold">
                    {geminiKey ? 'Gemini 2.0' : 'SIJA Mind'}
                  </span>
                </div>
                <p>
                  <span /> Asisten SIJA · punya pikiran & nalar
                </p>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowKeyInput(!showKeyInput)}
                  className={`p-2 rounded-full border transition ${showKeyInput || geminiKey ? 'bg-[#007aff]/15 border-[#007aff] text-[#007aff]' : 'bg-white/60 border-black/10 text-slate-600'}`}
                  title="Atur Gemini API Key (Opsional)"
                >
                  <Key size={16} weight="bold" />
                </button>
                <button
                  type="button"
                  onClick={resetChat}
                  className="p-2 rounded-full bg-white/60 border border-black/10 text-slate-600 hover:text-black transition"
                  title="Mulai obrolan baru"
                >
                  <ArrowsClockwise size={16} weight="bold" />
                </button>
                <button type="button" onClick={() => setOpen(false)} className="ai-close" aria-label="Tutup Ruang AI">
                  <X size={18} weight="bold" />
                </button>
              </div>
            </header>

            {showKeyInput && (
              <div className="mx-3 mt-2 p-3 bg-white/80 border border-black/10 rounded-[14px] shadow-sm text-xs space-y-2 animate-fade-in">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-800">🔑 Gemini API Key (Opsional)</span>
                  <span className="text-[10px] text-slate-500">Gratis dari Google AI Studio</span>
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Jika diisi, AI akan memakai Google Gemini 2.0 Flash penuh. Jika kosong, AI memakai mesin kognitif lokal SIJA.
                </p>
                <div className="flex gap-2">
                  <input
                    type="password"
                    value={tempKeyInput}
                    onChange={(e) => setTempKeyInput(e.target.value)}
                    placeholder="AIzaSy..."
                    className="field !py-1.5 !px-3 text-xs flex-1 !rounded-lg"
                  />
                  <button type="button" onClick={handleSaveKey} className="btn-primary !min-h-[32px] text-xs !px-3">
                    Simpan
                  </button>
                </div>
              </div>
            )}

            <div className="ai-privacy">
              <Sparkle size={15} weight="fill" className="shrink-0" />
              <span>AI tidak diberi akses ke curhat, password, token, atau chat privat siswa lain.</span>
            </div>

            <div className="ai-messages">
              {messages.map((message) => (
                <article key={message.id} className={`ai-message ${message.role}`}>
                  <p>{message.text}</p>
                  {message.learned ? <small>✨ Memori tersimpan ke kelas</small> : null}
                </article>
              ))}
              {loading ? (
                <div className="flex flex-col gap-1 items-start">
                  <div className="text-[11px] font-bold text-slate-500 flex items-center gap-1.5 ml-2">
                    <Brain size={14} className="animate-spin text-[#007aff]" />
                    <span>Lagi mikir & merangkai jawaban...</span>
                  </div>
                  <div className="ai-typing">
                    <i />
                    <i />
                    <i />
                  </div>
                </div>
              ) : null}
              <div ref={endRef} />
            </div>

            {messages.length < 5 ? (
              <div className="ai-chips">
                {prompts.map((prompt) => (
                  <button key={prompt} type="button" onClick={() => void send(prompt)}>
                    {prompt}
                  </button>
                ))}
              </div>
            ) : null}

            <form
              className="ai-composer"
              onSubmit={(event) => {
                event.preventDefault();
                void send();
              }}
            >
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                rows={1}
                maxLength={1200}
                placeholder="Ajak ngobrol, tanya materi SIJA, atau curhat..."
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault();
                    void send();
                  }
                }}
              />
              <button type="submit" disabled={!input.trim() || loading} aria-label="Kirim ke AI">
                <PaperPlaneRight size={20} weight="fill" />
              </button>
            </form>
            <footer className="ai-home-indicator">
              <span />
            </footer>
          </section>
        </div>
      ) : null}
    </>
  );
}
