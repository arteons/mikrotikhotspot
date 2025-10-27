# -----------------------------
# Stage 1: Build the application
# -----------------------------
    FROM node:20-alpine AS builder
    WORKDIR /app
    
    # Accept build-time environment variables
    ARG PUBLIC_SUPABASE_URL
    ARG PUBLIC_SUPABASE_ANON_KEY
    ENV PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL
    ENV PUBLIC_SUPABASE_ANON_KEY=$PUBLIC_SUPABASE_ANON_KEY
    
    COPY package*.json ./
    RUN npm ci
    COPY . .
    
    RUN npm run build
    
    # -----------------------------
    # Stage 2: Production runtime
    # -----------------------------
    FROM node:20-alpine
    WORKDIR /app
    
    # Copy necessary build output
    COPY --from=builder /app/package*.json ./
    COPY --from=builder /app/build ./build
    
    # Set env vars again for runtime
    ARG PUBLIC_SUPABASE_URL
    ARG PUBLIC_SUPABASE_ANON_KEY
    ENV PUBLIC_SUPABASE_URL=$PUBLIC_SUPABASE_URL
    ENV PUBLIC_SUPABASE_ANON_KEY=$PUBLIC_SUPABASE_ANON_KEY
    
    RUN npm ci --omit=dev
    
    ENV PORT=3000
    EXPOSE 3000
    
    CMD ["node", "build"]
    