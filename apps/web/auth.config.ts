import type { NextAuthConfig } from 'next-auth';
import Google from 'next-auth/providers/google';

export const authConfig = {
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      authorization: {
        params: {
          hd: 'trt4.jus.br',
          prompt: 'select_account',
        },
      },
    }),
  ],
  pages: {
    signIn: '/login',
    error: '/login',
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isLoginPage = nextUrl.pathname.startsWith('/login');
      const isAuthApi = nextUrl.pathname.startsWith('/api/auth');

      if (isAuthApi) return true;

      if (!isLoggedIn && !isLoginPage) {
        return false; // Automatically redirects to /login
      }

      if (isLoggedIn && isLoginPage) {
        return Response.redirect(new URL('/', nextUrl));
      }

      return true;
    },
    async signIn({ user }) {
      const email = user?.email?.toLowerCase() || '';
      if (email.endsWith('@trt4.jus.br')) {
        return true;
      }
      return '/login?error=DomainRestricted';
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = (token.sub as string) || '';
      }
      return session;
    },
  },
  trustHost: true,
} satisfies NextAuthConfig;
