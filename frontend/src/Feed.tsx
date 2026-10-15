import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { api, errorMessage } from './api'
import AddLinkForm from './components/AddLinkForm'
import { SearchIcon } from './components/icons'
import PostCard from './components/PostCard'
import SkeletonCard from './components/SkeletonCard'
import type { Post } from './types'

const PAGE = 20

export default function Feed() {
  const [posts, setPosts] = useState<Post[]>([])
  const [cursor, setCursor] = useState<string | null>(null)
  const [offset, setOffset] = useState(0) 
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(true)
  const [loadingMore, setLoadingMore] = useState(false)
  const [error, setError] = useState('')

  const [input, setInput] = useState('')
  const [q, setQ] = useState('') 
  const [tag, setTag] = useState<string | null>(null)

  const sentinel = useRef<HTMLDivElement>(null)
  const requestId = useRef(0) 

  useEffect(() => {
    const t = setTimeout(() => setQ(input.trim()), 350)
    return () => clearTimeout(t)
  }, [input])

  const loadFirst = useCallback(async () => {
    const id = ++requestId.current
    setLoading(true)
    setError('')
    try {
      if (q) {
        const res = await api.searchPosts({ q, tag, limit: PAGE, offset: 0 })
        if (id !== requestId.current) return
        setPosts(res.data)
        setOffset(res.data.length)
        setHasMore(res.data.length === PAGE)
        setCursor(null)
      } else {
        const res = await api.listPosts({ tag, limit: PAGE })
        if (id !== requestId.current) return
        setPosts(res.data)
        setCursor(res.nextCursor)
        setHasMore(res.nextCursor !== null)
      }
    } catch (e) {
      if (id === requestId.current) setError(errorMessage(e))
    } finally {
      if (id === requestId.current) setLoading(false)
    }
  }, [q, tag])

  useEffect(() => {
    void loadFirst()
  }, [loadFirst])

  const loadMore = useCallback(async () => {
    if (loading || loadingMore || !hasMore) return
    const id = requestId.current
    setLoadingMore(true)
    try {
      if (q) {
        const res = await api.searchPosts({ q, tag, limit: PAGE, offset })
        if (id !== requestId.current) return
        setPosts((p) => [...p, ...res.data])
        setOffset((o) => o + res.data.length)
        setHasMore(res.data.length === PAGE)
      } else {
        const res = await api.listPosts({ tag, limit: PAGE, cursor })
        if (id !== requestId.current) return
        setPosts((p) => [...p, ...res.data])
        setCursor(res.nextCursor)
        setHasMore(res.nextCursor !== null)
      }
    } catch (e) {
      if (id === requestId.current) setError(errorMessage(e))
    } finally {
      setLoadingMore(false)
    }
  }, [loading, loadingMore, hasMore, q, tag, offset, cursor])

  useEffect(() => {
    const el = sentinel.current
    if (!el) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) void loadMore()
      },
      { rootMargin: '300px' },
    )
    observer.observe(el)
    return () => observer.disconnect()
  }, [loadMore])

  function handleCreated(post: Post) {
    if (!q && !tag) {
      setPosts((p) => [post, ...p])
    } else {
      setInput('')
      setQ('')
      setTag(null)
    }
  }

  async function handleDelete(post: Post) {
    if (!window.confirm('Delete this link?')) return
    try {
      await api.deletePost(post.id)
      setPosts((p) => p.filter((x) => x.id !== post.id))
    } catch (e) {
      setError(errorMessage(e))
    }
  }

  const toggleTag = (t: string) => setTag((cur) => (cur === t ? null : t))

  const topTags = useMemo(() => {
    const counts = new Map<string, number>()
    for (const p of posts) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
    return [...counts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([t]) => t)
  }, [posts])

  const filtering = q !== '' || tag !== null

  return (
    <div className="feed">
      <AddLinkForm onCreated={handleCreated} />

      <div className="finder">
        <label className="slot-wrap">
          <span className="slot-icon">
            <SearchIcon />
          </span>
          <input
            className="slot slot-icon-pad"
            type="search"
            aria-label="Search your links"
            placeholder="Search your saved links"
            value={input}
            onChange={(e) => setInput(e.target.value)}
          />
        </label>

        {(topTags.length > 0 || tag) && (
          <div className="chips" aria-label="Filter by tag">
            {tag && (
              <button type="button" className="chip is-active" onClick={() => setTag(null)}>
                #{tag} (clear)
              </button>
            )}
            {topTags
              .filter((t) => t !== tag)
              .map((t) => (
                <button key={t} type="button" className="chip" onClick={() => toggleTag(t)}>
                  #{t}
                </button>
              ))}
          </div>
        )}
      </div>

      {error && (
        <div role="alert" className="notice notice-error notice-row">
          <span>{error}</span>
          <button type="button" className="btn btn-sky btn-small" onClick={() => void loadFirst()}>
            Try again
          </button>
        </div>
      )}

      {loading ? (
        <div className="grid">
          {Array.from({ length: 6 }, (_, i) => (
            <SkeletonCard key={i} />
          ))}
        </div>
      ) : posts.length === 0 && !error ? (
        <div className="empty clay">
          <h2 className="empty-title">{filtering ? 'Nothing matches that search' : 'Nothing saved yet'}</h2>
          <p className="empty-text">
            {filtering
              ? 'Try a different word, or clear the tag filter.'
              : 'Paste a link in the box above and it will show up here.'}
          </p>
        </div>
      ) : (
        <div className="grid">
          {posts.map((p) => (
            <PostCard key={p.id} post={p} activeTag={tag} onTagClick={toggleTag} onDelete={handleDelete} />
          ))}
        </div>
      )}

      <div ref={sentinel} className="sentinel" />
      {loadingMore && <p className="more">Loading more links…</p>}
    </div>
  )
}
