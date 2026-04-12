# 3.2 Open Points

This page lists improvements identified after the migration.

## API Hardening

- Add authentication and authorization if the API is exposed outside trusted
  networks.
- Add pagination or range support for very large frame sets.

## Frontend Experience

- Add reel thumbnail strips for faster visual navigation.
- Add frame number overlay and keyboard shortcuts for frame stepping.

## Testing

- Add frontend integration tests mocking API responses.
- Add backend tests for path validation and edge-case directory layouts.

## Deployment

- Provide a production-ready reverse proxy configuration that forwards
  `/api` and `/media` to FastAPI and `/` to frontend static assets.
