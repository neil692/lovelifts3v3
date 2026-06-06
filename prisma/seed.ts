import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import bcrypt from "bcryptjs";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  // Tournament config
  await prisma.tournamentConfig.upsert({
    where: { id: "tournament" },
    update: {},
    create: {
      id: "tournament",
      name: "Love Lifts 3v3 Tournament",
      date: new Date("2026-06-06T09:30:00"),
      venue: "Common Ground Northeast",
      phase: "REGISTRATION",
    },
  });

  // Courts
  await prisma.court.upsert({ where: { id: "court-1" }, update: { name: "Faith" }, create: { id: "court-1", name: "Faith", order: 1 } });
  await prisma.court.upsert({ where: { id: "court-2" }, update: { name: "Hope" }, create: { id: "court-2", name: "Hope", order: 2 } });
  await prisma.court.upsert({ where: { id: "court-3" }, update: { name: "Peace" }, create: { id: "court-3", name: "Peace", order: 3 } });

  // Users
  const adminHash = await bcrypt.hash("lovelifts2026", 12);
  const skHash = await bcrypt.hash("scorer2026", 12);
  await prisma.user.upsert({
    where: { email: "admin@lovelifts.com" },
    update: { role: "ADMIN" },
    create: { name: "Admin", email: "admin@lovelifts.com", password: adminHash, role: "ADMIN" },
  });
  await prisma.user.upsert({
    where: { email: "scorer@lovelifts.com" },
    update: { role: "SCOREKEEPER" },
    create: { name: "Scorekeeper", email: "scorer@lovelifts.com", password: skHash, role: "SCOREKEEPER" },
  });

  // Divisions
  const divisions = [
    { id: "div-mens-18",   name: "Men's 18+",        slug: "mens-18",       order: 1 },
    { id: "div-mens-40",   name: "Men's 40+",        slug: "mens-40",       order: 2 },
    { id: "div-womens-18", name: "Women's 18+",      slug: "womens-18",     order: 3 },
    { id: "div-mens-1317", name: "Men's 13-17",      slug: "mens-13-17",    order: 4 },
    { id: "div-wom-1317",  name: "Women's 13-17",    slug: "womens-13-17",  order: 5 },
    { id: "div-boys-12",   name: "Boys 12 & Under",  slug: "boys-12u",      order: 6 },
    { id: "div-girls-12",  name: "Girls 12 & Under", slug: "girls-12u",     order: 7 },
    { id: "div-coed",      name: "Open Coed",        slug: "open-coed",     order: 8 },
  ];

  for (const d of divisions) {
    await prisma.division.upsert({ where: { id: d.id }, update: {}, create: d });
  }

  // Clear existing game/pool/team data so teams can be re-seeded cleanly
  await prisma.game.deleteMany();
  await prisma.poolTeam.deleteMany();
  await prisma.pool.deleteMany();
  await prisma.team.deleteMany();

  // 20 teams across 5 divisions
  const teams = [
    // Men's 18+ — 6 teams → 2 pools of 3
    { name: "Hoop There It Is",       divisionId: "div-mens-18",   contactName: "Marcus Williams",  contactPhone: "317-555-0142" },
    { name: "Full Court Felons",      divisionId: "div-mens-18",   contactName: "Devon Brooks",     contactPhone: "317-555-0287" },
    { name: "Rim Reapers",            divisionId: "div-mens-18",   contactName: "Jordan Lee",       contactPhone: "317-555-0391" },
    { name: "Air Ballers",            divisionId: "div-mens-18",   contactName: "Malik Turner",     contactPhone: "317-555-0456" },
    { name: "Three's Company",        divisionId: "div-mens-18",   contactName: "Caleb Ross",       contactPhone: "317-555-0518" },
    { name: "Dunk Dynasty",           divisionId: "div-mens-18",   contactName: "Elijah James",     contactPhone: "317-555-0673" },

    // Men's 40+ — 4 teams → 1 pool of 4
    { name: "Over the Hill Ballers",  divisionId: "div-mens-40",   contactName: "Greg Patterson",   contactPhone: "317-555-0741" },
    { name: "Old Man Buckets",        divisionId: "div-mens-40",   contactName: "Steve Holloway",   contactPhone: "317-555-0822" },
    { name: "Midlife Crisis",         divisionId: "div-mens-40",   contactName: "Ray Simmons",      contactPhone: "317-555-0934" },
    { name: "Still Got It",           divisionId: "div-mens-40",   contactName: "Dan Kowalski",     contactPhone: "317-555-0105" },

    // Women's 18+ — 4 teams → 1 pool of 4
    { name: "Net Gains",              divisionId: "div-womens-18", contactName: "Aisha Johnson",    contactPhone: "317-555-0912" },
    { name: "Swish Sisters",          divisionId: "div-womens-18", contactName: "Destiny Carter",   contactPhone: "317-555-0165" },
    { name: "Drop Step Divas",        divisionId: "div-womens-18", contactName: "Simone Davis",     contactPhone: "317-555-0247" },
    { name: "Fast Break",             divisionId: "div-womens-18", contactName: "Kayla Moore",      contactPhone: "317-555-0338" },

    // Men's 13-17 — 3 teams → 1 pool of 3
    { name: "Next Gen",               divisionId: "div-mens-1317", contactName: "Troy Daniels",     contactPhone: "317-555-0461" },
    { name: "Young Gunz",             divisionId: "div-mens-1317", contactName: "Andre Phillips",   contactPhone: "317-555-0572" },
    { name: "Bucket Boyz",            divisionId: "div-mens-1317", contactName: "Marcus Bell",      contactPhone: "317-555-0683" },

    // Open Coed — 3 teams → 1 pool of 3
    { name: "Mixed Signals",          divisionId: "div-coed",      contactName: "Jamie Torres",     contactPhone: "317-555-0794" },
    { name: "Co-Ed Chaos",            divisionId: "div-coed",      contactName: "Sam Rivera",       contactPhone: "317-555-0815" },
    { name: "Run It Back",            divisionId: "div-coed",      contactName: "Alex Morgan",      contactPhone: "317-555-0926" },
  ];

  for (const t of teams) {
    await prisma.team.create({ data: t });
  }

  console.log(`Seeded ${teams.length} teams across 5 divisions.`);
  console.log("Seed complete.");
  console.log("Admin login: admin@lovelifts.com / lovelifts2026");
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
