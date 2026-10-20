'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowUUpLeft,
  Camera,
  Chats,
  Check,
  Checks,
  CircleDashed,
  DotsThreeVertical,
  FloppyDisk,
  Image as ImageIcon,
  PaperPlaneRight,
  Plus,
  TextT,
  Trash,
  UserCircle,
  UsersThree,
  X,
} from '@phosphor-icons/react';

export interface UserProfile {
  id: string;
  full_name: string;
  username: string;
  role: string;
  bio: string;
  avatar: string | null;
  whatsapp: string | null;
}

export interface Conversation {
  id: string;
  kind: 'direct' | 'group';
  title: string;
  partner_username: string;
  partner_avatar: string | null;
  members_count: number;
  preview: string | null;
  last_message_at: string | null;
  unread_count: number;
}

export interface Contact {
  id: string;
  full_name: string;
  username: string;
  bio: string;
  avatar: string | null;
}

export interface Message {
  id: string;
  sender_id: string;
  sender_name: string;
  sender_username: string;
  body: string;
  type: 'text' | 'photo';
  media_url: string | null;
  reply_id: string | null;
  reply_from: string | null;
  reply_text: string | null;
  created_at: string;
  read: boolean;
}

export interface Story {
  id: string;
  user_id: string;
  type: 'text' | 'photo';
  content: string;
  media_url: string | null;
  bg_color: string;
  created_at: string;
  expires_at: string;
  full_name: string;
  username: string;
  avatar: string | null;
}

export interface StoryGroup {
  userId: string;
  fullName: string;
  username: string;
  avatar: string | null;
  latestCreatedAt: string;
  items: Story[];
}

interface ReplyTarget {
  id: string;
  from: string;
  text: string;
}

const COLOR_PRESETS = [
  '#10B981',
  '#005C4B',
  '#0284C7',
  '#8B5CF6',
  '#D97706',
  '#111827',
];

async function chatApi(body?: object, id?: string) {
  const res = await fetch(`/api/chat${id ? `?conversation=${id}` : ''}`, {
    method: body ? 'POST' : 'GET',
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Terjadi kendala. Coba lagi.');
  return data;
}

function compressImage(file: File, maxDim = 1280): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file'));
    reader.onload = () => {
      const img = new window.Image();
      img.onerror = () => reject(new Error('File gambar tidak valid'));
      img.onload = () => {
        let { width, height } = img;
        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) return reject(new Error('Canvas tidak tersedia'));
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  });
}

