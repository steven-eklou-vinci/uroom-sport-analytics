import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import { prisma } from '../../../lib/prisma';
import { compare } from 'bcryptjs';
import { getFirebaseAdminAuth } from '../../../lib/firebase/admin';

async function getOrCreatePrismaUserFromFirebase(idToken: string) {
  const decoded = await getFirebaseAdminAuth().verifyIdToken(idToken);
  if (!decoded.email) {
    return null;
  }

  let user = await prisma.user.findUnique({
    where: { email: decoded.email },
  });

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: decoded.email,
        name: decoded.name || decoded.email.split('@')[0],
        role: 'PLAYER',
        locale: 'fr',
        oauthProvider: 'firebase',
        oauthId: decoded.uid,
      },
    });
  } else if (user.oauthProvider !== 'firebase' || user.oauthId !== decoded.uid) {
    user = await prisma.user.update({
      where: { id: user.id },
      data: {
        oauthProvider: 'firebase',
        oauthId: decoded.uid,
      },
    });
  }

  return {
    id: user.id,
    email: user.email,
    role: user.role,
    name: user.name,
    locale: user.locale,
  };
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Mot de passe', type: 'password' },
        idToken: { label: 'Firebase ID Token', type: 'text' },
      },
      async authorize(credentials) {
        if (credentials?.idToken) {
          return getOrCreatePrismaUserFromFirebase(credentials.idToken);
        }

        if (!credentials?.email || !credentials?.password) return null;
        const user = await prisma.user.findUnique({ where: { email: credentials.email } });
        if (!user || !user.passwordHash) return null;
        const isValid = await compare(credentials.password, user.passwordHash);
        if (!isValid) return null;
        return { id: user.id, email: user.email, role: user.role, name: user.name, locale: user.locale };
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.locale = user.locale;
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.role = token.role;
        session.user.id = token.id;
        session.user.locale = token.locale;
      }
      return session;
    },
  },
  pages: {
    signIn: '/auth/login',
    newUser: '/auth/register',
  },
  secret: process.env.NEXTAUTH_SECRET,
};

export default NextAuth(authOptions);
