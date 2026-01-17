import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],
  pages: {
    signIn: "/login",
  },
callbacks: {
  async signIn({ profile }) {
    const email = (profile?.email || "").toLowerCase();

    // ✅ lista de emails autorizados (por enquanto hardcoded)
    const ALLOWED = [
      "avancesaudeeperformance@gmail.com",
      // adicione os profissionais aqui:
      // "drfulano@seudominio.com",
    ].map(e => e.toLowerCase());

    if (!email) return false;

    // permite apenas emails da lista OU do domínio (se você quiser)
    const allowed =
      ALLOWED.includes(email)
      // OU libera um domínio inteiro (exemplo):
      // || email.endsWith("@avancebsb.com.br")
      ;

    return allowed;
  },
},git push

});

export { handler as GET, handler as POST };
