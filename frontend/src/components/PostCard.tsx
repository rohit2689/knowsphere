import { useState } from 'react'
import type { CSSProperties } from 'react'
import type { Post } from '../types'
import { hueFor } from '../lib/hues'
import { TrashIcon } from './icons'

type Props = {
  post: Post
  activeTag: string | null
  onTagClick: (tag: string) => void
  onDelete: (post: Post) => void
}

function hostOf(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url
  }
}

function shortUrl(url: string) {
  try {
    const u = new URL(url)
    const path = u.pathname === '/' ? '' : u.pathname
    return `${u.hostname.replace(/^www\./, '')}${path}`
  } catch {
    return url
  }
}

export default function PostCard({ post, activeTag, onTagClick, onDelete }: Props) {
  const [imgFailed, setImgFailed] = useState(false)
  const label = post.platform ?? hostOf(post.url)
  const heading = post.title ?? shortUrl(post.url)
  const hue = hueFor(label.toLowerCase())
  const showImage = post.imageUrl !== null && !imgFailed

  const style = { '--tint': hue.tint, '--strong': hue.strong } as CSSProperties

  return (
    <article className="card clay" style={style}>
      <a className="card-media" href={post.url} target="_blank" rel="noopener noreferrer" tabIndex={-1} aria-hidden="true">
        {showImage ? (
          <img
            src={post.imageUrl!}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
          />
        ) : (
          <span className="card-letter">{label.charAt(0).toUpperCase()}</span>
        )}
      </a>

      <div className="card-body">
        <span className="pill">{label}</span>

        <h3 className="card-title">
          <a href={post.url} target="_blank" rel="noopener noreferrer">
            {heading}
          </a>
        </h3>

        {post.description && <p className="card-desc">{post.description}</p>}

        {post.tags.length > 0 && (
          <div className="tags">
            {post.tags.map((tag) => (
              <button
                key={tag}
                type="button"
                className={tag === activeTag ? 'tag is-active' : 'tag'}
                onClick={() => onTagClick(tag)}
              >
                #{tag}
              </button>
            ))}
          </div>
        )}

        <div className="card-foot">
          <time dateTime={post.createdAt}>
            {new Date(post.createdAt).toLocaleDateString(undefined, {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
            })}
          </time>
          <button type="button" className="btn-delete" onClick={() => onDelete(post)} aria-label={`Delete ${heading}`}>
            <TrashIcon />
            Delete
          </button>
        </div>
      </div>
    </article>
  )
}
