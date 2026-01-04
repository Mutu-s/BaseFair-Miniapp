import { SiweMessage } from 'siwe'
import NextAuth from 'next-auth'
import Credentials from 'next-auth/providers/credentials'

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      name: 'Ethereum',
      credentials: {
        message: {
          label: 'Message',
          type: 'text',
          placeholder: '0x0',
        },
        signature: {
          label: 'Signature',
          type: 'text',
          placeholder: '0x0',
        },
      },
      async authorize(credentials) {
        try {
          const siwe = new SiweMessage(JSON.parse(credentials?.message || '{}'))
          const nextAuthUrl = new URL(process.env.NEXTAUTH_URL || 'http://localhost:3000')

          const result = await siwe.verify({
            signature: credentials?.signature || '',
            domain: nextAuthUrl.host,
          })

          if (result.success) {
            return {
              id: siwe.address,
              name: siwe.address,
            }
          }

          return null
        } catch (error) {
          return null
        }
      },
    }),
  ],
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.address = user.id
      }
      return token
    },
    async session({ session, token }) {
      if (token.address) {
        session.address = String(token.address)
        session.user.name = String(token.address)
        session.user.image = 'https://www.fillmurray.com/128/128'
      }
      return session
    },
  },
})

export const { GET, POST } = handlers
