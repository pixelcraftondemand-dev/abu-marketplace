import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import { magicLink } from "better-auth/plugins";
import { nextCookies } from "better-auth/next-js";
import prisma from "@/lib/prisma"; // your existing Prisma client singleton

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  emailAndPassword: {
    enabled: true,
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    },
  },
  plugins: [
    magicLink({
      sendMagicLink: async ({ email, url }) => {
        // wire this to your email provider (Resend, etc.)
        await sendEmail({
          to: email,
          subject: "Your ABU Marketplace sign-in link",
          html: `<a href="${url}">Click to sign in</a>`,
        });
      },
    }),
    nextCookies(), // keep this last in the plugins array
  ],
});