import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/db';

const input = z.discriminatedUnion('action', [
  z.object({ action: z.literal('start'), recipient: z.string().uuid() }),
  z.object({ action: z.literal('send'), conversation: z.string().uuid(), id: z.string().uuid(), body: z.string().trim().min(1).max(5000) }),
  z.object({ action: z.literal('read'), conversation: z.string().uuid() }),
]);

export async function GET(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Login dulu, ya.' }, { status: 401 });
  const id = new URL(request.url).searchParams.get('conversation');
  if (id) {
    if (!z.string().uuid().safeParse(id).success) return NextResponse.json({ error: 'Chat nggak valid.' }, { status: 400 });
    const [member] = await sql`SELECT 1 FROM chat_members WHERE conversation_id=${id} AND user_id=${user.id}`;
    if (!member) return NextResponse.json({ error: 'Chat nggak ditemukan.' }, { status: 404 });
    const messages = await sql`SELECT * FROM (SELECT m.id,m.sender_id,m.body,m.created_at,
      EXISTS(SELECT 1 FROM chat_members r WHERE r.conversation_id=m.conversation_id AND r.user_id!=m.sender_id AND r.last_read_at>=m.created_at) AS read
      FROM chat_messages m WHERE conversation_id=${id} ORDER BY created_at DESC,id DESC LIMIT 100) recent ORDER BY created_at,id`;
    return NextResponse.json({ messages });
  }
  const conversations = await sql`SELECT c.id,COALESCE(c.title,u.full_name) AS title,
    (SELECT body FROM chat_messages WHERE conversation_id=c.id ORDER BY created_at DESC,id DESC LIMIT 1) AS preview
    FROM chat_members mine JOIN chat_conversations c ON c.id=mine.conversation_id
    JOIN chat_members peer ON peer.conversation_id=c.id AND peer.user_id!=mine.user_id
    JOIN users u ON u.id=peer.user_id WHERE mine.user_id=${user.id} ORDER BY c.created_at DESC`;
  const contacts = await sql`SELECT id,full_name FROM users WHERE id!=${user.id} ORDER BY full_name`;
  return NextResponse.json({ conversations, contacts, userId: user.id, realtimeConfigured: Boolean(process.env.ABLY_API_KEY) });
}

export async function POST(request: Request) {
  const origin = request.headers.get('origin');
  if (origin && origin !== new URL(request.url).origin) return NextResponse.json({ error: 'Origin tidak valid.' }, { status: 403 });
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Login dulu, ya.' }, { status: 401 });
  const parsed = input.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: 'Pesannya belum valid.' }, { status: 400 });
  const data = parsed.data;
  if (data.action === 'start') {
    const [recipient] = await sql`SELECT id FROM users WHERE id=${data.recipient} AND id!=${user.id}`;
    if (!recipient) return NextResponse.json({ error: 'Kontak nggak ditemukan.' }, { status: 404 });
    const key = [user.id,data.recipient].sort().join(':');
    const id = await sql.begin(async tx => {
      const [conversation] = await tx`INSERT INTO chat_conversations(kind,direct_key,created_by) VALUES('direct',${key},${user.id}) ON CONFLICT(direct_key) DO UPDATE SET direct_key=EXCLUDED.direct_key RETURNING id`;
      await tx`INSERT INTO chat_members(conversation_id,user_id) VALUES(${conversation.id},${user.id}),(${conversation.id},${data.recipient}) ON CONFLICT DO NOTHING`;
      return conversation.id;
    });
    return NextResponse.json({ id });
  }
  const [member] = await sql`SELECT 1 FROM chat_members WHERE conversation_id=${data.conversation} AND user_id=${user.id}`;
  if (!member) return NextResponse.json({ error: 'Chat nggak ditemukan.' }, { status: 404 });
  if (data.action === 'read') {
    await sql`UPDATE chat_members SET last_read_at=now() WHERE conversation_id=${data.conversation} AND user_id=${user.id}`;
    return NextResponse.json({ ok: true });
  }
  await sql`INSERT INTO chat_messages(id,conversation_id,sender_id,body) VALUES(${data.id},${data.conversation},${user.id},${data.body}) ON CONFLICT(id) DO NOTHING`;
  return NextResponse.json({ ok: true });
}
