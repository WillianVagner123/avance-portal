FROM node:20-slim AS base
WORKDIR /app

# deps
COPY package*.json ./
RUN npm install --omit=optional

# app
COPY . .

# prisma (schema já está aqui)
ARG DATABASE_URL="file:/tmp/build.db"
ENV DATABASE_URL=$DATABASE_URL
RUN npx prisma generate

# build next
RUN npm run build

ENV NODE_ENV=production
EXPOSE 8080
CMD ["npm","run","start"]
