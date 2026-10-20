import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSession } from '@/lib/auth';
import { sql } from '@/lib/db';
import { getVapidPublicKey, sendPushToUser } from '@/lib/push-notifications';

const subscribeSchema = z.object({
  action: z.literal('subscribe'),
  subscription: z.object({
    endpoint: z.string().url().max(1000),
    keys: z.object({
      p256dh: z.string().min(1).max(500),
      auth: z.string().min(1).max(500),
    }),
  }),
});

const unsubscribeSchema = z.object({
  action: z.literal('unsubscribe'),
  endpoint: z.string().url().max(1000).optional(),
});

const testSchema = z.object({
  action: z.literal('test'),
});

const inputSchema = z.discriminatedUnion('action', [
  subscribeSchema,
  unsubscribeSchema,
  testSchema,
]);

export async function GET() {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Login dulu, ya.' }, { status: 401 });

  const publicKey = await getVapidPublicKey();

  const [hasSub] = await sql`
    SELECT 1 FROM push_subscriptions WHERE user_id = ${user.id} LIMIT 1
  `;

  return NextResponse.json({
    publicKey,
    subscribed: Boolean(hasSub),
  });
}

export async function POST(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: 'Login dulu, ya.' }, { status: 401 });

  const body = await request.json().catch(() => null);
  const parsed = inputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Data push tidak valid.' }, { status: 400 });
  }

  const data = parsed.data;

  if (data.action === 'subscribe') {
    const userAgent = request.headers.get('user-agent')?.slice(0, 300) || null;
    await sql`
      INSERT INTO push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
      VALUES (${user.id}, ${data.subscription.endpoint}, ${data.subscription.keys.p256dh}, ${data.subscription.keys.auth}, ${userAgent})
      ON CONFLICT (endpoint) DO UPDATE SET
        user_id = EXCLUDED.user_id,
        p256dh = EXCLUDED.p256dh,
        auth = EXCLUDED.auth,
        user_agent = EXCLUDED.user_agent
    `;
    return NextResponse.json({ ok: true, message: 'Notifikasi berhasil diaktifkan!' });
  }

  if (data.action === 'unsubscribe') {
    if (data.endpoint) {
      await sql`DELETE FROM push_subscriptions WHERE endpoint = ${data.endpoint} AND user_id = ${user.id}`;
    } else {
      await sql`DELETE FROM push_subscriptions WHERE user_id = ${user.id}`;
    }
    return NextResponse.json({ ok: true, message: 'Notifikasi dinonaktifkan.' });
  }

  if (data.action === 'test') {
    await sendPushToUser(user.id, {
      title: '🔔 Notifikasi Ruang Cerita Berfungsi!',
      body: `Halo ${user.fullName.split(' ')[0]}! Notifikasi realtime HP kamu sudah aktif sempurna.`,
      url: '/dashboard',
      tag: 'test-notification',
    });
    return NextResponse.json({ ok: true, message: 'Notifikasi tes telah dikirim ke HP kamu!' });
  }

  return NextResponse.json({ error: 'Aksi tidak dikenal.' }, { status: 400 });
}
