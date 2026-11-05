FROM node:22-alpine
WORKDIR /app

# Install dependencies
COPY package*.json ./
COPY backend/package*.json ./backend/
RUN npm install && cd backend && npm install

# Copy source code and build frontend
COPY . .
RUN npm run build

# Expose port and launch server
EXPOSE 8787
ENV PORT=8787
ENV NODE_ENV=production

CMD ["node", "backend/server.js"]
