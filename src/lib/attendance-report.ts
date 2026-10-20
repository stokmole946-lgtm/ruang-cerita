import { sql } from "@/lib/db";

export interface MonthPeriod {
  key: string;
  start: string;
  end: string;
  label: string;
}

interface MonthlyStudentRow {
  id: string;
  full_name: string;
  username: string;
  avatar: string | null;
  present: number;
  late: number;
  excused: number;
  sick: number;
  absent: number;
  neutral: number;
}

export function parseMonthPeriod(value: string | null): MonthPeriod | null {
  if (!value || !/^\d{4}-(0[1-9]|1[0-2])$/.test(value)) return null;
  const [year, month] = value.split("-").map(Number);
  if (year < 2024 || year > 2100) return null;
  const next = month === 12 ? `${year + 1}-01-01` : `${year}-${String(month + 1).padStart(2, "0")}-01`;
  return {
    key: value,
    start: `${value}-01`,
    end: next,
    label: new Intl.DateTimeFormat("id-ID", { month: "long", year: "numeric", timeZone: "Asia/Jakarta" })
      .format(new Date(Date.UTC(year, month - 1, 1))),
  };
}

export async function getStudentMonthlyAttendance(studentId: string, period: MonthPeriod) {
  const [sessionCount] = await sql`
    SELECT COUNT(*)::int AS total
    FROM attendance_sessions
    WHERE closed_at IS NOT NULL
      AND starts_at >= (${period.start}::date AT TIME ZONE 'Asia/Jakarta')
      AND starts_at < (${period.end}::date AT TIME ZONE 'Asia/Jakarta')
  `;

  const records = await sql`
    SELECT r.id, r.status, r.scanned_at, r.note, r.source,
      s.id AS session_id, s.title, s.starts_at, s.late_after, s.closed_at
    FROM attendance_records r
    JOIN attendance_sessions s ON s.id = r.session_id
    WHERE r.student_id = ${studentId}
      AND s.closed_at IS NOT NULL
      AND s.starts_at >= (${period.start}::date AT TIME ZONE 'Asia/Jakarta')
      AND s.starts_at < (${period.end}::date AT TIME ZONE 'Asia/Jakarta')
    ORDER BY s.starts_at DESC
  `;

  const totals = { PRESENT: 0, LATE: 0, EXCUSED: 0, SICK: 0, ABSENT: 0, NEUTRAL: 0 };
  for (const record of records) {
    const status = record.status as keyof typeof totals;
    if (status in totals) totals[status] += 1;
  }
  const attended = totals.PRESENT + totals.LATE;
  const totalSessions = sessionCount?.total || 0;
  const resolvedSessions = Math.max(0, totalSessions - totals.NEUTRAL);

  return {
    period: { key: period.key, label: period.label },
    totalSessions,
    totals,
    attendancePercentage: resolvedSessions ? Math.round((attended / resolvedSessions) * 100) : 0,
    records,
  };
}

export async function getClassMonthlyAttendance(period: MonthPeriod) {
  const [sessionCount] = await sql`
    SELECT COUNT(*)::int AS total
    FROM attendance_sessions
    WHERE closed_at IS NOT NULL
      AND starts_at >= (${period.start}::date AT TIME ZONE 'Asia/Jakarta')
      AND starts_at < (${period.end}::date AT TIME ZONE 'Asia/Jakarta')
  `;
  const totalSessions = sessionCount?.total || 0;

  const students = (await sql`
    SELECT u.id, u.full_name, u.username, u.avatar,
      COUNT(r.id) FILTER (WHERE s.id IS NOT NULL AND r.status = 'PRESENT')::int AS present,
      COUNT(r.id) FILTER (WHERE s.id IS NOT NULL AND r.status = 'LATE')::int AS late,
      COUNT(r.id) FILTER (WHERE s.id IS NOT NULL AND r.status = 'EXCUSED')::int AS excused,
      COUNT(r.id) FILTER (WHERE s.id IS NOT NULL AND r.status = 'SICK')::int AS sick,
      COUNT(r.id) FILTER (WHERE s.id IS NOT NULL AND r.status = 'ABSENT')::int AS absent
      ,COUNT(r.id) FILTER (WHERE s.id IS NOT NULL AND r.status = 'NEUTRAL')::int AS neutral
    FROM users u
    LEFT JOIN attendance_records r ON r.student_id = u.id
    LEFT JOIN attendance_sessions s ON s.id = r.session_id
      AND s.closed_at IS NOT NULL
      AND s.starts_at >= (${period.start}::date AT TIME ZONE 'Asia/Jakarta')
      AND s.starts_at < (${period.end}::date AT TIME ZONE 'Asia/Jakarta')
    WHERE u.role = 'STUDENT'
    GROUP BY u.id
    ORDER BY u.full_name
  `) as unknown as MonthlyStudentRow[];

  const normalized = students.map((student) => ({
    ...student,
    attendance_percentage: totalSessions - student.neutral > 0
      ? Math.round(((student.present + student.late) / (totalSessions - student.neutral)) * 100)
      : 0,
  }));

  const totals = normalized.reduce(
    (result, student) => {
      result.PRESENT += student.present;
      result.LATE += student.late;
      result.EXCUSED += student.excused;
      result.SICK += student.sick;
      result.ABSENT += student.absent;
      result.NEUTRAL += student.neutral;
      return result;
    },
    { PRESENT: 0, LATE: 0, EXCUSED: 0, SICK: 0, ABSENT: 0, NEUTRAL: 0 },
  );

  return {
    period: { key: period.key, label: period.label },
    totalSessions,
    totals,
    attendancePercentage: totalSessions * normalized.length - totals.NEUTRAL > 0
      ? Math.round(
          ((totals.PRESENT + totals.LATE) /
            (totalSessions * normalized.length - totals.NEUTRAL)) * 100,
        )
      : 0,
    students: normalized,
  };
}
