import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { UserRole } from "@prisma/client";

import authConfig from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validations/auth";

const INSTITUTIONAL_EMAIL_RE = /^ce\d+@mbstu\.ac\.bd$/i;

function isInstitutionalEmail(email: string | null | undefined) {
  return typeof email === "string" && INSTITUTIONAL_EMAIL_RE.test(email);
}

const googleClientId = process.env.GOOGLE_CLIENT_ID;
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET;
const googleProvider =
  googleClientId && googleClientSecret
    ? Google({
        clientId: googleClientId,
        clientSecret: googleClientSecret,
        profile(profile) {
          const email = profile.email?.toLowerCase() ?? "";
          const name = profile.name ?? (email ? email.split("@")[0] : "User");

          return {
            id: profile.sub,
            name,
            email,
            image: profile.picture,
            role: UserRole.USER,
            hasSeenOnboardingTutorial: false,
          };
        },
      })
    : null;

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  session: {
    strategy: "jwt",
  },
  providers: [
    ...(googleProvider ? [googleProvider] : []),
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const parsed = loginSchema.safeParse(credentials);

        if (!parsed.success) {
          return null;
        }

        const user = await prisma.user.findUnique({
          where: { email: parsed.data.email.toLowerCase() },
        });

        if (!user?.passwordHash) {
          return null;
        }

        if (!user.isActive) {
          return null;
        }

        if (!user.emailVerified && user.email.toLowerCase() !== "admin@example.com") {
          return null;
        }

        const isValid = await verifyPassword(parsed.data.password, user.passwordHash);

        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.avatarUrl,
          role: user.role,
          hasSeenOnboardingTutorial: user.hasSeenOnboardingTutorial,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    signIn: async ({ user, account, profile }) => {
      if (account?.provider === "google") {
        const email = (profile?.email ?? user.email ?? "").toLowerCase();
        if (!isInstitutionalEmail(email)) {
          return "/register?error=institutional";
        }

        const emailVerified = (profile as { email_verified?: boolean } | null)?.email_verified;
        if (emailVerified === false) {
          return "/register?error=unverified";
        }

        const existing = await prisma.user.findUnique({
          where: { email },
          select: { isActive: true },
        });

        if (existing && !existing.isActive) {
          return "/login?error=inactive";
        }
      }

      return true;
    },
    jwt: async ({ token, user, account, profile }) => {
      if (account?.provider === "google") {
        const email = (profile?.email ?? user?.email ?? "").toLowerCase();

        if (email) {
          const name =
            (typeof profile?.name === "string" && profile.name) ||
            (typeof user?.name === "string" && user.name) ||
            email.split("@")[0];
          const picture =
            typeof profile?.picture === "string" ? profile.picture : typeof user?.image === "string" ? user.image : null;

          let dbUser = await prisma.user.findUnique({ where: { email } });

          if (!dbUser) {
            dbUser = await prisma.user.create({
              data: {
                name,
                email,
                avatarUrl: picture ?? undefined,
                emailVerified: new Date(),
              },
            });
          } else {
            const updateData: { emailVerified?: Date; avatarUrl?: string } = {};
            if (!dbUser.emailVerified) {
              updateData.emailVerified = new Date();
            }
            if (!dbUser.avatarUrl && picture) {
              updateData.avatarUrl = picture;
            }
            if (Object.keys(updateData).length > 0) {
              dbUser = await prisma.user.update({
                where: { id: dbUser.id },
                data: updateData,
              });
            }
          }

          token.sub = dbUser.id;
          token.role = dbUser.role;
          token.name = dbUser.name;
          token.email = dbUser.email;
          token.picture = dbUser.avatarUrl;
          token.isActive = dbUser.isActive;
          token.hasSeenOnboardingTutorial = dbUser.hasSeenOnboardingTutorial;

          return token;
        }
      }

      if (!token.sub) {
        return token;
      }

      const dbUser = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { role: true, name: true, email: true, avatarUrl: true, isActive: true, hasSeenOnboardingTutorial: true },
      });

      if (dbUser) {
        token.role = dbUser.role;
        token.name = dbUser.name;
        token.email = dbUser.email;
        token.picture = dbUser.avatarUrl;
        token.isActive = dbUser.isActive;
        token.hasSeenOnboardingTutorial = dbUser.hasSeenOnboardingTutorial;
      } else {
        token.isActive = false;
      }

      return token;
    },
    session: async ({ session, token }) => {
      if (session.user && token.sub) {
        session.user.id = token.sub;
        session.user.role = token.role as typeof session.user.role;
        session.user.name = typeof token.name === "string" ? token.name : session.user.name;
        session.user.email = typeof token.email === "string" ? token.email : session.user.email ?? "";
        session.user.image = typeof token.picture === "string" ? token.picture : null;
        session.user.hasSeenOnboardingTutorial = token.hasSeenOnboardingTutorial ?? false;
        session.user.isActive = token.isActive !== false;
      }

      return session;
    },
  },
});
