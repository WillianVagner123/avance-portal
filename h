[1mdiff --git a/README.md b/README.md[m
[1mindex 154066a..e215bc4 100644[m
[1m--- a/README.md[m
[1m+++ b/README.md[m
[36m@@ -1,3 +1,36 @@[m
[31m-# Avance Portal[m
[32m+[m[32mThis is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).[m
 [m
[31m-Projeto inicial Cloud Run + Cloud SQL + Google Login.[m
[32m+[m[32m## Getting Started[m
[32m+[m
[32m+[m[32mFirst, run the development server:[m
[32m+[m
[32m+[m[32m```bash[m
[32m+[m[32mnpm run dev[m
[32m+[m[32m# or[m
[32m+[m[32myarn dev[m
[32m+[m[32m# or[m
[32m+[m[32mpnpm dev[m
[32m+[m[32m# or[m
[32m+[m[32mbun dev[m
[32m+[m[32m```[m
[32m+[m
[32m+[m[32mOpen [https://avance-portal-760280164025.southamerica-east1.run.app](https://avance-portal-760280164025.southamerica-east1.run.app) with your browser to see the result.[m
[32m+[m
[32m+[m[32mYou can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.[m
[32m+[m
[32m+[m[32mThis project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.[m
[32m+[m
[32m+[m[32m## Learn More[m
[32m+[m
[32m+[m[32mTo learn more about Next.js, take a look at the following resources:[m
[32m+[m
[32m+[m[32m- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.[m
[32m+[m[32m- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.[m
[32m+[m
[32m+[m[32mYou can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome![m
[32m+[m
[32m+[m[32m## Deploy on Vercel[m
[32m+[m
[32m+[m[32mThe easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.[m
[32m+[m
[32m+[m[32mCheck out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.[m
[1mdiff --git a/package.json b/package.json[m
[1mindex c981148..87fb0b6 100644[m
[1m--- a/package.json[m
[1m+++ b/package.json[m
[36m@@ -1,5 +1,27 @@[m
 {[m
   "name": "avance-portal",[m
[32m+[m[32m  "version": "0.1.0",[m
   "private": true,[m
[31m-  "version": "1.0.0"[m
[31m-}[m
\ No newline at end of file[m
[32m+[m[32m  "scripts": {[m
[32m+[m[32m    "dev": "next dev",[m
[32m+[m[32m    "build": "next build",[m
[32m+[m[32m    "start": "next start",[m
[32m+[m[32m    "lint": "eslint"[m
[32m+[m[32m  },[m
[32m+[m[32m  "dependencies": {[m
[32m+[m[32m    "next": "16.1.3",[m
[32m+[m[32m    "next-auth": "^4.24.13",[m
[32m+[m[32m    "react": "19.2.3",[m
[32m+[m[32m    "react-dom": "19.2.3"[m
[32m+[m[32m  },[m
[32m+[m[32m  "devDependencies": {[m
[32m+[m[32m    "@tailwindcss/postcss": "^4",[m
[32m+[m[32m    "@types/node": "^20",[m
[32m+[m[32m    "@types/react": "^19",[m
[32m+[m[32m    "@types/react-dom": "^19",[m
[32m+[m[32m    "eslint": "^9",[m
[32m+[m[32m    "eslint-config-next": "16.1.3",[m
[32m+[m[32m    "tailwindcss": "^4",[m
[32m+[m[32m    "typescript": "^5"[m
[32m+[m[32m  }[m
[32m+[m[32m}[m
