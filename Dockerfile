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

# --- CONFIGURAÇÃO PARA O CLOUD RUN ---
ENV NODE_ENV=production
# O Next.js precisa do HOSTNAME 0.0.0.0 para aceitar conexões externas no container
ENV HOSTNAME="0.0.0.0"
# Garantimos que a porta seja a 8080 (padrão do Cloud Run)
ENV PORT=8080

EXPOSE 8080

# Usamos 'npx next start' para garantir que ele ignore o script do package.json 
# e use as variáveis de ambiente corretas
CMD ["npx", "next", "start", "-p", "8080"]