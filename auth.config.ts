import type { NextAuthConfig } from "next-auth";

const authConfig = {
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const protectedPrefixes = ["/dashboard", "/leaderboard", "/achievements", "/chat", "/admin"];
      const isProtected = protectedPrefixes.some((p) => nextUrl.pathname.startsWith(p));

      // Admin routes require ADMIN or SUPER_ADMIN role
      if (nextUrl.pathname.startsWith("/admin")) {
        const role = (auth?.user as { role?: string })?.role;
        return isLoggedIn && (role === "ADMIN" || role === "SUPER_ADMIN");
      }

      if (isProtected) {
        return isLoggedIn;
      }

      return true;
    },
  },
  providers: [],
} satisfies NextAuthConfig;

export default authConfig;

