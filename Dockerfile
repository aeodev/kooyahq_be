FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm i

FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
COPY --from=deps /app/node_modules ./node_modules
COPY tsconfig.json ./tsconfig.json
COPY src ./src
RUN npm run build

FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY package.json package-lock.json ./
RUN npm i
COPY --from=build /app/dist ./dist
EXPOSE 5001
CMD ["node", "dist/server.js"]
