import { withAuth } from "next-auth/middleware";

export default withAuth({
  pages: {
    signIn: "/login",
  },
});

export const config = {
  matcher: [
    /*
      Protege tudo EXCETO:
      - login
      - register
      - api/auth
      - api/register
    */
    "/((?!login|register|api/auth|api/register).*)",
  ],
};
