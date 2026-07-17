import { createContext, useContext, useEffect, useState } from 'react'
import api from '../api/client'

const AuthContext = createContext(null)

function applySociete(user) {
  const codes = (user?.societes || []).map((s) => String(s.code))
  const existing = localStorage.getItem('societe')
  // Conserve la société déjà choisie si elle est valide pour ce compte
  if (existing && codes.includes(existing)) return
  const code = user?.societes?.[0]?.code
  if (code) localStorage.setItem('societe', code)
  else localStorage.removeItem('societe')
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (!token) { setLoading(false); return }
    api.get('/me')
      .then(({ data }) => { applySociete(data); setUser(data) })
      .catch(() => localStorage.removeItem('token'))
      .finally(() => setLoading(false))
  }, [])

  const finalize = (data) => {
    localStorage.setItem('token', data.token)
    applySociete(data.user)
    setUser(data.user)
    return data.user
  }

  // Retourne { twoFactor: true, ... } si un code OTP est requis,
  // sinon connecte et retourne l'utilisateur.
  const login = async (email, password) => {
    const { data } = await api.post('/login', { email, password })
    if (data.two_factor_required) {
      return { twoFactor: true, email, sentTo: data.sent_to, message: data.message }
    }
    return finalize(data)
  }

  const verifyOtp = async (email, code) => {
    const { data } = await api.post('/login/verify-otp', { email, code })
    return finalize(data)
  }

  const logout = async () => {
    const token = localStorage.getItem('token')
    localStorage.removeItem('token')
    localStorage.removeItem('societe')
    localStorage.removeItem('annee')
    setUser(null)
    if (token) { api.post('/logout').catch(() => {}) }
  }

  const can = (ability) => {
    if (!user) return false
    if (user.role === 'super_admin') return true
    return Array.isArray(user.abilities) && user.abilities.includes(ability)
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyOtp, logout, can }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
