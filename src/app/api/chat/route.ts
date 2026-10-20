import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/db';

const input = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('start'),
    recipient: z.string().uuid(),
  }),
  z.object({
    action: z.literal('send'),
    conversation: z.string().uuid(),
    id: z.string().uuid(),
    body: z.string().trim().min(1).max(5000),
  }),
  z.object({
    action: z.literal('read'),
    conversation: z.string().uuid(),
  }),
  z.object({
    action: z.literal('create_story'),
    type: z.enum(['text', 'photo']),
    content: z.string().max(2000).optional().default(''),
    mediaUrl: z.string().optional().default(''),
    bgColor: z.string().max(30).optional().default('#10B981'),
  }),
  z.object({
    action: z.literal('delete_story'),
    storyId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('update_profile'),
    fullName: z.string().trim().min(2).max(100),
    bio: z.string().trim().max(300).optional().default(''),
    whatsapp: z.string().trim().max(30).optional().default(''),
  }),
]);

export async function GET(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Login dulu, ya.' }, { status: 401 });

  const id = new URL(request.url).searchParams.get('conversation');
  if (id) {
    if (!z.string().uuid().safeParse(id).success) {
      return NextResponse.json({ error: 'Chat nggak valid.' }, { status: 400 });
    }
    const [member] = await sql`
      SELECT 1 FROM chat_members WHERE conversation_id = ${id} AND user_id = ${user.id}
    `;
    if (!member) {
      return NextResponse.json({ error: 'Chat nggak ditemukan.' }, { status: 404 });
    }

    const messages = await sql`
      SELECT * FROM (
        SELECT m.id, m.sender_id, m.body, m.created_at,
          EXISTS(
            SELECT 1 FROM chat_members r
            WHERE r.conversation_id = m.conversation_id
              AND r.user_id != m.sender_id
              AND r.last_read_at >= m.created_at
          ) AS read
        FROM chat_messages m
        WHERE conversation_id = ${id}
        ORDER BY created_at DESC, id DESC
        LIMIT 100
      ) recent
      ORDER BY created_at ASC, id ASC
    `;
    return NextResponse.json({ messages });
  }

  // Ambil profil pengguna saat ini
  const [profile] = await sql`
    SELECT id, full_name, username, role,
      COALESCE(bio, 'Ada di Ruang Cerita X SIJA B.') AS bio,
      avatar, whatsapp
    FROM users
    WHERE id = ${user.id}
  `;

  // Ambil percakapan aktif
  const conversations = await sql`
    SELECT c.id,
      COALESCE(c.title, u.full_name) AS title,
      u.username AS partner_username,
      u.avatar AS partner_avatar,
      (
        SELECT body FROM chat_messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC, id DESC LIMIT 1
      ) AS preview,
      (
        SELECT created_at FROM chat_messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC, id DESC LIMIT 1
      ) AS last_message_at,
      (
        SELECT count(*)::int FROM chat_messages m
        WHERE m.conversation_id = c.id
          AND m.created_at > COALESCE(mine.last_read_at, '1970-01-01'::timestamptz)
          AND m.sender_id != ${user.id}
      ) AS unread_count
    FROM chat_members mine
    JOIN chat_conversations c ON c.id = mine.conversation_id
    JOIN chat_members peer ON peer.conversation_id = c.id AND peer.user_id != mine.user_id
    JOIN users u ON u.id = peer.user_id
    WHERE mine.user_id = ${user.id}
    ORDER BY COALESCE(
      (
        SELECT created_at FROM chat_messages
        WHERE conversation_id = c.id
        ORDER BY created_at DESC, id DESC LIMIT 1
      ),
      c.created_at
    ) DESC
  `;

  // Ambil semua kontak siswa & pengurus
  const contacts = await sql`
    SELECT id, full_name, username,
      COALESCE(bio, 'Ada di Ruang Cerita X SIJA B.') AS bio,
      avatar
    FROM users
    WHERE id != ${user.id}
    ORDER BY full_name ASC
  `;

  // Ambil status / stories aktif (24 jam)
  const stories = await sql`
    SELECT s.id, s.user_id, s.type, s.content, s.media_url, s.bg_color, s.created_at, s.expires_at,
      u.full_name, u.username, u.avatar
    FROM chat_stories s
    JOIN users u ON u.id = s.user_id
    WHERE s.expires_at > now()
    ORDER BY s.created_at DESC
  `;

  const myStories = stories.filter((s) => s.user_id === user.id);
  const otherStories = stories.filter((s) => s.user_id !== user.id);

  // Kelompokkan other stories berdasarkan user_id
  type StoryRow = (typeof stories)[number];
  const otherGroupsMap = new Map<string, {
    userId: string;
    fullName: string;
    username: string;
    avatar: string | null;
    latestCreatedAt: string;
    items: StoryRow[];
  }>();

  for (const s of otherStories) {
    if (!otherGroupsMap.has(s.user_id)) {
      otherGroupsMap.set(s.user_id, {
        userId: s.user_id,
        fullName: s.full_name,
        username: s.username,
        avatar: s.avatar,
        latestCreatedAt: s.created_at,
        items: [],
      });
    }
    otherGroupsMap.get(s.user_id)!.items.push(s);
  }

  const otherGroups = Array.from(otherGroupsMap.values());

  return NextResponse.json({
    userId: user.id,
    profile,
    conversations,
    contacts,
    myStories,
    otherGroups,
  });
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) {
    return NextResponse.json({ error: 'Origin tidak valid.' }, { status: 403 });
  }

  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Login dulu, ya.' }, { status: 401 });

  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Permintaan tidak valid.' }, { status: 400 });
  }

  const data = parsed.data;

  if (data.action === 'start') {
    const [recipient] = await sql`
      SELECT id FROM users WHERE id = ${data.recipient} AND id != ${user.id}
    `;
    if (!recipient) {
      return NextResponse.json({ error: 'Kontak nggak ditemukan.' }, { status: 404 });
    }
    const key = [user.id, data.recipient].sort().join(':');
    const id = await sql.begin(async (tx) => {
      const [conversation] = await tx`
        INSERT INTO chat_conversations (kind, direct_key, created_by)
        VALUES ('direct', ${key}, ${user.id})
        ON CONFLICT (direct_key) DO UPDATE SET direct_key = EXCLUDED.direct_key
        RETURNING id
      `;
      await tx`
        INSERT INTO chat_members (conversation_id, user_id)
        VALUES (${conversation.id}, ${user.id}), (${conversation.id}, ${data.recipient})
        ON CONFLICT DO NOTHING
      `;
      return conversation.id;
    });
    return NextResponse.json({ id });
  }

  if (data.action === 'send') {
    const [member] = await sql`
      SELECT 1 FROM chat_members WHERE conversation_id = ${data.conversation} AND user_id = ${user.id}
    `;
    if (!member) {
      return NextResponse.json({ error: 'Chat nggak ditemukan.' }, { status: 404 });
    }
    await sql`
      INSERT INTO chat_messages (id, conversation_id, sender_id, body)
      VALUES (${data.id}, ${data.conversation}, ${user.id}, ${data.body})
      ON CONFLICT (id) DO NOTHING
    `;
    return NextResponse.json({ ok: true });
  }

  if (data.action === 'read') {
    await sql`
      UPDATE chat_members
      SET last_read_at = now()
      WHERE conversation_id = ${data.conversation} AND user_id = ${user.id}
    `;
    return NextResponse.json({ ok: true });
  }

  if (data.action === 'create_story') {
    if (data.type === 'text' && !data.content.trim()) {
      return NextResponse.json({ error: 'Tuliskan teks cerita Anda.' }, { status: 400 });
    }
    if (data.type === 'photo' && !data.mediaUrl) {
      return NextResponse.json({ error: 'Foto wajib dipilih.' }, { status: 400 });
    }

    const [story] = await sql`
      INSERT INTO chat_stories (user_id, type, content, media_url, bg_color)
      VALUES (${user.id}, ${data.type}, ${data.content.trim()}, ${data.mediaUrl || null}, ${data.bgColor})
      RETURNING id
    `;
    return NextResponse.json({ ok: true, id: story.id });
  }

  if (data.action === 'delete_story') {
    await sql`
      DELETE FROM chat_stories WHERE id = ${data.storyId} AND user_id = ${user.id}
    `;
    return NextResponse.json({ ok: true });
  }

  if (data.action === 'update_profile') {
    await sql`
      UPDATE users
      SET full_name = ${data.fullName},
          bio = ${data.bio || 'Ada di Ruang Cerita X SIJA B.'},
          whatsapp = ${data.whatsapp || null}
      WHERE id = ${user.id}
    `;
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Aksi tidak diketahui' }, { status: 400 });
}
