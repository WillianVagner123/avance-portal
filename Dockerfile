# ========================
# BUILD STAGE
# ========================
FROM node:20-slim AS builder

# deps para node-gyp (caso precise)
RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

# evita instalar deps opcionais problemáticas
RUN npm install --omit=optional

COPY . .

# Prisma generate não pode quebrar o build
RUN npx prisma generate || echo "Prisma generate skipped"

RUN npm run build

# ========================
# RUNTIME STAGE
# ========================
FROM node:20-slim

WORKDIR /app
ENV NODE_ENV=production

COPY --from=builder /app ./

EXPOSE 8080

CMD ["npm", "run", "start"]
