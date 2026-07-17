// Génère un identifiant unique lisible pour les formulaires.
// Ex: genUid('NIV') -> "NIV-3F9A2C7B"
export function genUid(prefix = '') {
  let rnd = ''
  try {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
      rnd = crypto.randomUUID().replace(/-/g, '')
    }
  } catch (e) { /* noop */ }
  if (!rnd) rnd = (Date.now().toString(16) + Math.random().toString(16).slice(2))
  rnd = rnd.slice(0, 8).toUpperCase()
  return prefix ? `${prefix}-${rnd}` : rnd
}
