import { AdminAttendance } from '@/components/admin-attendance';
import { requireUser } from '@/lib/auth';

export default async function AdminAttendancePage() {
  await requireUser('ADMIN');
  return <AdminAttendance />;
}
