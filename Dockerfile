FROM node:20-slim

# Instalar OpenSSL (necessário para o Prisma rodar no ambiente slim)
RUN apt-get update -y && apt-get install -y openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

# Instalamos tudo (incluindo devDependencies para o build)
RUN npm ci

COPY . .

# Gera o client do Prisma
RUN npx prisma generate

# Roda o build do Next.js
RUN npm run build
# --- CONFIGURAÇÃO PARA O CLOUD RUN (PORTA 3000) ---
ENV NODE_ENV=production
ENV HOSTNAME="0.0.0.0"
ENV PORT=3000

# Exponha a porta que o Google está pedindo
EXPOSE 3000

# Force o Next.js a rodar na 3000
CMD ["npx", "next", "start", "-p", "3000"]