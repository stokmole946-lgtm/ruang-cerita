import fs from "node:fs/promises";
import path from "node:path";
import postgres from "postgres";
import bcrypt from "bcryptjs";

const databaseUrl = process.env.DATABASE_URL ?? "postgres://postgres@127.0.0.1:5432/ruang_cerita";
const sql = postgres(databaseUrl, { max: 1 });
const schema = await fs.readFile(path.join(process.cwd(), "db/schema.sql"), "utf8");

const students = [
  ["Amira Khoirunnisa", "amira"],
  ["Annisa Nur Fatimah", "annisa"],
  ["Aqila Fauzi Zaidan", "aqila"],
  ["Asep Suhendar", "asep"],
  ["Asyfa Fauziah", "asyfa"],
  ["Ayumi Putri Isni", "ayumi"],
  ["Azkiya Nur Hapidzah", "azkiya"],
  ["Bintang Razzaqi Ramadhantyo", "bintang"],
  ["Daffa Faeyza Gunawan", "daffa"],
  ["Fauzan Muhammad Yasa", "fauzan"],
  ["Hafizd Noor Rayyan", "hafizd"],
  ["Imran Rasyid Prasetyo", "imran"],
  ["Kayla Luvena Nafeeza Yunizar", "kayla"],
  ["Lady Novita Sihombing", "lady"],
  ["Maya Nur Afrilia", "maya"],
  ["Mochammad Fauzi Ramadhan", "mfauzi"],
  ["Muhamad Rifki Herdiansyah", "mrifki"],
  ["Muhammad Ahdan Aidil Fitroh", "mahdan"],
  ["Muhammad Kholid Azka", "mkholid"],
  ["Najma Tsaaqib", "najma"],
  ["Nasywa Fadiyah Hadian", "nasywa"],
  ["Naya Asyfa Putri", "naya"],
  ["Putra Avilma", "putra"],
  ["Qeilla Andini Wulansari", "qeilla"],
  ["Ratih Ambarwati", "ratih"],
  ["Revalina Amalia Sholehah", "revalina"],
  ["Reynandi Saputra", "reynandi"],
  ["Riffat Jazmi Zaidan", "riffat"],
  ["Syakila Najwa Fadila", "syakila"],
  ["Zahira Arshita Putri Ismail", "zahira"],
  ["Zahra Putri Rachman", "zahra"],
  ["Zhian Alfarizi Muzaffar", "zhian"],
];

try {
  await sql.unsafe(schema);
  const passwordHash = await bcrypt.hash("123", 12);

  await sql.begin(async (tx) => {
    for (const [fullName, username] of students) {
      await tx`
        INSERT INTO users (full_name, username, password_hash, role)
        VALUES (${fullName}, ${username}, ${passwordHash}, 'STUDENT')
        ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name
      `;
    }
    await tx`
      INSERT INTO users (full_name, username, password_hash, role)
      VALUES ('Pengurus Kelas', 'pengurus1', ${passwordHash}, 'ADMIN')
      ON CONFLICT (username) DO UPDATE SET full_name = EXCLUDED.full_name
    `;
  });
  console.log(`Database siap. ${students.length} siswa + 1 pengurus tersedia.`);
} finally {
  await sql.end();
}
