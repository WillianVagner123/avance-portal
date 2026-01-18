FROM node:20-slim
WORKDIR /app

# Prisma no Debian slim precisa de openssl
RUN apt-get update -y \
  && apt-get install -y openssl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# 1) Copia o mínimo para instalar deps
COPY package*.json ./

# 2) Copia Prisma schema/config ANTES do npm ci (porque postinstall roda prisma generate)
COPY prisma ./prisma
COPY prisma.config.ts ./prisma.config.ts

# Prisma precisa de DATABASE_URL válida no build (não precisa conectar)
ENV DATABASE_URL="postgresql://user:pass@localhost:5432/db?schema=public"

RUN npm ci

# 3) Agora copia o resto do app e builda
COPY . .

RUN npm run build

ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm","run","start"]
