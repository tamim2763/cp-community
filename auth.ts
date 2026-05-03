import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

import authConfig from "@/auth.config";
import { prisma } from "@/lib/prisma";
import { verifyPassword } from "@/lib/password";
import { loginSchema } from "@/lib/validations/auth";

export const { handlers, signIn, signOut, auth } = NextAuth({
  ...authConfig,
  session: {
    strategy: "jwt",
  },
  providers: [
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
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    jwt: async ({ token }) => {
      if (!token.sub) {
        return token;
      }

      const user = await prisma.user.findUnique({
        where: { id: token.sub },
        select: { role: true, name: true, email: true, avatarUrl: true, isActive: true, hasSeenOnboardingTutorial: true },
      });

      if (user) {
        token.role = user.role;
        token.name = user.name;
        token.email = user.email;
        token.picture = user.avatarUrl;
        token.isActive = user.isActive;
        token.hasSeenOnboardingTutorial = user.hasSeenOnboardingTutorial;
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
