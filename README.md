# KooyaHQ Backend

Express 5 + TypeScript API that pairs with the React frontend.

## Getting started

```bash
npm install
npm run dev
```

By default the server listens on `http://localhost:5001`. Configure variables in `.env` (see `.env.example`).

## Scripts

- `npm run dev` – Start the API in watch mode with `ts-node-dev`
- `npm run build` – Emit production JavaScript to `dist`
- `npm start` – Run the compiled server

## Project structure

```
src/
  config/          # Environment bootstrap
  controllers/     # Route handlers
  middleware/      # Express middlewares
  routes/          # Route registration modules
  utils/           # Reusable helpers
```
```

## Health check

The frontend expects a health check endpoint at `/api/health`. It returns uptime and environment metadata.
