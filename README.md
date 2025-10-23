# Researcher Staff Platform (starter)

Proyecto inicial con Node.js + TypeScript + Express + Prisma + Docker Compose (PostgreSQL).

Requisitos:

- Node.js >= 18
- Docker & Docker Compose

Pasos rápidos:

1. Copia el archivo de ejemplo de entorno:

   cp .env.example .env

2. Instala dependencias:

   npm install

3. Levanta la base de datos con Docker Compose:

   docker-compose up -d

4. Genera Prisma Client y aplica migración inicial (opcional):

   npx prisma generate
   npx prisma migrate dev --name init

5. Ejecuta en modo desarrollo:

   npm run dev
