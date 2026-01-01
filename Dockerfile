FROM node:20-alpine AS deps
WORKDIR /app
COPY kooyahq_be/package.json kooyahq_be/package-lock.json ./
RUN npm ci

FROM node:20-alpine AS build
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY kooyahq_be/tsconfig.json ./tsconfig.json
COPY kooyahq_be/src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY kooyahq_be/package.json kooyahq_be/package-lock.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 5001
CMD ["node", "dist/server.js"]
