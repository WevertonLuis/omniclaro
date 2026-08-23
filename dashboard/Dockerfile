FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY dashboard/package.json ./dashboard/
COPY customer-chat/package.json ./customer-chat/

RUN npm install --workspace dashboard --include-workspace-root

COPY dashboard ./dashboard

WORKDIR /app/dashboard
EXPOSE 5173
# Em contexto de banca o modo dev basta e mantem o proxy do Vite para o backend.
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5173"]
