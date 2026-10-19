export interface PiketMember {
  name: string;
  username: string;
  isCoordinator: boolean;
}

export interface DayPiket {
  dayKey: "senin" | "selasa" | "rabu" | "kamis" | "jumat";
  dayName: string;
  coordinator: PiketMember;
  members: PiketMember[];
}

export const PIKET_SCHEDULE: DayPiket[] = [
  {
    dayKey: "senin",
    dayName: "Senin",
    coordinator: { name: "Fauzan", username: "fauzan", isCoordinator: true },
    members: [
      { name: "Fauzan", username: "fauzan", isCoordinator: true },
      { name: "Fauzi", username: "mfauzi", isCoordinator: false },
      { name: "Najma", username: "najma", isCoordinator: false },
      { name: "Syakila", username: "syakila", isCoordinator: false },
      { name: "Azkiya", username: "azkiya", isCoordinator: false },
      { name: "Rifki", username: "mrifki", isCoordinator: false },
      { name: "Kayla", username: "kayla", isCoordinator: false },
    ],
  },
  {
    dayKey: "selasa",
    dayName: "Selasa",
    coordinator: { name: "Imran", username: "imran", isCoordinator: true },
    members: [
      { name: "Imran", username: "imran", isCoordinator: true },
      { name: "Ahdan", username: "mahdan", isCoordinator: false },
      { name: "Asyfa", username: "asyfa", isCoordinator: false },
      { name: "Reynandi", username: "reynandi", isCoordinator: false },
      { name: "Zahira", username: "zahira", isCoordinator: false },
      { name: "Ratih", username: "ratih", isCoordinator: false },
      { name: "Annisa", username: "annisa", isCoordinator: false },
    ],
  },
  {
    dayKey: "rabu",
    dayName: "Rabu",
    coordinator: { name: "Maya", username: "maya", isCoordinator: true },
    members: [
      { name: "Maya", username: "maya", isCoordinator: true },
      { name: "Hafizd", username: "hafizd", isCoordinator: false },
      { name: "Ayumi", username: "ayumi", isCoordinator: false },
      { name: "Daffa", username: "daffa", isCoordinator: false },
      { name: "Riffat", username: "riffat", isCoordinator: false },
      { name: "Asep", username: "asep", isCoordinator: false },
    ],
  },
  {
    dayKey: "kamis",
    dayName: "Kamis",
    coordinator: { name: "Zhian", username: "zhian", isCoordinator: true },
    members: [
      { name: "Zhian", username: "zhian", isCoordinator: true },
      { name: "Nasywa", username: "nasywa", isCoordinator: false },
      { name: "Bintang", username: "bintang", isCoordinator: false },
      { name: "Zaidan", username: "aqila", isCoordinator: false },
      { name: "Azka", username: "mkholid", isCoordinator: false },
      { name: "Qeilla", username: "qeilla", isCoordinator: false },
    ],
  },
  {
    dayKey: "jumat",
    dayName: "Jumat",
    coordinator: { name: "Zahra", username: "zahra", isCoordinator: true },
    members: [
      { name: "Zahra", username: "zahra", isCoordinator: true },
      { name: "Amira", username: "amira", isCoordinator: false },
      { name: "Lady", username: "lady", isCoordinator: false },
      { name: "Naya", username: "naya", isCoordinator: false },
      { name: "Putra", username: "putra", isCoordinator: false },
      { name: "Revalina", username: "revalina", isCoordinator: false },
    ],
  },
];

export function getTodayPiketInfo() {
  const formatter = new Intl.DateTimeFormat("id-ID", {
    weekday: "long",
    timeZone: "Asia/Jakarta",
  });
  const rawDay = formatter.format(new Date()).toLowerCase();

  const isWeekend = rawDay === "sabtu" || rawDay === "minggu";

  const activePiket =
    PIKET_SCHEDULE.find((p) => p.dayName.toLowerCase() === rawDay) ||
    PIKET_SCHEDULE[0]; // Fallback to Senin on weekend

  return {
    dayName: isWeekend ? "Hari Libur" : activePiket.dayName,
    activeDayKey: activePiket.dayKey,
    schedule: activePiket,
    isWeekend,
    todayDateISO: new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Jakarta",
    }).format(new Date()),
  };
}
