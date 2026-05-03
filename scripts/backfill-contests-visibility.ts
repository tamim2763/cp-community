import { ContestSource } from "@prisma/client";

import { detectContestPlatform, shouldShowContest } from "@/lib/contests/allowlist";
import { prisma } from "@/lib/prisma";

async function main() {
  const contests = await prisma.contest.findMany({
    where: { source: ContestSource.CLIST },
    select: { id: true, title: true, url: true, platform: true, isVisible: true },
  });

  let checked = 0;
  let changed = 0;
  let allowed = 0;
  let hidden = 0;

  for (const contest of contests) {
    const platform = contest.platform ?? detectContestPlatform(contest.url);
    const nextVisible = shouldShowContest({ platform, title: contest.title });

    checked++;
    if (nextVisible) allowed++;
    else hidden++;

    if (contest.isVisible !== nextVisible) {
      await prisma.contest.update({
        where: { id: contest.id },
        data: {
          isVisible: nextVisible,
          platform: platform ?? undefined,
        },
      });
      changed++;
    }
  }

  console.log("Contest visibility backfill complete");
  console.log({ checked, changed, allowed, hidden });
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
