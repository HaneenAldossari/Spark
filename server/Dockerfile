FROM node:20-alpine

WORKDIR /app

# Install deps first (better layer caching)
COPY package*.json ./
RUN npm install --omit=dev=false

# Copy source
COPY . .

# Railway injects PORT at runtime; our env.ts defaults to 8787 if unset
EXPOSE 8787

CMD ["npm", "start"]
