# KnowSphere
Save links from anywhere (YouTube, GitHub, articles...), tag them, search them later.

**Live demo:** <Vercel link>   |   Demo login: demo@... / <password>
(Backend free tier par hai, pehli request mein ~1 minute lag sakta hai.)


## Features
- JWT auth, save links with tags, link preview (image where the site allows it)
- Cursor pagination, tag filter, full-text search (Postgres tsvector + GIN)

## Architecture
(mermaid diagram neeche)

## Performance (local machine, 100k posts, autocannon, 50 connections)
| Stage | Avg latency | p99 | Req/sec |
(notes.md ki table yahan)

## Design decisions
- Cache-aside with per-user version key, so invalidation needs no SCAN
- Rate limiting in Redis, shared across instances; cache and limiter skip if Redis is down
- SSRF protection on link previews (private IPs blocked, 5 s timeout)
- Cursor pagination instead of offset

## Run locally
docker compose up -d --build   # API on http://localhost:8080

## Limitations / next steps
- Live demo runs a single instance; docker compose runs 3 behind Nginx
- Link previews run inside the request (a BullMQ worker would move this to the background)