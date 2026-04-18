FROM node:20-alpine

WORKDIR /app

# Install deps first (better layer caching)
COPY server/package*.json ./
RUN npm install

# Copy server source
COPY server/ ./

EXPOSE 8787

CMD ["npm", "start"]
