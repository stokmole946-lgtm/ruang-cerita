import { requireUser } from '@/lib/auth';
import { ChatClient } from '@/components/chat-client';

export default async function ChatPage() {
  await requireUser();
  return <ChatClient />;
}
