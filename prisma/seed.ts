import { PrismaClient, UserRole } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = "admin@example.com";
  const passwordHash = await bcrypt.hash("admin123456", 10);

  await prisma.user.upsert({
    where: { email: adminEmail },
    update: {
      name: "Admin",
      role: UserRole.ADMIN,
      passwordHash,
    },
    create: {
      name: "Admin",
      email: adminEmail,
      role: UserRole.ADMIN,
      passwordHash,
    },
  });

  await prisma.resourceCategory.upsert({
    where: { slug: "problem-solving-sheets" },
    update: {},
    create: {
      name: "Problem Solving Sheets",
      slug: "problem-solving-sheets",
      description: "Curated lists, sheets, and practice plans for CP students.",
    },
  });

  await prisma.resourceCategory.upsert({
    where: { slug: "topic-lists-and-tracks" },
    update: {},
    create: {
      name: "Topic Lists & Tracks",
      slug: "topic-lists-and-tracks",
      description: "Structured topic roadmaps and curated progression trackers.",
      sortOrder: 1,
    },
  });

  const sheetsCategory = await prisma.resourceCategory.findUnique({
    where: { slug: "problem-solving-sheets" },
    select: { id: true },
  });

  const topicListsCategory = await prisma.resourceCategory.findUnique({
    where: { slug: "topic-lists-and-tracks" },
    select: { id: true },
  });

  if (sheetsCategory) {
    await prisma.resource.upsert({
      where: { slug: "a2oj-ladder" },
      update: {
        title: "A2oJ Ladder",
        description: "Classic level-wise ladder to steadily build Codeforces-style problem solving fundamentals.",
        url: "https://earthshakira.github.io/a2oj-clientside/server/Ladders.html",
        categoryId: sheetsCategory.id,
        platform: "MULTI",
        difficultyLevel: "BEGINNER",
        tags: ["Ladder", "Beginner Friendly", "Codeforces"],
        isPublished: true,
        sortOrder: 1,
      },
      create: {
        title: "A2oJ Ladder",
        slug: "a2oj-ladder",
        description: "Classic level-wise ladder to steadily build Codeforces-style problem solving fundamentals.",
        url: "https://earthshakira.github.io/a2oj-clientside/server/Ladders.html",
        categoryId: sheetsCategory.id,
        platform: "MULTI",
        difficultyLevel: "BEGINNER",
        tags: ["Ladder", "Beginner Friendly", "Codeforces"],
        isPublished: true,
        sortOrder: 1,
      },
    });

    await prisma.resource.upsert({
      where: { slug: "tle-eliminators-cp-31-sheet" },
      update: {
        title: "TLE Eliminators CP-31 Sheet",
        description: "A structured 31-day curated sheet with reusable patterns and progressive rating buckets.",
        url: "https://www.tle-eliminators.com/cp-sheet",
        categoryId: sheetsCategory.id,
        platform: "MULTI",
        difficultyLevel: "INTERMEDIATE",
        tags: ["Sheet", "Structured Practice", "CP-31"],
        isPublished: true,
        sortOrder: 2,
      },
      create: {
        title: "TLE Eliminators CP-31 Sheet",
        slug: "tle-eliminators-cp-31-sheet",
        description: "A structured 31-day curated sheet with reusable patterns and progressive rating buckets.",
        url: "https://www.tle-eliminators.com/cp-sheet",
        categoryId: sheetsCategory.id,
        platform: "MULTI",
        difficultyLevel: "INTERMEDIATE",
        tags: ["Sheet", "Structured Practice", "CP-31"],
        isPublished: true,
        sortOrder: 2,
      },
    });

    await prisma.resource.upsert({
      where: { slug: "cses-problem-set" },
      update: {
        title: "CSES Problem Set",
        description: "High-quality topic-wise problem set ideal for mastering standard algorithms and data structures.",
        url: "https://cses.fi/problemset/",
        categoryId: sheetsCategory.id,
        platform: "CSES",
        difficultyLevel: "INTERMEDIATE",
        tags: ["Topic-wise", "Algorithms", "Data Structures"],
        isPublished: true,
        sortOrder: 3,
      },
      create: {
        title: "CSES Problem Set",
        slug: "cses-problem-set",
        description: "High-quality topic-wise problem set ideal for mastering standard algorithms and data structures.",
        url: "https://cses.fi/problemset/",
        categoryId: sheetsCategory.id,
        platform: "CSES",
        difficultyLevel: "INTERMEDIATE",
        tags: ["Topic-wise", "Algorithms", "Data Structures"],
        isPublished: true,
        sortOrder: 3,
      },
    });
  }

  if (topicListsCategory) {
    await prisma.resource.upsert({
      where: { slug: "youknowwho-academy-topic-list" },
      update: {
        title: "YouKn0wWho Academy Topic List",
        description: "Comprehensive topic tracker with module-wise practice progression for competitive programming.",
        url: "https://youkn0wwho.academy/topic-list",
        categoryId: topicListsCategory.id,
        platform: "MULTI",
        difficultyLevel: "INTERMEDIATE",
        tags: ["Topic List", "Progress Tracking", "Practice Plan"],
        isPublished: true,
        sortOrder: 1,
      },
      create: {
        title: "YouKn0wWho Academy Topic List",
        slug: "youknowwho-academy-topic-list",
        description: "Comprehensive topic tracker with module-wise practice progression for competitive programming.",
        url: "https://youkn0wwho.academy/topic-list",
        categoryId: topicListsCategory.id,
        platform: "MULTI",
        difficultyLevel: "INTERMEDIATE",
        tags: ["Topic List", "Progress Tracking", "Practice Plan"],
        isPublished: true,
        sortOrder: 1,
      },
    });

    await prisma.resource.upsert({
      where: { slug: "usaco-guide" },
      update: {
        title: "USACO Guide",
        description: "A free, high-quality roadmap with curated lessons and problems from beginner to advanced levels.",
        url: "https://usaco.guide",
        categoryId: topicListsCategory.id,
        platform: "USACO",
        difficultyLevel: "BEGINNER",
        tags: ["Roadmap", "Curated", "Beginner to Advanced"],
        isPublished: true,
        sortOrder: 2,
      },
      create: {
        title: "USACO Guide",
        slug: "usaco-guide",
        description: "A free, high-quality roadmap with curated lessons and problems from beginner to advanced levels.",
        url: "https://usaco.guide",
        categoryId: topicListsCategory.id,
        platform: "USACO",
        difficultyLevel: "BEGINNER",
        tags: ["Roadmap", "Curated", "Beginner to Advanced"],
        isPublished: true,
        sortOrder: 2,
      },
    });

    await prisma.resource.upsert({
      where: { slug: "cp-algorithms" },
      update: {
        title: "CP-Algorithms",
        description: "Definitive reference for algorithmic concepts, proofs, and implementations used in contests.",
        url: "https://cp-algorithms.com",
        categoryId: topicListsCategory.id,
        platform: "MULTI",
        difficultyLevel: "ADVANCED",
        tags: ["Reference", "Theory", "Implementations"],
        isPublished: true,
        sortOrder: 3,
      },
      create: {
        title: "CP-Algorithms",
        slug: "cp-algorithms",
        description: "Definitive reference for algorithmic concepts, proofs, and implementations used in contests.",
        url: "https://cp-algorithms.com",
        categoryId: topicListsCategory.id,
        platform: "MULTI",
        difficultyLevel: "ADVANCED",
        tags: ["Reference", "Theory", "Implementations"],
        isPublished: true,
        sortOrder: 3,
      },
    });

    await prisma.resource.upsert({
      where: { slug: "shafaets-planet" },
      update: {
        title: "Shafaet's Planet",
        description: "বাংলা ভাষায় অ্যালগরিদম, ডেটা স্ট্রাকচার এবং প্রোগ্রামিং কনসেপ্ট শেখার অন্যতম সেরা ব্লগ।",
        url: "https://shafaetsplanet.com",
        categoryId: topicListsCategory.id,
        platform: "MULTI",
        difficultyLevel: "BEGINNER",
        tags: ["Bangla", "Algorithm", "Data Structure"],
        isPublished: true,
        sortOrder: 4,
      },
      create: {
        title: "Shafaet's Planet",
        slug: "shafaets-planet",
        description: "বাংলা ভাষায় অ্যালগরিদম, ডেটা স্ট্রাকচার এবং প্রোগ্রামিং কনসেপ্ট শেখার অন্যতম সেরা ব্লগ।",
        url: "https://shafaetsplanet.com",
        categoryId: topicListsCategory.id,
        platform: "MULTI",
        difficultyLevel: "BEGINNER",
        tags: ["Bangla", "Algorithm", "Data Structure"],
        isPublished: true,
        sortOrder: 4,
      },
    });
  }

  await prisma.resourceCategory.deleteMany({
    where: {
      slug: {
        in: ["guides-and-references", "bangla-resources"],
      },
    },
  });

  await prisma.appConfig.upsert({
    where: { key: "weekly-scoring-config" },
    update: {
      value: {
        multiplierBase: 1.1,
        gapStepSize: 100,
      },
    },
    create: {
      key: "weekly-scoring-config",
      value: {
        multiplierBase: 1.1,
        gapStepSize: 100,
      },
    },
  });

  const motivationalProfilesCount = await prisma.motivationalProfile.count();

  if (motivationalProfilesCount === 0) {
    await prisma.motivationalProfile.createMany({
      data: [
        {
          name: "Partha Saha",
          imageUrl: "/images/1. Partha Saha.png",
          linkedinUrl: "https://www.linkedin.com/in/parthasaha01/",
          headline: "Backend | Search | Recommendations | Data Engineering",
          bio: "Backend | Search | Recommendations | Data Engineering",
          sortOrder: 0,
        },
        {
          name: "Belal Hossain",
          imageUrl: "/images/2. Belal Hossain.png",
          linkedinUrl: "https://www.linkedin.com/in/the-belal/",
          headline: "Senior Software Engineer | C# | .Net Core | Full Stack",
          bio: "Senior Software Engineer | C# | .Net Core | Full Stack",
          sortOrder: 1,
        },
        {
          name: "Subrata Sutradhar",
          imageUrl: "/images/3. Subrata Sutradhar.png",
          linkedinUrl: "https://www.linkedin.com/in/subrata-sutradhar-10a66424b/",
          headline: "Java | C# | Kubernetes | ICPC Asia West Finalist",
          bio: "Java | C# | Kubernetes | ICPC Asia West Finalist",
          sortOrder: 2,
        },
        {
          name: "Md Mehedi Hasan Angkur",
          imageUrl: "/images/4. Md Mehedi Hasan Angkur.png",
          linkedinUrl: "https://www.linkedin.com/in/md-mehedi-hasan-angkur-53595315a/",
          headline: "Problem Solver | C/C++ | Java | Swift | Kotlin",
          bio: "Problem Solver | C/C++ | Java | Swift | Kotlin",
          sortOrder: 3,
        },
        {
          name: "Akash Islam",
          imageUrl: "/images/5. Akash Islam.png",
          linkedinUrl: "https://www.linkedin.com/in/akash-islam-a45a58301/",
          headline: "Competitive Programmer | ICPC Asia West Finalist",
          bio: "Competitive Programmer | ICPC Asia West Finalist",
          sortOrder: 4,
        },
        {
          name: "Mohammad Amdadul Haque",
          imageUrl: "/images/6. Mohammad Amdadul haque.png",
          linkedinUrl: "https://www.linkedin.com/in/mohammad-amdadul-haque-8415082a5/",
          headline: "Associate SWE | ASP.Net | ICPC Asia West Continent Finalist 2023",
          bio: "Associate SWE | ASP.Net | ICPC Asia West Continent Finalist 2023",
          sortOrder: 5,
        },
      ],
    });
  }

  console.log("Seed complete");
  console.log(`Admin login: ${adminEmail} / admin123456`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
