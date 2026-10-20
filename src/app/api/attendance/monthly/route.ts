import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import {
  getClassMonthlyAttendance,
  getStudentMonthlyAttendance,
  parseMonthPeriod,
} from "@/lib/attendance-report";

export async function GET(request: Request) {
  const user = await getSession();
  if (!user) return NextResponse.json({ error: "Login dulu, ya." }, { status: 401 });

  const url = new URL(request.url);
  const period = parseMonthPeriod(url.searchParams.get("month"));
  if (!period) return NextResponse.json({ error: "Format bulan harus YYYY-MM." }, { status: 400 });

  if (user.role === "ADMIN") {
    return NextResponse.json(await getClassMonthlyAttendance(period));
  }

  return NextResponse.json(await getStudentMonthlyAttendance(user.id, period));
}
