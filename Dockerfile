# ---------- BUILD ----------
FROM node:18-slim AS builder

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build || echo "Next build skipped"

# ---------- RUN ----------
FROM node:18-slim

WORKDIR /app

ENV NODE_ENV=production

COPY --from=builder /app ./

EXPOSE 8080

CMD ["npm", "run", "start"]
