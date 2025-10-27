# -----------------------------
# Stage 1: Build the application
# -----------------------------
    FROM node:20-alpine AS builder
    WORKDIR /app
    
    # Copy package files and install dependencies
    COPY package*.json ./
    RUN npm ci
    
    # Copy all source code
    COPY . .
    
    # Build the SvelteKit app
    RUN npm run build
    
    # -----------------------------
    # Stage 2: Production runtime
    # -----------------------------
    FROM node:20-alpine
    WORKDIR /app
    
    # Copy only necessary build output
    COPY --from=builder /app/package*.json ./
    COPY --from=builder /app/build ./build
    
    # Install only production dependencies
    RUN npm ci --omit=dev
    
    # Environment variables (can be overridden in Coolify)
    ENV PORT=3000
    ENV NODE_ENV=production
    
    # Expose the app port
    EXPOSE 3000
    
    # Start the SvelteKit app
    CMD ["node", "build"]
    