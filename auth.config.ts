import type { NextAuthConfig } from "next-auth";

const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user && auth.user.isActive !== false;
      const protectedPrefixes = ["/dashboard", "/leaderboard", "/achievements", "/chat", "/admin", "/users"];
      const isProtected = protectedPrefixes.some((p) => nextUrl.pathname.startsWith(p));

      if (isProtected) {
        return isLoggedIn;
      }

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;

export default authConfig;

