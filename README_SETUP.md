Comandos rápidos para Windows (Git Bash / bash.exe):

# Copiar .env

cp .env.example .env

# Instalar dependencias

npm install

# Generar client de Prisma

npx prisma generate

# Levantar DB

docker-compose up -d

# Aplicar migración (opcional, creará la tabla User)

npx prisma migrate dev --name init

# Ejecutar en dev

npm run dev
