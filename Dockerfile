# ---------- STAGE 1: Build ----------
FROM node:24-alpine AS builder

# Set working directory
WORKDIR /app

# Copy and install dependencies
COPY .npmrc ./
COPY package*.json ./
RUN npm install

# Copy source code and build
COPY . .
RUN npm run build


# ---------- STAGE 2: Runtime ----------
FROM node:24-alpine

# Set working directory
WORKDIR /app

# Set timezone to UTC
ENV TZ=UTC

# Copy only required files from builder
COPY .npmrc ./
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist

# Install production dependencies only
RUN npm install --omit=dev --ignore-scripts

# Optionally copy Firebase service key if you prefer file-based secrets
# COPY firebase-service-key.json ./firebase-service-key.json

# Set environment variable if you're using base64 version of Firebase key
# ENV FIREBASE_KEY_B64=your_base64_key_here

# Expose application port
EXPOSE 3001

# Start the app (adjust if your entry point isn't dist/main.js)
CMD ["node", "dist/main.js"]
