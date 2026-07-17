import axios from 'axios'

const baseURL = import.meta.env.VITE_API_URL || 'http://localhost:8000'

const api = axios.create({
  baseURL: `${baseURL}/api`,
  headers: { Accept: 'application/json' },
})

// Injecte le token Bearer a chaque requete
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token')
  if (token) config.headers.Authorization = `Bearer ${token}`
  const annee = localStorage.getItem('annee')
  if (annee) config.headers['X-Annee'] = annee
  const societe = localStorage.getItem('societe')
  if (societe) config.headers['X-Societe'] = societe
  const etab = localStorage.getItem('etablissement')
  if (etab) config.headers['X-Etablissement'] = etab
  const role = localStorage.getItem('role')
  if (role) config.headers['X-Role'] = role
  return config
})

// Deconnexion automatique si 401
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401 && localStorage.getItem('token')) {
      localStorage.removeItem('token')
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

export default api
