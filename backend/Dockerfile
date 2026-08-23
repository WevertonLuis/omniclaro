FROM node:20-alpine

WORKDIR /app

COPY package.json package-lock.json* ./
COPY backend/package.json ./backend/
COPY dashboard/package.json ./dashboard/
COPY customer-chat/package.json ./customer-chat/

RUN npm install --workspace backend --include-workspace-root

COPY backend ./backend

WORKDIR /app/backend
RUN npm run build

EXPOSE 3000
CMD ["node", "dist/main.js"]
