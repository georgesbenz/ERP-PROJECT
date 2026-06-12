# Multi-stage build: dependencies installed inside Docker — no host node_modules needed.

FROM node:22-alpine AS base
WORKDIR /app

# ---- dependencies ----
FROM base AS deps
COPY package*.json ./
RUN npm install --legacy-peer-deps

# ---- development ----
FROM base AS development
ENV NODE_ENV=development
COPY --from=deps /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "dev"]

# ---- build ----
FROM base AS build
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

# ---- production ----
FROM base AS production
ENV NODE_ENV=production
COPY --from=build /app/public ./public
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
EXPOSE 3000
CMD ["node", "server.js"]
