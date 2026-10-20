export const ATTENDANCE_STATUS = {
  PRESENT: "Hadir",
  LATE: "Terlambat",
  EXCUSED: "Izin",
  SICK: "Sakit",
  ABSENT: "Alfa",
} as const;

export type AttendanceStatus = keyof typeof ATTENDANCE_STATUS;

export function attendanceStatusClass(status: AttendanceStatus) {
  if (status === "PRESENT") return "bg-[#b9e2ce] text-[#113a27]";
  if (status === "LATE") return "bg-[#ffdb59] text-[#5b4000]";
  if (status === "EXCUSED") return "bg-[#c5d3ff] text-[#1b2b65]";
  if (status === "SICK") return "bg-[#d9c8ff] text-[#38265f]";
  return "bg-[#ffa18b] text-[#481c17]";
}
