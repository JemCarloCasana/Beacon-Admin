# Beacon Admin

## SOS Live Ops Contract Notes

- Map screen (`/map`) reads SOS locations from `GET /admin/sos/live-map`.
- Expected live status values: `active`, `acknowledged`, `resolved`.
- Live map polling interval is 5 seconds.

## Environment

Add the following to your local env:

```env
VITE_MAPTILER_API_KEY=YOUR_MAPTILER_API_KEY
VITE_MAPTILER_STYLE_ID=streets-v2
```
