import { useState } from 'react'
import type { FormEvent } from 'react'
import { api, errorMessage } from '../api'
import type { User } from '../types'
import ClayBlobs from './ClayBlobs'

type Props = { onAuth: (token: string, user: User) => void }
type Mode = 'login' | 'register'

export default function AuthPage({ onAuth }: Props) {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const isLogin = mode === 'login'

  function switchMode(next: Mode) {
    setMode(next)
    setError('')
  }

  async function submit(e: FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const res = isLogin ? await api.login(email, password) : await api.register(email, password)
      onAuth(res.token, res.user)
    } catch (err) {
      setError(errorMessage(err))
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="auth">
      <section className="auth-hero">
        <div className="brand">
          <span className="logo" aria-hidden="true">K</span>
          <span className="brand-name">KnowSphere</span>
        </div>
        <h1 className="auth-title">Save any link. Find it again in seconds.</h1>
        <p className="auth-sub">
          Videos, articles, repos and posts live in one place, searchable by keyword and tag.
        </p>
        <ClayBlobs />
      </section>

      <section className="auth-card clay">
        <div className="segment" role="tablist" aria-label="Log in or sign up">
          <button
            type="button"
            role="tab"
            aria-selected={isLogin}
            className={isLogin ? 'segment-btn is-active' : 'segment-btn'}
            onClick={() => switchMode('login')}
          >
            Log in
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={!isLogin}
            className={!isLogin ? 'segment-btn is-active' : 'segment-btn'}
            onClick={() => switchMode('register')}
          >
            Sign up
          </button>
        </div>

        <form onSubmit={submit} className="form">
          <label className="field">
            <span className="field-label">Email</span>
            <input
              className="slot"
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label className="field">
            <span className="field-label">Password</span>
            <input
              className="slot"
              type="password"
              required
              minLength={8}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {!isLogin && <span className="field-hint">Use at least 8 characters.</span>}
          </label>

          {error && (
            <p role="alert" className="notice notice-error">
              {error}
            </p>
          )}

          <button type="submit" className="btn btn-sun btn-block" disabled={loading}>
            {loading ? 'Please wait…' : isLogin ? 'Log in' : 'Sign up'}
          </button>
        </form>
      </section>
    </main>
  )
}
