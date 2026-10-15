import { useCallback, useEffect, useState } from 'react'
import { api, clearToken, getToken, setToken, setUnauthorizedHandler } from './api'
import AuthPage from './components/AuthPage'
import Feed from './Feed'
import type { User } from './types'

export default function App() {
  const [user, setUser] = useState<User | null>(null)
  const [checking, setChecking] = useState(() => getToken() !== null)

  const logout = useCallback(() => {
    clearToken()
    setUser(null)
  }, [])

  useEffect(() => {
    setUnauthorizedHandler(logout)
    if (!getToken()) return
    api
      .me()
      .then(setUser)
      .catch(() => {
      })
      .finally(() => setChecking(false))
  }, [logout])

  if (checking) {
    return <div className="boot">Loading your links…</div>
  }

  if (!user) {
    return (
      <AuthPage
        onAuth={(token, u) => {
          setToken(token)
          setUser(u)
        }}
      />
    )
  }

  return (
    <div className="shell">
      <header className="topbar clay">
        <div className="brand">
          <span className="logo" aria-hidden="true">K</span>
          <span className="brand-name">KnowSphere</span>
        </div>
        <div className="topbar-user">
          <span className="user-email">{user.email}</span>
          <button type="button" className="btn btn-sky btn-small" onClick={logout}>
            Log out
          </button>
        </div>
      </header>

      <main className="container">
        <Feed />
      </main>
    </div>
  )
}
