'use client';
import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, PaperPlaneRight, Check, Checks, Chats } from '@phosphor-icons/react';

type Conversation = { id: string; title: string; preview: string | null };
type Message = { id: string; sender_id: string; body: string; created_at: string; read: boolean };

async function api(body?: object, id?: string) {
  const response = await fetch(`/api/chat${id ? `?conversation=${id}` : ''}`, body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : { cache: 'no-store' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Koneksi bermasalah. Coba lagi.');
  return result;
}

export function ChatClient() {
  const [chats, setChats] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<{id:string;full_name:string}[]>([]);
  const [user, setUser] = useState('');
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [search, setSearch] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    api().then(data => {
      setChats(data.conversations);
      setContacts(data.contacts);
      setUser(data.userId);
    }).catch(e => setError(e.message));
  }, []);

  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const refresh = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const data = await api(undefined, active.id);
        if (!cancelled) {
          setMessages(data.messages);
          await api({ action: 'read', conversation: active.id });
        }
      } catch(e) {
        if (!cancelled) setError(e instanceof Error ? e.message : 'Gagal memuat chat.');
      }
    };
    void refresh();
    const timer = setInterval(refresh, 3000);
    return () => { cancelled = true; clearInterval(timer); };
  }, [active]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  async function openContact(id: string, title: string) {
    try {
      const data = await api({ action: 'start', recipient: id });
      setMessages([]);
      setText('');
      setActive({ id: data.id, title, preview: null });
    } catch(e) {
      setError(e instanceof Error ? e.message : 'Gagal membuka chat.');
    }
  }

  async function send(event?: React.FormEvent) {
    if (event) event.preventDefault();
    if (!active || !text.trim() || sending) return;
    const bodyToSend = text.trim();
    const tempId = crypto.randomUUID();
    const optimisticMessage: Message = {
      id: tempId,
      sender_id: user,
      body: bodyToSend,
      created_at: new Date().toISOString(),
      read: false,
    };
    setMessages(prev => [...prev, optimisticMessage]);
    setText('');
    setSending(true);
    setError('');
    try {
      await api({ action: 'send', conversation: active.id, id: tempId, body: bodyToSend });
      const data = await api(undefined, active.id);
      setMessages(data.messages);
      // Update preview in chats list
      setChats(prev => prev.map(c => c.id === active.id ? { ...c, preview: bodyToSend } : c));
    } catch(e) {
      setError(e instanceof Error ? e.message : 'Gagal kirim. Pesanmu masih di sini.');
      setText(bodyToSend);
    } finally {
      setSending(false);
    }
  }

  return (
    <div className={`xora-chat ${active ? 'has-chat' : ''}`}>
      <aside className="xora-list">
        <header>
          <Link href="/dashboard" aria-label="Kembali ke beranda">
            <ArrowLeft size={24} />
          </Link>
          <h1>Chat kelas</h1>
          <Chats size={26} />
        </header>
        <input
          aria-label="Cari teman"
          placeholder="Cari teman…"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <p className="xora-caption">Percakapanmu</p>
        {chats.filter(c => c.title.toLowerCase().includes(search.toLowerCase())).map(c => (
          <button
            key={c.id}
            onClick={() => {
              setMessages([]);
              setText('');
              setActive(c);
            }}
          >
            <span className="xora-avatar">{c.title[0]}</span>
            <span>
              <strong>{c.title}</strong>
              <small>{c.preview || 'Mulai ngobrol'}</small>
            </span>
          </button>
        ))}
        <p className="xora-caption">Mulai chat baru</p>
        {contacts.filter(c => c.full_name.toLowerCase().includes(search.toLowerCase())).map(c => (
          <button
            key={c.id}
            onClick={() => openContact(c.id, c.full_name)}
          >
            <span className="xora-avatar">{c.full_name[0]}</span>
            <strong>{c.full_name}</strong>
          </button>
        ))}
      </aside>
      <section className="xora-room">
        {active ? (
          <>
            <header>
              <button aria-label="Kembali ke daftar chat" onClick={() => setActive(null)}>
                <ArrowLeft size={24} />
              </button>
              <span className="xora-avatar">{active.title[0]}</span>
              <div>
                <strong>{active.title}</strong>
                <small>Pesan tersimpan · diperbarui tiap 3 detik</small>
              </div>
            </header>
            <div className="xora-messages" role="log" aria-label="Pesan percakapan">
              {messages.map((m, i) => (
                <div key={m.id}>
                  {(!i || new Date(messages[i-1].created_at).toDateString() !== new Date(m.created_at).toDateString()) && (
                    <div className="xora-date">
                      {new Date(m.created_at).toLocaleDateString('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        day: 'numeric',
                        month: 'short',
                      })}
                    </div>
                  )}
                  <article className={`xora-bubble ${m.sender_id === user ? 'mine' : ''}`}>
                    <p>{m.body}</p>
                    <small>
                      {new Date(m.created_at).toLocaleTimeString('id-ID', {
                        timeZone: 'Asia/Jakarta',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                      {m.sender_id === user && (
                        m.read ? (
                          <Checks size={16} aria-label="Dibaca" className="text-[#38bdf8]" />
                        ) : (
                          <Check size={16} aria-label="Terkirim" className="text-[#97a9c9]" />
                        )
                      )}
                    </small>
                  </article>
                </div>
              ))}
              <div ref={messagesEndRef} />
            </div>
            <form onSubmit={send} className="xora-compose">
              <textarea
                aria-label="Tulis pesan"
                placeholder="Tulis pesan…"
                rows={1}
                maxLength={5000}
                value={text}
                onChange={e => setText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
              />
              <button disabled={sending || !text.trim()} aria-label={sending ? 'Mengirim' : 'Kirim pesan'}>
                <PaperPlaneRight size={24} />
              </button>
            </form>
          </>
        ) : (
          <div className="xora-empty">
            <Chats size={52} />
            <h2>Obrolan kecil, cerita panjang.</h2>
            <p>Pilih teman buat mulai ngobrol.</p>
          </div>
        )}
        {error && <p role="alert" className="xora-error">{error}</p>}
      </section>
    </div>
  );
}
