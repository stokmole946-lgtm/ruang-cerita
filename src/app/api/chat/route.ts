import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/db';
import { sendPushToUsers } from '@/lib/push-notifications';

const imageUriSchema = z
  .string()
  .max(3_500_000, 'Ukuran foto maksimal 3.5MB')
  .refine((val) => !val || /^data:image\/(jpeg|png|webp|gif|jpg);base64,/i.test(val), {
    message: 'Format gambar harus berupa data URI gambar yang valid',
  });

const avatarUriSchema = z
  .string()
  .max(1_500_000, 'Ukuran foto profil maksimal 1.5MB')
  .refine((val) => !val || /^data:image\/(jpeg|png|webp|gif|jpg);base64,/i.test(val), {
    message: 'Format foto profil harus berupa data URI gambar yang valid',
  });

const input = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('start'),
    recipient: z.string().uuid(),
  }),
  z.object({
    action: z.literal('send'),
    conversation: z.string().uuid(),
    id: z.string().uuid(),
    body: z.string().trim().max(5000).optional().default(''),
    type: z.enum(['text', 'photo']).optional().default('text'),
    mediaUrl: imageUriSchema.optional().default(''),
    replyId: z.string().uuid().optional(),
    replyFrom: z.string().max(100).optional(),
    replyText: z.string().max(300).optional(),
  }),
  z.object({
    action: z.literal('delete_message'),
    messageId: z.string().uuid(),
  }),
  z.object({
    action: z.literal('read'),
    conversation: z.string().uuid(),
  }),
  z.object({
    action: z.literal('create_story'),
    type: z.enum(['text', 'photo']),
    content: z.string().max(2000).optional().default(''),
    mediaUrl: imageUriSchema.optional().default(''),
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
    avatar: avatarUriSchema.optional(),
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
        SELECT m.id, m.sender_id, m.body, m.type, m.media_url,
          m.reply_id, m.reply_from, m.reply_text,
          u.full_name AS sender_name, u.username AS sender_username,
          m.created_at,
          EXISTS(
            SELECT 1 FROM chat_members r
            WHERE r.conversation_id = m.conversation_id
              AND r.user_id != m.sender_id
              AND r.last_read_at >= m.created_at
          ) AS read
        FROM chat_messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.conversation_id = ${id}
        ORDER BY m.created_at DESC, m.id DESC
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

  // Ambil percakapan aktif (Grup & Direct)
  const conversations = await sql`
    SELECT c.id,
      c.kind,
      CASE
        WHEN c.kind = 'group' THEN c.title
        ELSE COALESCE(u.full_name, c.title)
      END AS title,
      CASE
        WHEN c.kind = 'group' THEN 'grup'
        ELSE u.username
      END AS partner_username,
      u.avatar AS partner_avatar,
      (SELECT count(*)::int FROM chat_members WHERE conversation_id = c.id) AS members_count,
      (
        SELECT CASE
          WHEN type = 'photo' THEN COALESCE(NULLIF(body, ''), '[Foto]')
          ELSE body
        END
        FROM chat_messages
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
    LEFT JOIN chat_members peer ON peer.conversation_id = c.id AND peer.user_id != mine.user_id AND c.kind = 'direct'
    LEFT JOIN users u ON u.id = peer.user_id
    WHERE mine.user_id = ${user.id}
    ORDER BY
      CASE WHEN c.kind = 'group' THEN 0 ELSE 1 END,
      COALESCE(
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

    if (data.type === 'text' && !data.body.trim()) {
      return NextResponse.json({ error: 'Pesan tidak boleh kosong.' }, { status: 400 });
    }
    if (data.type === 'photo' && !data.mediaUrl) {
      return NextResponse.json({ error: 'Foto wajib dipilih.' }, { status: 400 });
    }

    if (data.replyId) {
      const [parent] = await sql`
        SELECT m.id, u.full_name, m.body, m.type FROM chat_messages m
        JOIN users u ON u.id = m.sender_id
        WHERE m.id = ${data.replyId} AND m.conversation_id = ${data.conversation}
      `;
      if (!parent) {
        data.replyId = undefined;
        data.replyFrom = undefined;
        data.replyText = undefined;
      } else {
        data.replyFrom = parent.full_name;
        data.replyText = parent.type === 'photo' ? '[Foto]' : (parent.body || '').slice(0, 120);
      }
    }

    await sql`
      INSERT INTO chat_messages (
        id, conversation_id, sender_id, body, type, media_url, reply_id, reply_from, reply_text
      ) VALUES (
        ${data.id}, ${data.conversation}, ${user.id}, ${data.body},
        ${data.type}, ${data.mediaUrl || null},
        ${data.replyId || null}, ${data.replyFrom || null}, ${data.replyText || null}
      )
      ON CONFLICT (id) DO NOTHING
    `;

    // Trigger push notification to other chat members asynchronously
    void (async () => {
      try {
        const [conv] = await sql`
          SELECT kind, title FROM chat_conversations WHERE id = ${data.conversation} LIMIT 1
        `;
        const peers = await sql`
          SELECT user_id FROM chat_members
          WHERE conversation_id = ${data.conversation} AND user_id != ${user.id}
        `;
        const peerIds = peers.map((p) => p.user_id);
        if (!peerIds.length) return;

        const previewText = data.type === 'photo' ? '📷 [Foto]' : data.body;
        const pushTitle = conv?.kind === 'group'
          ? `${user.fullName} (${conv.title || 'Grup Kelas'})`
          : user.fullName;

        await sendPushToUsers(peerIds, {
          title: pushTitle,
          body: previewText.slice(0, 100),
          url: '/chat',
          tag: `chat-${data.conversation}`,
        });
      } catch (err) {
        console.error('Error sending chat push notification:', err);
      }
    })();

    return NextResponse.json({ ok: true });
  }

  if (data.action === 'delete_message') {
    const [msg] = await sql`
      SELECT sender_id FROM chat_messages WHERE id = ${data.messageId}
    `;
    if (!msg) {
      return NextResponse.json({ error: 'Pesan tidak ditemukan.' }, { status: 404 });
    }
    if (msg.sender_id !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Tidak berhak menghapus pesan ini.' }, { status: 403 });
    }

    await sql`
      DELETE FROM chat_messages WHERE id = ${data.messageId}
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
          whatsapp = ${data.whatsapp || null},
          avatar = CASE WHEN ${data.avatar !== undefined} THEN ${data.avatar || null} ELSE avatar END
      WHERE id = ${user.id}
    `;
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: 'Aksi tidak diketahui' }, { status: 400 });
}
