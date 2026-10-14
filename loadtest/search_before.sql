EXPLAIN ANALYZE
SELECT "id"
FROM public."Post"
WHERE "userId" = (
    SELECT "id"
    FROM public."User"
    LIMIT 1
)
AND (
    "title" ILIKE '%99999%'
    OR "description" ILIKE '%99999%'
)
LIMIT 20;