import { prisma } from "../lib/prisma";

async function main() {
  console.log("Searching for admin users (role ADMIN or SUPER_ADMIN)...");
  const admins = await prisma.user.findMany({ where: { role: { in: ["ADMIN", "SUPER_ADMIN"] } } });
  if (admins.length === 0) {
    console.log("No admin users found.");
    return;
  }

  console.log(`Found ${admins.length} admin user(s):`);
  admins.forEach((a) => console.log(` - ${a.id} ${a.email} (${a.name})`));

  for (const admin of admins) {
    const userId = admin.id;

    const problemSolveCount = await prisma.problemSolve.count({ where: { userId } });
    const submissionCount = await prisma.submission.count({ where: { userId } });
    const weeklyScoreCount = await prisma.weeklyScore.count({ where: { userId } });
    const dailyStatCount = await prisma.dailyUserStat.count({ where: { userId } });

    console.log(`\nAdmin ${admin.email} summary:`);
    console.log(`  problemSolve rows: ${problemSolveCount}`);
    console.log(`  submission rows:    ${submissionCount}`);
    console.log(`  weeklyScore rows:   ${weeklyScoreCount}`);
    console.log(`  dailyStat rows:     ${dailyStatCount}`);

    if (process.env.EXEC !== "true") {
      console.log("  (dry run) To actually delete these rows, re-run with ENV var EXEC=true");
      continue;
    }

    console.log("  Deleting problemSolve rows...");
    await prisma.problemSolve.deleteMany({ where: { userId } });

    console.log("  Deleting submission rows...");
    await prisma.submission.deleteMany({ where: { userId } });

    console.log("  Deleting weeklyScore rows...");
    await prisma.weeklyScore.deleteMany({ where: { userId } });

    console.log("  Deleting dailyUserStat rows...");
    await prisma.dailyUserStat.deleteMany({ where: { userId } });

    console.log("  Done for this admin user.");
  }

  console.log("All done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

/*
Usage:
  - Dry run (shows affected rows):
      npx tsx scripts/reset-admin-stats.ts

  - Execute (will delete rows for admin users):
      EXEC=true npx tsx scripts/reset-admin-stats.ts

Make a DB backup before running destructive actions, for example:
  PGDATABASE=... pg_dump --format=custom --file=backup.dump
*/
