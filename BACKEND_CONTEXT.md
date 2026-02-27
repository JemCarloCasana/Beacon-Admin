# Beacon Admin Backend Context

This document summarizes the backend contract currently expected by the `beacon-admin` frontend.
It is intended as a backend implementation/reference guide.

## Purpose

- Frontend: React + Vite web admin dashboard
- Auth model: admin JWT for `/admin/*` endpoints
- Primary domains:
  - Admin authentication and identity
  - SOS live operations
  - Broadcast lifecycle and send
  - Incidents listing/detail/update
  - Notifications
  - Admin user/request management

## Environment Expectations

- Base URL comes from `VITE_API_BASE_URL` (fallback `http://localhost:3000`)
- Frontend sends `Authorization: Bearer <admin_token>` for routes containing `/admin`
- Timeout expectation: 10s default (`VITE_REQUEST_TIMEOUT`)

## Authentication Contract

### Admin login

- `POST /admin/auth/login`
- Consumed by: `src/api/adminAuth.js`
- Expected response includes at least:
  - `token` (stored in `localStorage.admin_token`)

### Admin signup

- `POST /admin/auth/signup`
- Consumed by: `src/api/adminAuth.js`

### Admin identity / permissions (source of truth)

- `GET /admin/me`
- Consumed by:
  - `src/api/adminMe.js`
  - `src/auth/AdminAuthProvider.jsx`
  - `src/components/layout/ProtectedRoute.jsx`
- Used to determine auth state and permissions in UI.

## Endpoint Inventory Used by Frontend

## SOS

- `GET /admin/sos`
- `GET /admin/sos/live?status=<status>&limit=<limit>&cursor=<cursor>`
- `GET /admin/sos/live-map`
- `GET /admin/sos/:sosId`
- `POST /admin/sos/:sosId/acknowledge` body optional: `{ "note": "..." }`
- `POST /admin/sos/:sosId/resolve` body optional: `{ "note": "..." }`

Reference file:
- `WEB_ADMIN_SOS_LIVE_OPS_CONTEXT.md`

## Broadcasts

- `GET /admin/broadcasts`
- `POST /admin/broadcasts`
- `POST /admin/broadcasts/:id/send`

Reference file:
- `WEB_ADMIN_BROADCAST_CONTEXT.md`

## Incidents

- `GET /admin/incidents`
- `GET /admin/incidents?status=<status>`
- `GET /admin/incidents/:id`
- `PATCH /admin/incidents/:id`

## Notifications

- `GET /admin/notifications`
- `PATCH /admin/notifications/:notificationId/read`

## Admin requests

- `GET /admin/admin-requests`
- `PATCH /admin/admin-requests/:requestId/accept`
- `PATCH /admin/admin-requests/:requestId/reject`
- `POST /admin/admin-requests` (used by `src/api/adminRequests.js`)

## User/admin management (current client assumptions)

- Primary list endpoint attempted first:
  - `GET /admin/admins`
- Client-side fallback paths attempted for update/delete operations:
  - `/admin/admins/:userId`
  - `/admin/users/:userId`
  - `/admin/personnel/:userId`

This indicates backend compatibility layers may exist; keeping one canonical path is recommended long-term.

## Response Shape Expectations

The frontend tolerates both direct arrays and wrapped objects for list endpoints.

Examples:
- Users list may be:
  - `[...]` or `{ "users": [...] }` or other common keys
- Notifications may be:
  - `[...]` or `{ "notifications": [...] }`
- Broadcasts may be:
  - `[...]` or `{ "broadcasts": [...] }`

For SOS detail, expected shape is:

```json
{
  "thread": { "...": "..." },
  "events": [{ "...": "..." }]
}
```

## Error Handling Expectations

Frontend API client behavior (`src/services/api.js`):

- Non-2xx -> throws `ApiError` with:
  - `message`
  - `status`
  - `data`
- On `401`:
  - `admin_token` and `admin_me` are cleared
  - `auth:logout` window event is dispatched

Recommended backend consistency:
- Always return JSON error payload with at least:
  - `message: string`
  - optional details object

## Permissions Expected by UI

Current permission strings used in routing/views:

- `manage_users`
- `manage_incidents`
- `view_incidents`
- `manage_broadcasts`

These are evaluated client-side from `/admin/me` payload.

## Operational Notes

- SOS page currently uses polling (5s) for live queue/map.
- Broadcast send endpoint should be idempotent-aware (`409` already sent is handled).
- Admin request accept flow has fallback payload handling for `400/422`.
- Keep timestamps in ISO-8601 UTC for stable frontend formatting.

## Suggested Backend Quality Checklist

- Ensure all `/admin/*` routes enforce admin JWT.
- Normalize list responses to a consistent schema per resource.
- Return stable status codes:
  - `400` validation
  - `401` unauthorized
  - `403` forbidden (if permission model enforced server-side)
  - `404` not found
  - `409` conflict (already sent / invalid transition)
  - `500` server error
- Include contract tests for:
  - `/admin/me` permissions payload
  - SOS live/detail/action endpoints
  - Broadcast create/send lifecycle
  - Incident update flow

