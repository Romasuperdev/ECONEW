import api from '../api/client'

/** Télécharge un fichier (PDF/CSV) via l'API en conservant l'auth token. */
export async function downloadFile(url, fallbackName = 'document') {
  const res = await api.get(url, { responseType: 'blob' })
  const blob = new Blob([res.data])
  const cd = res.headers['content-disposition'] || ''
  const match = cd.match(/filename="?([^"]+)"?/)
  const name = match ? match[1] : fallbackName

  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(link.href)
}
