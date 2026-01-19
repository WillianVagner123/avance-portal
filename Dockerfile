FROM node:20-slim
WORKDIR /app

RUN apt-get update -y \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

COPY package*.json ./
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

ENV AUTH_SECRET="build_dummy"
ENV NEXTAUTH_SECRET="build_dummy"
ENV DATABASE_URL="build_dummy"


RUN npm ci

COPY . .
RUN npm run build

ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm","run","start"]
