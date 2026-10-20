import { StudentAttendance } from '@/components/student-attendance';
import { requireUser } from '@/lib/auth';

export default async function AttendancePage() {
  const user = await requireUser('STUDENT');
  return <StudentAttendance fullName={user.fullName} />;
}
