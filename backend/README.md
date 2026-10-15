# KnowSphere
Save links from anywhere (YouTube, GitHub, articles...), tag them, and search them later.

**Live demo:** <Vercel link> | Demo login: demo@... / <password>  
(The backend runs on a free tier, so the first request may take around 1 minute.)

## Features
- JWT authentication, save links with tags, and link previews (images where supported by the source website)
- Cursor pagination, tag filtering, and full-text search (PostgreSQL `tsvector` + GIN)

## Architecture
(Mermaid diagram below)

## Performance (local machine, 100k posts, Autocannon, 50 connections)
| Stage | Avg latency | p99 | Req/sec |
(Insert the performance table from `notes.md` here.)

## Design decisions
- Cache-aside with a per-user version key, so invalidation requires no `SCAN`
- Rate limiting in Redis, shared across instances; caching and rate limiting are skipped if Redis is unavailable
- SSRF protection for link previews (private IPs blocked, 5-second timeout)
- Cursor pagination instead of offset-based pagination

## Run locally
```bash
docker compose up -d --build
```
API available at `http://localhost:8080`.

## Limitations / next steps
- The live demo runs a single instance; Docker Compose runs three instances behind Nginx.
- Link previews run within the request cycle; a BullMQ worker could move this processing to the background.