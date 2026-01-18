# ========================
# BUILD STAGE
# ========================
FROM node:20-slim AS builder

# deps para node-gyp
RUN apt-get update && apt-get install -y \
  python3 \
  make \
  g++ \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package*.json ./

RUN npm install --omit=optional

COPY . .

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
