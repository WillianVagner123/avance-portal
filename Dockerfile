FROM node:20-slim

WORKDIR /app
# Copia os arquivos de dependências
COPY package*.json ./
COPY prisma ./prisma/

# 1. Remova o ENV NODE_ENV=production daqui ou mude para development temporariamente
# Isso garante que o Tailwind e o Next.js (devDependencies) sejam instalados
RUN npm ci

COPY . .

# 2. Gera o client do Prisma (necessário para o build do Next)
RUN npx prisma generate

# 3. Agora o build vai encontrar o Tailwind
RUN npm run build

# 4. Agora sim, definimos produção para a execução
ENV NODE_ENV=production

EXPOSE 8080
CMD ["npm", "start"]