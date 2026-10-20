import webpush from 'web-push';
import { sql } from '@/lib/db';

interface PushPayload {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
  badge?: string;
}

let vapidConfigured = false;
let cachedPublicKey = '';

export async function getVapidPublicKey(): Promise<string> {
  if (cachedPublicKey) return cachedPublicKey;

  let pub = process.env.VAPID_PUBLIC_KEY;
  if (!pub) {
    const [row] = await sql`SELECT secret FROM app_secrets WHERE name = 'vapid_public_key' LIMIT 1`;
    pub = row?.secret;
  }
  cachedPublicKey = pub || 'BFZyGD132dSUcuHEtsokzC2Za_2212Qi9ggfwW7M20utkqHtpJOeO9SoiSQXIkhz4ArN71ITbqBKZ6M7YRGvy4w';
  return cachedPublicKey;
}

async function ensureVapidConfig() {
  if (vapidConfigured) return;

  const publicKey = await getVapidPublicKey();
  let privateKey = process.env.VAPID_PRIVATE_KEY;
  if (!privateKey) {
    const [row] = await sql`SELECT secret FROM app_secrets WHERE name = 'vapid_private_key' LIMIT 1`;
    privateKey = row?.secret;
  }
  privateKey = privateKey || 'r8mPZCPYhdilxVJXey9mvRDSNhVR7AOa_YujTmHwRpQ';

  webpush.setVapidDetails('mailto:pengurus@xsijab.sch.id', publicKey, privateKey);
  vapidConfigured = true;
}

export async function sendPushToUser(userId: string, payload: PushPayload) {
  return sendPushToUsers([userId], payload);
}

export async function sendPushToUsers(userIds: string[], payload: PushPayload) {
  if (!userIds.length) return;

  try {
    await ensureVapidConfig();

    const subscriptions = await sql`
      SELECT id, endpoint, p256dh, auth
      FROM push_subscriptions
      WHERE user_id = ANY(${userIds})
    `;

    if (!subscriptions.length) return;

    const payloadString = JSON.stringify({
      title: payload.title,
      body: payload.body,
      url: payload.url || '/',
      tag: payload.tag || 'ruang-cerita-notice',
      icon: payload.icon || '/icons/icon-192.png',
      badge: payload.badge || '/icons/icon-192.png',
    });

    const deadSubIds: string[] = [];

    await Promise.allSettled(
      subscriptions.map(async (sub) => {
        try {
          await webpush.sendNotification(
            {
              endpoint: sub.endpoint,
              keys: {
                p256dh: sub.p256dh,
                auth: sub.auth,
              },
            },
            payloadString
          );
        } catch (err: unknown) {
          const status = (err as { statusCode?: number })?.statusCode;
          if (status === 404 || status === 410) {
            deadSubIds.push(sub.id);
          }
        }
      })
    );

    if (deadSubIds.length) {
      await sql`DELETE FROM push_subscriptions WHERE id = ANY(${deadSubIds})`;
    }
  } catch (error) {
    console.error('Push notification failed:', error);
  }
}

export async function sendPushToRole(
  role: 'STUDENT' | 'ADMIN',
  payload: PushPayload,
  excludeUserId?: string
) {
  try {
    const users = await sql`
      SELECT id FROM users
      WHERE role = ${role}
        AND (${excludeUserId ? sql`id != ${excludeUserId}` : sql`TRUE`})
    `;
    const userIds = users.map((u) => u.id);
    await sendPushToUsers(userIds, payload);
  } catch (err) {
    console.error(`Failed to send push to role ${role}:`, err);
  }
}

export async function sendPushToClass(payload: PushPayload, excludeUserId?: string) {
  try {
    const users = await sql`
      SELECT id FROM users
      WHERE (${excludeUserId ? sql`id != ${excludeUserId}` : sql`TRUE`})
    `;
    const userIds = users.map((u) => u.id);
    await sendPushToUsers(userIds, payload);
  } catch (err) {
    console.error('Failed to send push to class:', err);
  }
}
