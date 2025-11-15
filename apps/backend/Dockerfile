FROM node:20-alpine

# Crear directorio de trabajo
WORKDIR /app

# Copiar dependencias y código
COPY package*.json ./
RUN npm install

# Ahora sí copia el resto
COPY . .

# Exponer puerto
EXPOSE 10000

# Iniciar backend
CMD ["node", "server.js"]
