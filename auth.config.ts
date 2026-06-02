import type { NextAuthConfig } from "next-auth";

export const authConfig: NextAuthConfig = {
  trustHost: true,
  providers: [],
  pages: { signIn: "/login" },
  session: { strategy: "jwt" },
  callbacks: {
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role?: string }).role;
      }
      return token;
    },
    session({ session, token }) {
      const t = token as { id?: string; role?: string };
      if (t.id) session.user.id = t.id;
      if (t.role) (session.user as { role?: string }).role = t.role;
      return session;
    },
  },
};