export function ChatClient() {
  const [tab, setTab] = useState<'chats' | 'stories' | 'profile'>('chats');
  const [userId, setUserId] = useState('');
  const [userRole, setUserRole] = useState('');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [myStories, setMyStories] = useState<Story[]>([]);
  const [otherGroups, setOtherGroups] = useState<StoryGroup[]>([]);

  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [chatSearch, setChatSearch] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const [replyingTo, setReplyingTo] = useState<ReplyTarget | null>(null);
  const [chatPhoto, setChatPhoto] = useState<string | null>(null);
  const chatPhotoInputRef = useRef<HTMLInputElement>(null);
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [showStoryCreator, setShowStoryCreator] = useState(false);
  const [storyType, setStoryType] = useState<'text' | 'photo'>('text');
  const [storyText, setStoryText] = useState('');
  const [storyColor, setStoryColor] = useState(COLOR_PRESETS[0]);
  const [storyPhoto, setStoryPhoto] = useState<string | null>(null);
  const [storySubmitting, setStorySubmitting] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  const [activeStoryGroup, setActiveStoryGroup] = useState<Story[] | null>(null);
  const [storyIndex, setStoryIndex] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [storyPaused, setStoryPaused] = useState(false);

  const [profileName, setProfileName] = useState('');
  const [profileBio, setProfileBio] = useState('');
  const [profileWa, setProfileWa] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileSuccess, setProfileSuccess] = useState(false);

  const loadDashboard = async () => {
    try {
      const data = await chatApi();
      setUserId(data.userId);
      setUserRole(data.profile?.role || '');
      setProfile(data.profile);
      setProfileName(data.profile.full_name || '');
      setProfileBio(data.profile.bio || '');
      setProfileWa(data.profile.whatsapp || '');
      setConversations(data.conversations || []);
      setContacts(data.contacts || []);
      setMyStories(data.myStories || []);
      setOtherGroups(data.otherGroups || []);
    } catch (err: unknown) {
      if (err instanceof Error) setErrorMsg(err.message);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, []);

  useEffect(() => {
    if (!activeChat) return;
    let cancelled = false;

    const refreshMessages = async () => {
      if (document.visibilityState !== 'visible') return;
      try {
        const data = await chatApi(undefined, activeChat.id);
        if (!cancelled) {
          setMessages(data.messages || []);
          await chatApi({ action: 'read', conversation: activeChat.id });
        }
      } catch {
        // silent
      }
    };

    void refreshMessages();
    const interval = setInterval(refreshMessages, 2500);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!activeStoryGroup || activeStoryGroup.length === 0) return;
    setStoryProgress(0);

    const DURATION = 5000;
    const INTERVAL = 50;
    const step = (INTERVAL / DURATION) * 100;

    const timer = setInterval(() => {
      if (storyPaused) return;
      setStoryProgress((prev) => {
        if (prev + step >= 100) {
          if (storyIndex < activeStoryGroup.length - 1) {
            setStoryIndex((i) => i + 1);
            return 0;
          } else {
            setActiveStoryGroup(null);
            setStoryIndex(0);
            return 0;
          }
        }
        return prev + step;
      });
    }, INTERVAL);

    return () => clearInterval(timer);
  }, [activeStoryGroup, storyIndex, storyPaused]);

  useEffect(() => {
    const close = () => setOpenMenuId(null);
    if (openMenuId) {
      document.addEventListener('click', close);
      return () => document.removeEventListener('click', close);
    }
  }, [openMenuId]);

  const openContact = async (contactId: string, title: string, partnerUsername: string) => {
    try {
      const data = await chatApi({ action: 'start', recipient: contactId });
      setMessages([]);
      setChatInput('');
      setReplyingTo(null);
      setChatPhoto(null);
      setActiveChat({
        id: data.id,
        kind: 'direct',
        title,
        partner_username: partnerUsername,
        partner_avatar: null,
        members_count: 2,
        preview: null,
        last_message_at: null,
        unread_count: 0,
      });
    } catch (err: unknown) {
      if (err instanceof Error) setErrorMsg(err.message);
    }
  };

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!activeChat || isSending) return;
    const hasText = chatInput.trim().length > 0;
    const hasPhoto = !!chatPhoto;
    if (!hasText && !hasPhoto) return;

    const bodyToSend = chatInput.trim();
    const type = hasPhoto ? 'photo' : 'text';
    const tempId = crypto.randomUUID();

    const optimistic: Message = {
      id: tempId,
      sender_id: userId,
      sender_name: profile?.full_name || 'Kamu',
      sender_username: profile?.username || '',
      body: bodyToSend,
      type,
      media_url: chatPhoto,
      reply_id: replyingTo?.id || null,
      reply_from: replyingTo?.from || null,
      reply_text: replyingTo?.text || null,
      created_at: new Date().toISOString(),
      read: false,
    };

    setMessages((prev) => [...prev, optimistic]);
    setChatInput('');
    setChatPhoto(null);
    setReplyingTo(null);
    setIsSending(true);

    try {
      await chatApi({
        action: 'send',
        conversation: activeChat.id,
        id: tempId,
        body: bodyToSend,
        type,
        mediaUrl: chatPhoto || '',
        replyId: replyingTo?.id || undefined,
        replyFrom: replyingTo?.from || undefined,
        replyText: replyingTo?.text || undefined,
      });
      const data = await chatApi(undefined, activeChat.id);
      setMessages(data.messages || []);
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeChat.id
            ? { ...c, preview: type === 'photo' ? '[Foto]' : bodyToSend }
            : c
        )
      );
    } catch (err: unknown) {
      if (err instanceof Error) setErrorMsg(err.message);
      setChatInput(bodyToSend);
      if (chatPhoto) setChatPhoto(chatPhoto);
    } finally {
      setIsSending(false);
    }
  };

  const handleChatPhotoSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compressImage(file, 1280);
      setChatPhoto(compressed);
    } catch {
      setErrorMsg('Gagal memproses foto. Coba lagi.');
    }
    e.target.value = '';
  };

  const deleteMessage = async (messageId: string) => {
    if (!confirm('Hapus pesan ini?')) return;
    try {
      await chatApi({ action: 'delete_message', messageId });
      if (activeChat) {
        const data = await chatApi(undefined, activeChat.id);
        setMessages(data.messages || []);
      }
    } catch (err: unknown) {
      if (err instanceof Error) setErrorMsg(err.message);
    }
  };

  const startReply = (m: Message) => {
    setReplyingTo({
      id: m.id,
      from: m.sender_id === userId ? 'Kamu' : m.sender_name,
      text: m.type === 'photo' ? '[Foto]' : m.body.slice(0, 120),
    });
    setOpenMenuId(null);
  };

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    void compressImage(file, 1200).then((compressed) => {
      setStoryPhoto(compressed);
      setStoryType('photo');
    });
    e.target.value = '';
  };

  const submitStory = async () => {
    if (storyType === 'text' && !storyText.trim()) return;
    if (storyType === 'photo' && !storyPhoto) return;

    setStorySubmitting(true);
    try {
      await chatApi({
        action: 'create_story',
        type: storyType,
        content: storyText.trim(),
        mediaUrl: storyPhoto || '',
        bgColor: storyColor,
      });
      setShowStoryCreator(false);
      setStoryText('');
      setStoryPhoto(null);
      await loadDashboard();
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    } finally {
      setStorySubmitting(false);
    }
  };

  const deleteStory = async (storyId: string) => {
    if (!confirm('Hapus status ini?')) return;
    try {
      await chatApi({ action: 'delete_story', storyId });
      setActiveStoryGroup(null);
      await loadDashboard();
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    }
  };

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileSaving(true);
    setProfileSuccess(false);
    try {
      await chatApi({
        action: 'update_profile',
        fullName: profileName.trim(),
        bio: profileBio.trim(),
        whatsapp: profileWa.trim(),
      });
      setProfileSuccess(true);
      await loadDashboard();
      setTimeout(() => setProfileSuccess(false), 3000);
    } catch (err: unknown) {
      if (err instanceof Error) alert(err.message);
    } finally {
      setProfileSaving(false);
    }
  };

  const totalUnread = conversations.reduce((acc, c) => acc + (c.unread_count || 0), 0);

  return (
    <div className={`xora-shell ${activeChat ? 'has-chat' : ''}`}>
      <aside className="xora-sidebar">
        <header className="xora-topbar">
          <div className="flex items-center gap-2">
            <Link href="/dashboard" className="xora-icon-btn" aria-label="Kembali ke Dashboard">
              <ArrowLeft size={22} weight="bold" />
            </Link>
            <h1 className="text-xl font-black tracking-tight text-[#eaf2ff]">Chat Kelas</h1>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="badge !bg-[#34f5c5] !text-[#070b18] text-[10px] font-black">X SIJA B</span>
          </div>
        </header>

        <nav className="xora-tabs" aria-label="Tab Menu Xora">
          <button type="button" onClick={() => setTab('chats')} className={`xora-tab-btn ${tab === 'chats' ? 'active' : ''}`}>
            <div className="flex items-center justify-center gap-1.5">
              <Chats size={18} weight={tab === 'chats' ? 'fill' : 'bold'} />
              <span>Chat</span>
              {totalUnread > 0 ? <span className="xora-tab-badge">{totalUnread}</span> : null}
            </div>
          </button>
          <button type="button" onClick={() => setTab('stories')} className={`xora-tab-btn ${tab === 'stories' ? 'active' : ''}`}>
            <div className="flex items-center justify-center gap-1.5">
              <CircleDashed size={18} weight={tab === 'stories' ? 'fill' : 'bold'} />
              <span>Pembaruan</span>
              {otherGroups.length > 0 ? <span className="xora-tab-dot" /> : null}
            </div>
          </button>
          <button type="button" onClick={() => setTab('profile')} className={`xora-tab-btn ${tab === 'profile' ? 'active' : ''}`}>
            <div className="flex items-center justify-center gap-1.5">
              <UserCircle size={18} weight={tab === 'profile' ? 'fill' : 'bold'} />
              <span>Profil</span>
            </div>
          </button>
        </nav>

        {tab === 'chats' && (
          <div className="xora-scrollable">
            <div className="p-3">
              <input
                type="text"
                value={chatSearch}
                onChange={(e) => setChatSearch(e.target.value)}
                placeholder="Cari obrolan atau teman sekelas..."
                className="xora-search-input"
                aria-label="Cari teman sekelas"
              />
            </div>

            <div className="space-y-0.5">
              <p className="xora-section-label">Percakapan Aktif</p>
              {conversations.length ? (
                conversations
                  .filter((c) => c.title.toLowerCase().includes(chatSearch.toLowerCase()))
                  .map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setMessages([]);
                        setChatInput('');
                        setReplyingTo(null);
                        setChatPhoto(null);
                        setActiveChat(c);
                      }}
                      className={`xora-chat-item ${activeChat?.id === c.id ? 'active' : ''}`}
                    >
                      <div className={`xora-avatar-circle ${c.kind === 'group' ? 'bg-[#1a2744] text-[#7dd3fc]' : ''}`}>
                        {c.kind === 'group' ? <UsersThree size={22} weight="bold" /> : c.title.slice(0, 1).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0 text-left">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-sm text-[#eaf2ff] truncate">{c.title}</span>
                          {c.last_message_at ? (
                            <span className="text-[10px] text-[#97a9c9]">
                              {new Date(c.last_message_at).toLocaleTimeString('id-ID', {
                                hour: '2-digit',
                                minute: '2-digit',
                                timeZone: 'Asia/Jakarta',
                              })}
                            </span>
                          ) : null}
                        </div>
                        <p className="text-xs text-[#97a9c9] truncate mt-0.5">
                          {c.preview || 'Ketuk untuk membuka percakapan'}
                        </p>
                      </div>
                      {c.unread_count > 0 ? <span className="xora-unread-pill">{c.unread_count}</span> : null}
                    </button>
                  ))
              ) : (
                <div className="p-4 text-center text-xs text-[#97a9c9]">
                  Belum ada percakapan aktif. Mulai chat dari daftar teman di bawah!
                </div>
              )}
            </div>

            <div className="space-y-0.5 pt-3">
              <p className="xora-section-label">Semua Teman Kelas ({contacts.length})</p>
              {contacts
                .filter(
                  (c) =>
                    c.full_name.toLowerCase().includes(chatSearch.toLowerCase()) ||
                    c.username.toLowerCase().includes(chatSearch.toLowerCase())
                )
                .map((c) => (
                  <button key={c.id} type="button" onClick={() => openContact(c.id, c.full_name, c.username)} className="xora-chat-item">
                    <div className="xora-avatar-circle bg-[#18223a] text-[#5eead4]">{c.full_name.slice(0, 1).toUpperCase()}</div>
                    <div className="flex-1 min-w-0 text-left">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-sm text-[#eaf2ff] truncate">{c.full_name}</span>
                        <span className="text-[10px] text-[#5eead4]">@{c.username}</span>
                      </div>
                      <p className="text-xs text-[#66789b] truncate mt-0.5">{c.bio}</p>
                    </div>
                  </button>
                ))}
            </div>
          </div>
        )}

        {tab === 'stories' && (
          <div className="xora-scrollable p-3 space-y-4">
            <div className="xora-status-card">
              <div
                className="relative cursor-pointer"
                onClick={() => {
                  if (myStories.length > 0) {
                    setActiveStoryGroup(myStories);
                    setStoryIndex(0);
                  } else {
                    setShowStoryCreator(true);
                  }
                }}
              >
                <div className={`xora-avatar-circle ${myStories.length > 0 ? 'ring-2 ring-[#34f5c5]' : ''}`}>
                  {profile?.full_name?.slice(0, 1).toUpperCase() || 'S'}
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowStoryCreator(true);
                  }}
                  className="xora-add-story-badge"
                  title="Tambah Status Baru"
                >
                  <Plus size={14} weight="bold" />
                </button>
              </div>
              <div
                className="flex-1 min-w-0 cursor-pointer"
                onClick={() => {
                  if (myStories.length > 0) {
                    setActiveStoryGroup(myStories);
                    setStoryIndex(0);
                  } else {
                    setShowStoryCreator(true);
                  }
                }}
              >
                <h3 className="text-sm font-bold text-[#eaf2ff]">Status saya</h3>
                <p className="text-xs text-[#97a9c9]">
                  {myStories.length > 0 ? `${myStories.length} pembaruan aktif (ketuk untuk melihat)` : 'Ketuk untuk menambahkan pembaruan status'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowStoryCreator(true)}
                className="btn-primary !min-h-[36px] !py-1 !px-3 text-xs !bg-[#34f5c5] !text-[#070b18] font-bold"
              >
                + Buat
              </button>
            </div>

            <div className="space-y-1 pt-2">
              <p className="xora-section-label">Pembaruan Terkini</p>
              {otherGroups.length > 0 ? (
                otherGroups.map((group) => (
                  <button
                    key={group.userId}
                    type="button"
                    onClick={() => {
                      setActiveStoryGroup(group.items);
                      setStoryIndex(0);
                    }}
                    className="xora-chat-item !bg-transparent hover:!bg-[#111a2e]"
                  >
                    <div className="relative">
                      <div className="xora-avatar-circle ring-2 ring-[#34f5c5] ring-offset-2 ring-offset-[#070b18]">
                        {group.fullName.slice(0, 1).toUpperCase()}
                      </div>
                    </div>
                    <div className="flex-1 min-w-0 text-left">
                      <span className="font-bold text-sm text-[#eaf2ff] truncate block">{group.fullName}</span>
                      <span className="text-xs text-[#97a9c9] truncate block mt-0.5">
                        {group.items.length} status baru ·{' '}
                        {new Date(group.latestCreatedAt).toLocaleTimeString('id-ID', {
                          hour: '2-digit',
                          minute: '2-digit',
                          timeZone: 'Asia/Jakarta',
                        })}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="p-6 text-center text-xs text-[#66789b] border border-[#23304c] rounded-[10px] bg-[#111a2e]/40">
                  <CircleDashed size={36} className="mx-auto text-[#97a9c9] mb-2 opacity-60" />
                  Belum ada status terbaru dari teman kelas. Jadilah yang pertama membuat status!
                </div>
              )}
            </div>
          </div>
        )}

        {tab === 'profile' && (
          <div className="xora-scrollable p-4 space-y-5">
            <div className="text-center space-y-2 py-4">
              <div className="size-20 rounded-full mx-auto bg-gradient-to-br from-[#34f5c5] to-[#38bdf8] p-1 shadow-[0_0_24px_rgba(52,245,197,0.3)]">
                <div className="size-full rounded-full bg-[#0b1324] flex items-center justify-center text-2xl font-black text-[#34f5c5]">
                  {profile?.full_name?.slice(0, 1).toUpperCase() || 'U'}
                </div>
              </div>
              <div>
                <h2 className="text-lg font-black text-[#eaf2ff]">{profile?.full_name}</h2>
                <p className="text-xs text-[#5eead4]">@{profile?.username}</p>
                <span className="badge !bg-[#18223a] !text-[#34f5c5] text-[10px] mt-1 inline-block border border-[#23304c]">
                  {profile?.role === 'ADMIN' ? 'Pengurus Kelas' : 'Siswa X SIJA B'}
                </span>
              </div>
            </div>

            {profileSuccess ? (
              <div className="p-3 bg-[#10b981]/20 border border-[#10b981] text-[#34f5c5] rounded-[8px] text-xs font-bold text-center">
                Perubahan profil berhasil disimpan!
              </div>
            ) : null}

            <form onSubmit={saveProfile} className="space-y-4">
              <label className="block">
                <span className="block text-xs font-bold text-[#97a9c9] mb-1">Nama Lengkap</span>
                <input type="text" value={profileName} onChange={(e) => setProfileName(e.target.value)} required className="xora-field" />
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-[#97a9c9] mb-1">Info / Bio</span>
                <textarea
                  value={profileBio}
                  onChange={(e) => setProfileBio(e.target.value)}
                  rows={3}
                  maxLength={300}
                  placeholder="Ceritakan tentang dirimu..."
                  className="xora-field resize-none leading-relaxed"
                />
              </label>
              <label className="block">
                <span className="block text-xs font-bold text-[#97a9c9] mb-1">Nomor WhatsApp</span>
                <input
                  type="tel"
                  value={profileWa}
                  onChange={(e) => setProfileWa(e.target.value)}
                  placeholder="Contoh: 081234567890"
                  className="xora-field"
                />
              </label>
              <button
                type="submit"
                disabled={profileSaving}
                className="btn-primary !bg-[#34f5c5] !text-[#070b18] w-full font-black text-sm flex items-center justify-center gap-2 !min-h-[46px]"
              >
                <FloppyDisk size={18} weight="bold" />
                {profileSaving ? 'Menyimpan...' : 'Simpan Profil'}
              </button>
            </form>
          </div>
        )}
      </aside>

      <main className="xora-room">
        {activeChat ? (
          <>
            <header className="xora-room-header">
              <div className="flex items-center gap-3">
                <button type="button" onClick={() => setActiveChat(null)} className="xora-icon-btn md:hidden" aria-label="Kembali ke Daftar Chat">
                  <ArrowLeft size={22} weight="bold" />
                </button>
                <div className={`xora-avatar-circle !size-10 ${activeChat.kind === 'group' ? 'bg-[#1a2744] text-[#7dd3fc]' : ''}`}>
                  {activeChat.kind === 'group' ? <UsersThree size={22} weight="bold" /> : activeChat.title.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <h2 className="text-base font-bold text-[#eaf2ff] leading-tight truncate">{activeChat.title}</h2>
                  <p className="text-[11px] text-[#5eead4]">
                    {activeChat.kind === 'group'
                      ? `${activeChat.members_count} anggota · X SIJA B`
                      : `@${activeChat.partner_username} · X SIJA B`}
                  </p>
                </div>
              </div>
            </header>

            <div className="xora-messages-container" role="log" aria-label="Riwayat Percakapan">
              {messages.map((m, i) => {
                const prevDate = i > 0 ? new Date(messages[i - 1].created_at).toDateString() : null;
                const currDate = new Date(m.created_at).toDateString();
                const showDate = prevDate !== currDate;
                const isMine = m.sender_id === userId;
                const isGroup = activeChat.kind === 'group';
                const prevSender = i > 0 ? messages[i - 1].sender_id : null;
                const showSenderName = isGroup && !isMine && prevSender !== m.sender_id;
                const canDelete = isMine || userRole === 'ADMIN';

                return (
                  <div key={m.id}>
                    {showDate && (
                      <div className="xora-date-divider">
                        <span>
                          {new Date(m.created_at).toLocaleDateString('id-ID', {
                            weekday: 'long',
                            day: 'numeric',
                            month: 'short',
                            timeZone: 'Asia/Jakarta',
                          })}
                        </span>
                      </div>
                    )}

                    <div className={`xora-bubble-row ${isMine ? 'mine' : 'theirs'}`}>
                      <div className={`xora-bubble ${isMine ? 'mine' : 'theirs'} ${m.type === 'photo' ? 'photo-bubble' : ''}`}>
                        {showSenderName && <p className="xora-sender-name">{m.sender_name}</p>}

                        {m.reply_from && (
                          <div className="xora-reply-quote">
                            <span className="xora-reply-from">{m.reply_from}</span>
                            <span className="xora-reply-text">{m.reply_text}</span>
                          </div>
                        )}

                        {m.type === 'photo' && m.media_url ? (
                          <div className="xora-photo-msg">
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={m.media_url} alt="Foto pesan" className="rounded-[10px] max-w-[280px] w-full object-cover" loading="lazy" />
                          </div>
                        ) : null}

                        {m.body ? (
                          <p className="text-[14.5px] leading-relaxed break-words whitespace-pre-wrap">{m.body}</p>
                        ) : null}

                        <div className="xora-bubble-footer">
                          <span className="text-[10px] text-[#97a9c9]">
                            {new Date(m.created_at).toLocaleTimeString('id-ID', {
                              hour: '2-digit',
                              minute: '2-digit',
                              timeZone: 'Asia/Jakarta',
                            })}
                          </span>
                          {isMine && (
                            <span className="ml-1">
                              {m.read ? (
                                <Checks size={15} weight="bold" className="text-[#38bdf8]" />
                              ) : (
                                <Check size={15} weight="bold" className="text-[#97a9c9]" />
                              )}
                            </span>
                          )}
                          <div className="relative ml-auto">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setOpenMenuId(openMenuId === m.id ? null : m.id);
                              }}
                              className="xora-msg-menu-btn"
                              aria-label="Opsi pesan"
                            >
                              <DotsThreeVertical size={16} weight="bold" />
                            </button>
                            {openMenuId === m.id && (
                              <div className="xora-msg-menu" onClick={(e) => e.stopPropagation()}>
                                <button type="button" onClick={() => startReply(m)} className="xora-msg-menu-item">
                                  <ArrowUUpLeft size={16} weight="bold" /> Balas
                                </button>
                                {canDelete && (
                                  <button type="button" onClick={() => deleteMessage(m.id)} className="xora-msg-menu-item danger">
                                    <Trash size={16} weight="bold" /> Hapus
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {(replyingTo || chatPhoto) && (
              <div className="xora-composer-preview">
                {replyingTo && (
                  <div className="xora-reply-bar">
                    <div className="flex-1 min-w-0">
                      <p className="text-[11px] font-bold text-[#34f5c5]">Membalas {replyingTo.from}</p>
                      <p className="text-[11px] text-[#97a9c9] truncate">{replyingTo.text}</p>
                    </div>
                    <button type="button" onClick={() => setReplyingTo(null)} className="xora-icon-btn !size-7" aria-label="Batalkan balasan">
                      <X size={14} weight="bold" />
                    </button>
                  </div>
                )}
                {chatPhoto && (
                  <div className="xora-photo-preview-bar">
                    <div className="relative size-14 rounded-[8px] overflow-hidden border border-[#23304c]">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={chatPhoto} alt="Preview foto" className="size-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setChatPhoto(null)}
                        className="absolute top-0.5 right-0.5 bg-black/70 rounded-full p-0.5 text-white"
                        aria-label="Hapus foto"
                      >
                        <X size={12} weight="bold" />
                      </button>
                    </div>
                    <p className="text-[11px] text-[#97a9c9]">Foto siap dikirim</p>
                  </div>
                )}
              </div>
            )}

            <form onSubmit={sendMessage} className="xora-composer">
              <input type="file" ref={chatPhotoInputRef} accept="image/*" className="hidden" onChange={handleChatPhotoSelect} />
              <button
                type="button"
                onClick={() => chatPhotoInputRef.current?.click()}
                className="xora-attach-btn"
                aria-label="Lampirkan foto"
                title="Kirim foto"
              >
                <Camera size={20} weight="bold" />
              </button>
              <textarea
                value={chatInput}
                onChange={(e) => setChatInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    void sendMessage();
                  }
                }}
                rows={1}
                placeholder={chatPhoto ? 'Tambahkan keterangan (opsional)...' : 'Tulis pesan...'}
                className="xora-composer-input"
                aria-label="Tulis pesan"
              />
              <button
                type="submit"
                disabled={isSending || (!chatInput.trim() && !chatPhoto)}
                className="xora-send-btn"
                aria-label="Kirim pesan"
              >
                <PaperPlaneRight size={20} weight="fill" />
              </button>
            </form>
          </>
        ) : (
          <div className="xora-empty-room">
            <div className="size-20 rounded-full bg-[#111a2e] border border-[#23304c] flex items-center justify-center text-[#34f5c5] mx-auto mb-4 shadow-[0_0_24px_rgba(52,245,197,0.15)]">
              <Chats size={44} weight="duotone" />
            </div>
            <h2 className="text-xl font-black text-[#eaf2ff]">Ruang Percakapan Kelas</h2>
            <p className="text-xs text-[#97a9c9] max-w-sm mx-auto mt-1 leading-relaxed">
              Buka Grup Kelas X SIJA B atau pilih teman sekelas dari panel kiri untuk mulai mengobrol, berbagi foto, atau berdiskusi santai.
            </p>
          </div>
        )}

        {errorMsg ? (
          <div className="p-3 bg-[#fb7185]/20 text-[#fb7185] border-t border-[#fb7185]/40 text-xs text-center font-bold">{errorMsg}</div>
        ) : null}
      </main>

      {showStoryCreator && (
        <div className="xora-modal-overlay">
          <div className="xora-story-dialog">
            <div className="flex items-center justify-between border-b border-[#23304c] pb-3 mb-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setStoryType('text')}
                  className={`px-3 py-1 text-xs font-bold rounded-[6px] border ${
                    storyType === 'text' ? 'bg-[#34f5c5] text-[#070b18] border-[#34f5c5]' : 'bg-transparent text-[#97a9c9] border-[#23304c]'
                  }`}
                >
                  <TextT size={15} className="inline mr-1" />
                  Status Teks
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setStoryType('photo');
                    photoInputRef.current?.click();
                  }}
                  className={`px-3 py-1 text-xs font-bold rounded-[6px] border ${
                    storyType === 'photo' ? 'bg-[#34f5c5] text-[#070b18] border-[#34f5c5]' : 'bg-transparent text-[#97a9c9] border-[#23304c]'
                  }`}
                >
                  <Camera size={15} className="inline mr-1" />
                  Status Foto
                </button>
              </div>
              <button type="button" onClick={() => setShowStoryCreator(false)} className="xora-icon-btn" aria-label="Tutup">
                <X size={20} />
              </button>
            </div>

            <input type="file" ref={photoInputRef} accept="image/*" className="hidden" onChange={handlePhotoSelect} />

            {storyType === 'text' ? (
              <div className="space-y-3">
                <div className="rounded-[10px] p-6 min-h-[180px] flex items-center justify-center transition" style={{ backgroundColor: storyColor }}>
                  <textarea
                    value={storyText}
                    onChange={(e) => setStoryText(e.target.value)}
                    maxLength={1000}
                    placeholder="Ketik apa yang sedang terjadi..."
                    className="w-full bg-transparent text-white text-center font-bold text-lg resize-none placeholder-white/70 focus:outline-none"
                    rows={4}
                  />
                </div>
                <div className="flex items-center justify-center gap-2 pt-1">
                  {COLOR_PRESETS.map((color) => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => setStoryColor(color)}
                      className={`size-7 rounded-full border-2 transition ${storyColor === color ? 'border-white scale-110 shadow-lg' : 'border-transparent'}`}
                      style={{ backgroundColor: color }}
                      title="Ganti warna latar"
                    />
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {storyPhoto ? (
                  <div className="relative rounded-[10px] overflow-hidden bg-black/40 max-h-[260px] flex items-center justify-center border border-[#23304c]">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={storyPhoto} alt="Status Preview" className="max-h-[260px] object-contain" />
                    <button
                      type="button"
                      onClick={() => setStoryPhoto(null)}
                      className="absolute top-2 right-2 bg-black/60 p-1.5 rounded-full text-white hover:bg-black"
                    >
                      <X size={16} />
                    </button>
                  </div>
                ) : (
                  <div onClick={() => photoInputRef.current?.click()} className="p-8 border-2 border-dashed border-[#23304c] rounded-[10px] text-center cursor-pointer hover:bg-[#111a2e]">
                    <ImageIcon size={36} className="mx-auto text-[#34f5c5] mb-2" />
                    <p className="text-xs font-bold text-[#eaf2ff]">Klik untuk pilih foto status</p>
                    <p className="text-[10px] text-[#97a9c9] mt-0.5">JPG / PNG otomatis dikompresi</p>
                  </div>
                )}
                <input
                  type="text"
                  value={storyText}
                  onChange={(e) => setStoryText(e.target.value)}
                  placeholder="Tambahkan keterangan foto (opsional)..."
                  className="xora-field text-xs"
                />
              </div>
            )}

            <div className="pt-3 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowStoryCreator(false)}
                className="btn-secondary !bg-transparent !text-[#97a9c9] !border-[#23304c] !min-h-[38px] text-xs font-bold"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={storySubmitting || (storyType === 'text' && !storyText.trim()) || (storyType === 'photo' && !storyPhoto)}
                onClick={submitStory}
                className="btn-primary !bg-[#34f5c5] !text-[#070b18] !min-h-[38px] text-xs font-black px-4"
              >
                {storySubmitting ? 'Mengunggah...' : 'Bagikan Status (24 Jam)'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeStoryGroup && activeStoryGroup.length > 0 && (
        <div
          className="xora-story-viewer-overlay"
          onMouseDown={() => setStoryPaused(true)}
          onMouseUp={() => setStoryPaused(false)}
          onTouchStart={() => setStoryPaused(true)}
          onTouchEnd={() => setStoryPaused(false)}
        >
          <div className="xora-story-progress-bar">
            {activeStoryGroup.map((s, idx) => {
              let width = 0;
              if (idx < storyIndex) width = 100;
              else if (idx === storyIndex) width = storyProgress;
              return (
                <div key={s.id} className="xora-progress-track">
                  <div className="xora-progress-fill" style={{ width: `${width}%` }} />
                </div>
              );
            })}
          </div>

          <div className="xora-story-top-row">
            <div className="flex items-center gap-2">
              <div className="xora-avatar-circle !size-9">{activeStoryGroup[storyIndex]?.full_name?.slice(0, 1).toUpperCase()}</div>
              <div>
                <p className="text-sm font-bold text-white leading-tight">{activeStoryGroup[storyIndex]?.full_name}</p>
                <p className="text-[10px] text-white/70">
                  {new Date(activeStoryGroup[storyIndex]?.created_at).toLocaleTimeString('id-ID', {
                    hour: '2-digit',
                    minute: '2-digit',
                    timeZone: 'Asia/Jakarta',
                  })}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activeStoryGroup[storyIndex]?.user_id === userId && (
                <button
                  type="button"
                  onClick={() => deleteStory(activeStoryGroup[storyIndex].id)}
                  className="p-2 text-white/80 hover:text-[#fb7185]"
                  title="Hapus status ini"
                >
                  <Trash size={20} weight="bold" />
                </button>
              )}
              <button type="button" onClick={() => setActiveStoryGroup(null)} className="p-2 text-white/80 hover:text-white" title="Tutup">
                <X size={22} weight="bold" />
              </button>
            </div>
          </div>

          <div
            className="xora-story-body"
            style={{
              backgroundColor: activeStoryGroup[storyIndex]?.type === 'text' ? activeStoryGroup[storyIndex]?.bg_color : '#070b18',
            }}
          >
            {activeStoryGroup[storyIndex]?.type === 'text' ? (
              <p className="text-white text-xl sm:text-2xl font-black text-center px-6 max-w-lg leading-relaxed whitespace-pre-wrap">
                {activeStoryGroup[storyIndex]?.content}
              </p>
            ) : (
              <div className="flex flex-col items-center justify-center size-full p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={activeStoryGroup[storyIndex]?.media_url || ''}
                  alt="Story"
                  className="max-h-[75vh] max-w-full object-contain rounded-[8px]"
                />
                {activeStoryGroup[storyIndex]?.content ? (
                  <p className="text-white text-sm font-semibold bg-black/60 px-4 py-2 rounded-[20px] mt-3 max-w-md text-center">
                    {activeStoryGroup[storyIndex]?.content}
                  </p>
                ) : null}
              </div>
            )}
          </div>

          <div
            className="xora-story-tap-left"
            onClick={(e) => {
              e.stopPropagation();
              if (storyIndex > 0) setStoryIndex((i) => i - 1);
            }}
          />
          <div
            className="xora-story-tap-right"
            onClick={(e) => {
              e.stopPropagation();
              if (storyIndex < activeStoryGroup.length - 1) setStoryIndex((i) => i + 1);
              else setActiveStoryGroup(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
