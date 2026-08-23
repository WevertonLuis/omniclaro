FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY dashboard/package.json ./dashboard/
COPY customer-chat/package.json ./customer-chat/

RUN npm install --workspace customer-chat --include-workspace-root

COPY customer-chat ./customer-chat

WORKDIR /app/customer-chat
EXPOSE 5174
# Em contexto de banca o modo dev basta e mantem o proxy do Vite para o backend.
CMD ["npx", "vite", "--host", "0.0.0.0", "--port", "5174"]
