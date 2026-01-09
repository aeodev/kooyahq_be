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

## Server Status Gateway

Set `SERVER_STATUS_GATEWAY_SECRET` in your environment. The `system-status` monitoring script should `POST` to `/api/gateways/server-status` with either `x-server-status-gateway-secret`, `x-gateway-secret`, or `Authorization: Bearer <secret>`.

Example payload:

```json
{
  "version": "1.0.0",
  "timestamp": "2026-01-10T14:32:45+0000",
  "event_type": "status",
  "project": "kooyahq",
  "status": "warning",
  "server": {
    "name": "app-node-1",
    "hostname": "ip-172-31-0-1",
    "status": "running",
    "uptime_seconds": 86400,
    "process_count": 245
  },
  "metrics": {
    "cpu": {
      "current_percent": 85.5,
      "average_15m_percent": 82.3,
      "is_ready": true
    },
    "memory": {
      "current_percent": 72.1,
      "average_15m_percent": 70.5,
      "used_bytes": 7516192768,
      "total_bytes": 10427904000,
      "is_ready": true
    }
  },
  "alert_summary": {
    "total": 2,
    "by_risk": { "critical": 0, "danger": 0, "warning": 2, "info": 0 },
    "has_critical": false,
    "has_danger": false,
    "has_warning": true
  },
  "instance_alerts": [
    {
      "risk": "warning",
      "category": "cpu",
      "type": "threshold_average",
      "title": "CPU High",
      "message": "CPU 15m average (82.3%) exceeds threshold",
      "details": { "metric": "cpu_average_15m", "value": 82.3, "threshold": 80 }
    }
  ],
  "containers": {
    "total": 5,
    "running": 4,
    "stopped": 1,
    "restarting": 0,
    "alerts": []
  },
  "health_changes": []
}
```

Required fields: `version`, `project`, `server.name`, `status`

Headers:
- `X-Status-Event`: Event type (`status` or `lifecycle`)
- `X-Status-Level`: Overall status level

Accepted statuses: `healthy`, `info`, `warning`, `danger`, `critical`, `starting`, `shutdown`, `restarting`.
