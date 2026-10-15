import { useState } from 'react'
import type { FormEvent } from 'react'
import { api, errorMessage } from '../api'
import type { Post } from '../types'
import { LinkIcon } from './icons'

type Props = { onCreated: (post: Post) => void }

function parseTags(raw: string): string[] {
  const tags = raw
    .split(/[,\s]+/)
    .map((t) => t.replace(/^#/, '').trim().toLowerCase())
    .filter(Boolean)
  return [...new Set(tags)].slice(0, 10)
}

export default function AddLinkForm({ onCreated }: Props) {
  const [url, setUrl] = useState('')
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    let link = url.trim()
    if (!link) return
    if (!/^https?:\/\//i.test(link)) link = `https://${link}`

    setLoading(true)
    try {
      const post = await api.createPost({
        url: link,
        tags: parseTags(tags),
        ...(title.trim() ? { title: title.trim() } : {}),
      })
      onCreated(post)
      setUrl('')
      setTitle('')
      setTags('')
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <form className="save clay" onSubmit={submit}>
      <h2 className="save-title">Paste a link to save it</h2>

      <div className="save-main">
        <label className="slot-wrap">
          <span className="slot-icon">
            <LinkIcon />
          </span>
          <input
            className="slot slot-icon-pad"
            aria-label="Link"
            required
            placeholder="Paste a link here"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
        </label>
        <button type="submit" className="btn btn-sun" disabled={loading}>
          {loading ? 'Saving…' : 'Save link'}
        </button>
      </div>

      <div className="save-extra">
        <input
          className="slot slot-small"
          aria-label="Title (optional)"
          placeholder="Title (optional)"
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
        <input
          className="slot slot-small"
          aria-label="Tags, separated by commas"
          placeholder="Tags, like react, tutorial"
          value={tags}
          onChange={(e) => setTags(e.target.value)}
        />
      </div>

      {loading && <p className="save-note">Fetching a preview of the page. This can take a few seconds.</p>}
      {error && (
        <p role="alert" className="notice notice-error">
          {error}
        </p>
      )}
    </form>
  )
}
