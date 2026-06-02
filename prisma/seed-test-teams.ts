import "dotenv/config";
import { PrismaClient } from "../app/generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

const teams: { name: string; divisionSlug: string }[] = [
  // Men's 18+ — 10 teams (tests 4-pool + bracket path)
  { name: "Rim Reapers",        divisionSlug: "mens-18" },
  { name: "Full Court Press",   divisionSlug: "mens-18" },
  { name: "Net Busters",        divisionSlug: "mens-18" },
  { name: "Splash Bros Local",  divisionSlug: "mens-18" },
  { name: "Pick & Roll Gang",   divisionSlug: "mens-18" },
  { name: "Fast Break FC",      divisionSlug: "mens-18" },
  { name: "The Ballers",        divisionSlug: "mens-18" },
  { name: "Triple Threat",      divisionSlug: "mens-18" },
  { name: "Buckets Only",       divisionSlug: "mens-18" },
  { name: "Above the Rim",      divisionSlug: "mens-18" },

  // Men's 40+ — 4 teams
  { name: "Old but Gold",       divisionSlug: "mens-40" },
  { name: "Still Got Hops",     divisionSlug: "mens-40" },
  { name: "Midlife Ballers",    divisionSlug: "mens-40" },
  { name: "The Vets",           divisionSlug: "mens-40" },

  // Women's 18+ — 4 teams
  { name: "Net Setters",        divisionSlug: "womens-18" },
  { name: "Glass Eaters",       divisionSlug: "womens-18" },
  { name: "She Hoops",          divisionSlug: "womens-18" },
  { name: "Bucket Queens",      divisionSlug: "womens-18" },

  // Men's 13-17 — 4 teams
  { name: "Next Gen Ballers",   divisionSlug: "mens-13-17" },
  { name: "Rising Stars",       divisionSlug: "mens-13-17" },
  { name: "The Youngins",       divisionSlug: "mens-13-17" },
  { name: "Court Vision",       divisionSlug: "mens-13-17" },

  // Women's 13-17 — 3 teams
  { name: "Hoop Queens Jr",     divisionSlug: "womens-13-17" },
  { name: "Lady Ballers",       divisionSlug: "womens-13-17" },
  { name: "Future Stars",       divisionSlug: "womens-13-17" },

  // Boys 12 & Under — 3 teams
  { name: "Little Ballers",     divisionSlug: "boys-12u" },
  { name: "Mini Dunkers",       divisionSlug: "boys-12u" },
  { name: "Junior Nets",        divisionSlug: "boys-12u" },

  // Girls 12 & Under — 2 teams (tests 2-team path: 3 head-to-head games)
  { name: "Girl Power Hoops",   divisionSlug: "girls-12u" },
  { name: "Mini Queens",        divisionSlug: "girls-12u" },
];

async function main() {
  const divisions = await prisma.division.findMany();
  const divBySlug = new Map(divisions.map((d) => [d.slug, d.id]));

  let added = 0;
  for (const t of teams) {
    const divisionId = divBySlug.get(t.divisionSlug);
    if (!divisionId) {
      console.warn(`Division not found: ${t.divisionSlug}`);
      continue;
    }
    await prisma.team.create({ data: { name: t.name, divisionId } });
    added++;
  }

  console.log(`Added ${added} test teams.`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
