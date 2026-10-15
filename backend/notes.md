npx autocannon -c 50 -d 20 -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiI5OGEyNWM3Ni03NjRiLTQ1N2EtOWNhMy03NjRjNDZiOGZkZDkiLCJpYXQiOjE3OTE5MTUyMjUsImV4cCI6MTc5MjUyMDAyNX0.oQmp7OCXdQvAuSjpgqll_K759S8SGgiEzZ-yxvGKEs0" "http://localhost:3000/posts?tag=tag5&limit=20"
Need to install the following packages:
autocannon@8.0.0
Ok to proceed? (y) y

npm warn deprecated uuid@8.3.2: uuid@10 and below is no longer supported.  For ESM codebases, update to uuid@latest.  For CommonJS codebases, use uuid@11 (but be aware this version will likely be deprecated in 2028).
Running 20s test @ http://localhost:3000/posts?tag=tag5&limit=20
50 connections


┌─────────┬───────┬───────┬───────┬────────┬──────────┬──────────┬────────┐
│ Stat    │ 2.5%  │ 50%   │ 97.5% │ 99%    │ Avg      │ Stdev    │ Max    │
├─────────┼───────┼───────┼───────┼────────┼──────────┼──────────┼────────┤
│ Latency │ 23 ms │ 28 ms │ 97 ms │ 119 ms │ 34.45 ms │ 18.42 ms │ 169 ms │
└─────────┴───────┴───────┴───────┴────────┴──────────┴──────────┴────────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬──────────┬─────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg      │ Stdev   │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼─────────┼─────────┤
│ Req/Sec   │ 422     │ 422     │ 1,416   │ 1,951   │ 1,432.25 │ 388.47  │ 422     │
├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼─────────┼─────────┤
│ Bytes/Sec │ 2.89 MB │ 2.89 MB │ 9.69 MB │ 13.4 MB │ 9.8 MB   │ 2.66 MB │ 2.89 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴──────────┴─────────┴─────────┘

Req/Bytes counts sampled once per second.
# of samples: 20

//without Filter

Running 20s test @ http://localhost:3000/posts?limit=20
50 connections


┌─────────┬───────┬───────┬───────┬───────┬──────────┬─────────┬────────┐
│ Stat    │ 2.5%  │ 50%   │ 97.5% │ 99%   │ Avg      │ Stdev   │ Max    │
├─────────┼───────┼───────┼───────┼───────┼──────────┼─────────┼────────┤
│ Latency │ 20 ms │ 24 ms │ 55 ms │ 61 ms │ 25.86 ms │ 8.03 ms │ 113 ms │
└─────────┴───────┴───────┴───────┴───────┴──────────┴─────────┴────────┘
┌───────────┬─────────┬─────────┬─────────┬─────────┬──────────┬─────────┬─────────┐
│ Stat      │ 1%      │ 2.5%    │ 50%     │ 97.5%   │ Avg      │ Stdev   │ Min     │
├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼─────────┼─────────┤
│ Req/Sec   │ 1,490   │ 1,490   │ 1,977   │ 2,135   │ 1,896.05 │ 193.9   │ 1,490   │
├───────────┼─────────┼─────────┼─────────┼─────────┼──────────┼─────────┼─────────┤
│ Bytes/Sec │ 10.1 MB │ 10.1 MB │ 13.4 MB │ 14.5 MB │ 12.8 MB  │ 1.31 MB │ 10.1 MB │
└───────────┴─────────┴─────────┴─────────┴─────────┴──────────┴─────────┴─────────┘

Req/Bytes counts sampled once per second.
# of samples: 20

## Step 12 — PostgreSQL Query Analysis

- Seeded 100,000 test posts.
- Tested `GET /posts` with autocannon: 50 concurrent connections for 20 seconds.
- Without tag filter: average latency 25.86 ms, p99 61 ms, average 1896.05 req/s.
- With `tag5` filter: average latency 34.45 ms, p99 119 ms, average 1432.25 req/s.
- Ran `EXPLAIN ANALYZE` for the tag-filtered query.
- PostgreSQL used `Post_tags_idx` through `Bitmap Index Scan`.
- Approximately 2,000 rows matched `tag5`; query execution time was 16.072 ms.
- Current results are local-machine benchmarks, not production performance guarantees.


Parallel Seq Scan on "Post"
Sort Key: "createdAt" DESC, id DESC
Execution Time: 42.131 ms


### EXPLAIN ANALYZE — Without Tag Filter

Query:
`SELECT * FROM public."Post" ORDER BY "createdAt" DESC, id DESC LIMIT 20;`

- Execution time: 42.131 ms
- Query plan: Parallel Seq Scan followed by top-N Sort and Gather Merge.
- No index scan was used for this query.
- Observation: PostgreSQL scanned the table and sorted rows to return the latest 20 posts.
- Potential optimization to investigate: a B-tree index on `("createdAt" DESC, id DESC)`.

Note: `EXPLAIN ANALYZE` timings vary with database state, caching, and machine load.


Index Scan using "Post_userId_createdAt_id_idx"
Execution Time: 0.062 ms


### EXPLAIN ANALYZE — User Filter + Pagination

- Query filters by `userId`.
- Ordering: `createdAt DESC, id DESC`.
- Limit: 21 rows (API limit + 1).
- Index used: `Post_userId_createdAt_id_idx`.
- Execution time: 0.062 ms.
- Observation: The composite index supports filtering and ordered pagination efficiently in this test.



### Rate Limit Checks
- Login endpoint: 20 failed attempts ke baad HTTP 429.
- Posts endpoint: Low limit (5/min) par rate-limit response mila.


### Load Test — Cache + Rate Limiter

- Endpoint: `GET /posts?limit=20`
- Concurrent connections: 50
- Duration: 20 seconds
- Average latency: 16.23 ms
- p99 latency: 46 ms
- Average throughput: 2,994.65 req/s
- Rate limit: Temporarily configured to 1,000,000 requests/min for local testing
- Cache and rate limiter were enabled during the test.

Comparison with the earlier no-filter baseline:
- Average latency: 25.86 ms → 16.23 ms
- p99 latency: 61 ms → 46 ms
- Average throughput: 1,896.05 → 2,994.65 req/s

Note: Local benchmark results; not a production capacity guarantee.

### Full-text Search Optimization

Before:
- Query: title/description ILIKE '%99999%'
- Execution time: 351.259 ms
- Plan: Sequential Scan
- Rows removed by filter: 99,800

After:
- Query: tsvector + GIN index
- Execution time: 0.610 ms
- Plan: Bitmap Index Scan on Post_search_idx
- Matching rows: 1
- Improvement: approximately 576x faster


### Search API Load Test
- Connections: 50
- Duration: 20 seconds
- Average latency: 11.72 ms
- P99 latency: 32 ms
- Average throughput: 4,101.25 req/s
- Total requests: approximately 82,000
- Note: Same query repeated; Redis cache likely warm.
- Environment: Local development

Metric	1 instance — avg of 2 runs	3 instances — avg of 2 runs
Requests/sec	1,682.7	2,171.3
Average latency	29.28 ms	22.56 ms
99th percentile latency	81–84 ms	59–66 ms
Maximum latency	345–482 ms	187–196 ms
