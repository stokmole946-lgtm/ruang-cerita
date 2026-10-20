import { getSession } from "@/lib/auth";
import { sql } from "@/lib/db";
import { getClassMonthlyAttendance, parseMonthPeriod } from "@/lib/attendance-report";

function csvCell(value: unknown) {
  let text = String(value ?? "");
  if (/^[=+\-@]/.test(text)) text = `'${text}`;
  return `"${text.replaceAll('"', '""')}"`;
}

export async function GET(request: Request) {
  const user = await getSession();
  if (!user) return Response.json({ error: "Login dulu, ya." }, { status: 401 });
  if (user.role !== "ADMIN") return Response.json({ error: "Khusus pengurus." }, { status: 403 });

  const period = parseMonthPeriod(new URL(request.url).searchParams.get("month"));
  if (!period) return Response.json({ error: "Format bulan harus YYYY-MM." }, { status: 400 });

  const report = await getClassMonthlyAttendance(period);
  const rows = [
    ["Nama", "Username", "Hadir", "Terlambat", "Izin", "Sakit", "Alfa", "Netral", "Persentase"],
    ...report.students.map((student) => [
      student.full_name,
      student.username,
      student.present,
      student.late,
      student.excused,
      student.sick,
      student.absent,
      student.neutral,
      `${student.attendance_percentage}%`,
    ]),
  ];
  const csv = `\uFEFF${rows.map((row) => row.map(csvCell).join(",")).join("\r\n")}`;

  await sql`
    INSERT INTO audit_logs (actor_id, action)
    VALUES (${user.id}, ${`EXPORT_ATTENDANCE_${period.key}`})
  `;

  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="absensi-x-sija-b-${period.key}.csv"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
