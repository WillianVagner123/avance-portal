FROM node:20-slim
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Prisma 7 lê DATABASE_URL pelo prisma.config.ts (env). Para gerar o client no build,
# basta uma URL *válida* (não precisa conectar).
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public"

# gera Prisma Client no build (via postinstall) e builda o Next
RUN npm run build

ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm","run","start"]
