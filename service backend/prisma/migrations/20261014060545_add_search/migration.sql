
-- Add a generated full-text search column
ALTER TABLE "Post"
ADD COLUMN "search" tsvector
GENERATED ALWAYS AS (
    to_tsvector(
        'english',
        coalesce("title", '') || ' ' || coalesce("description", '')
    )
) STORED;

-- Create a GIN index for fast full-text search
CREATE INDEX "Post_search_idx"
ON "Post" USING GIN ("search");
