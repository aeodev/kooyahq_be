# KooyaHQ Backend

Express 5 + TypeScript API that pairs with the React frontend.

## Getting started

```bash
npm install
npm run dev
```

By default the server listens on `http://localhost:5001`. Configure variables in `.env` (see `.env.example`).

### Storage (S3)

Set `S3_BUCKET` and `S3_REGION` for uploads. `S3_ENV_PREFIX` (optional) prefixes keys (e.g., `development/` or `production/`). When the frontend is on a different domain, set `PUBLIC_API_URL` so proxied media URLs are absolute. If you are not using an instance/task role, set `AWS_ACCESS_KEY_ID` and `AWS_SECRET_ACCESS_KEY` for authenticated uploads.

### Google Sign-In

Set the following variables to enable Google login:

- `GOOGLE_CLIENT_ID`
- `GOOGLE_CLIENT_SECRET`

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

## GitHub Gateway (GitHub Actions)

Set `GITHUB_GATEWAY_SECRET` in your environment. GitHub Actions should `POST` to `/api/gateways/github/actions` with either `x-github-gateway-secret`, `x-gateway-secret`, or `Authorization: Bearer <secret>`.

Example payloads:

```json
{
  "branchName": "feature/TT-1/add-cta",
  "targetBranch": "main",
  "status": "pull-requested",
  "pullRequestUrl": "https://github.com/org/repo/pull/44"
}
```

```json
{
  "branchName": "feature/TT-1/add-cta",
  "targetBranch": "main",
  "status": "deploying"
}
```

Accepted statuses: `pull-requested`, `pull-request-build-check-passed`, `pull-request-build-check-failed`, `deploying`, `deployment-failed`, `deployed`. The service also accepts space or dash separated variants (e.g., `pull requested`, `pull request build check passed`).

Branch names must include the ticket key as a full path segment (e.g., `/TT-1/`) so the gateway can resolve tickets without partial matches.
