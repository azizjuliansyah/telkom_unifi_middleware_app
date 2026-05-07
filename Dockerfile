# --- Base Stage ---
FROM node:20-alpine AS base
WORKDIR /app
COPY package*.json ./

# --- Build Stage ---
FROM base AS build
RUN npm install
COPY . .
# Build Tailwind CSS
RUN npm run build:css

# --- Production Stage ---
FROM node:20-alpine AS production
WORKDIR /app

# Copy package files and install only production dependencies
COPY package*.json ./
RUN npm install --production

# Copy necessary files from build stage
COPY --from=build /app/src ./src

# Default environment variables (can be overridden by docker-compose)
ENV PORT=3000
ENV NODE_ENV=production

EXPOSE 3000

CMD ["npm", "start"]
