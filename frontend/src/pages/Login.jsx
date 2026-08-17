import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import { Button, Input } from '../components/ui'
import { LogoMark, LogoFull } from '../components/Logo'
import ThemeSwitcher from '../components/ThemeSwitcher'
import Icon from '../components/Icon'
import { apiError } from '../utils/apiError'
import LoginBackground from '../components/LoginBackground'

export default function Login() {
  const { login, verifyOtp, logout } = useAuth()
  const navigate = useNavigate()
  const [active, setActive] = useState('app') // 'app' | 'console'
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpInfo, setOtpInfo] = useState('')

  const switchTo = (m) => { setActive(m); setError('') }

  const routeAfterLogin = async (user) => {
    const isSuper = user?.is_super || user?.role === 'super_admin'
    if (active === 'console' && !isSuper) { await logout(); setError("Ce compte n'a pas accès à la console plateforme."); return }
    if (active === 'console') { navigate('/super'); return }
    if (user?.role === 'admin_etablissement') { navigate('/admin-etablissement'); return }
    navigate('/')
  }

  const submit = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try {
      const res = await login(email, password)
      if (res?.twoFactor) { setOtpStep(true); setOtpInfo(res.message || 'Un code vous a été envoyé par email.'); return }
      await routeAfterLogin(res)
    } catch (err) {
      setError(err.response?.data?.errors?.email?.[0] || err.response?.data?.message || apiError(err))
    } finally { setLoading(false) }
  }

  const submitOtp = async (e) => {
    e.preventDefault(); setError(''); setLoading(true)
    try { await routeAfterLogin(await verifyOtp(email, otp.trim())) }
    catch (err) { setError(err.response?.data?.errors?.code?.[0] || err.response?.data?.message || apiError(err)) }
    finally { setLoading(false) }
  }

  // Formulaire réutilisé pour les deux faces
  const renderForm = (kind) => {
    const isConsole = kind === 'console'
    return (
      <form onSubmit={submit} className="w-full max-w-[340px] mx-auto flex flex-col items-center text-center gap-3 text-[15px]">
        <div className="flex items-center gap-2 mb-1" style={{ color: isConsole ? 'var(--sidebar)' : 'var(--accent)' }}>
          <Icon name={isConsole ? 'globe' : 'building'} size={26} />
          <h2 className="text-2xl font-extrabold text-heading">{isConsole ? 'Console plateforme' : 'Application école'}</h2>
        </div>
        <p className="text-muted text-base mb-2">{isConsole ? 'Espace Super Administrateur.' : 'Accédez à votre établissement.'}</p>
        <div className="w-full text-left"><Input label="Identifiant (login ou e-mail)" value={email} onChange={(e) => setEmail(e.target.value)} required /></div>
        <div className="w-full text-left"><Input label="Mot de passe" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required /></div>
        {error && <div className="w-full text-sm text-red-600 rounded-lg p-2" style={{ background: 'rgba(220,38,38,.1)' }}>{error}</div>}
        <Button type="submit" variant={isConsole ? 'primary' : 'gold'} disabled={loading} className="w-full justify-center mt-1 text-base py-3">
          {loading ? 'Connexion…' : (isConsole ? 'Accéder à la console' : "Accéder à l'application")}
        </Button>
      </form>
    )
  }

  const consoleActive = active === 'console'

  return (
    <div className="min-h-screen flex items-center justify-center p-4" style={{ background: 'linear-gradient(135deg, color-mix(in srgb, var(--sidebar) 12%, var(--bg)), var(--bg))' }}>
      <LoginBackground />
      <div className="absolute top-5 right-5 z-30"><ThemeSwitcher compact /></div>

      {otpStep ? (
        <div className="relative z-10 card rounded-2xl p-8 w-full max-w-md">
          <div className="flex flex-col items-center mb-4"><LogoFull variant="color" height={80} /><h1 className="text-xl font-bold text-heading mt-3">Vérification en deux étapes</h1></div>
          <p className="text-muted text-sm mb-5 text-center">{otpInfo}</p>
          <form onSubmit={submitOtp} className="space-y-4">
            <Input label="Code à 6 chiffres" value={otp} inputMode="numeric" maxLength={6}
              onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))} placeholder="______" required />
            {error && <div className="text-sm text-red-600 rounded-lg p-2" style={{ background: 'rgba(220,38,38,.1)' }}>{error}</div>}
            <Button type="submit" variant="gold" disabled={loading} className="w-full justify-center">{loading ? 'Vérification…' : 'Valider le code'}</Button>
            <button type="button" onClick={() => { setOtpStep(false); setOtp(''); setError('') }} className="w-full text-center text-xs text-muted hover:underline">Revenir à la connexion</button>
          </form>
        </div>
      ) : (
        <>
          {/* ---------- Grand écran : panneau coulissant ---------- */}
          <div className="hidden md:block relative z-10 overflow-hidden card rounded-2xl" style={{ width: 880, height: 560 }}>
            {/* Face Application (gauche) */}
            <div className="absolute top-0 left-0 h-full flex items-center justify-center p-10" style={{ width: '50%' }}>
              {renderForm('app')}
            </div>
            {/* Face Console (droite) */}
            <div className="absolute top-0 h-full flex items-center justify-center p-10" style={{ width: '50%', left: '50%' }}>
              {renderForm('console')}
            </div>
            {/* Volet glissant */}
            <div className="absolute top-0 h-full z-20 text-white flex items-center justify-center p-10"
              style={{
                width: '50%', left: '50%',
                transform: consoleActive ? 'translateX(-100%)' : 'translateX(0)',
                transition: 'transform .6s cubic-bezier(.6,.05,.2,1)',
                background: consoleActive
                  ? 'linear-gradient(135deg, var(--accent), color-mix(in srgb, var(--accent) 60%, #009A6B))'
                  : 'linear-gradient(135deg, var(--sidebar), var(--sidebar-2, #12305e))',
              }}>
              <div className="text-center max-w-[300px] flex flex-col items-center">
                <LogoFull variant="white" height={120} />
                <h2 className="text-3xl font-extrabold mt-4">Bienvenue</h2>
                {consoleActive ? (
                  <>
                    <p className="text-white/80 text-base mt-3">Vous gérez un établissement ? Connectez-vous à l'application.</p>
                    <button onClick={() => switchTo('app')} className="mt-5 px-6 py-2.5 rounded-xl font-semibold text-base border-2 border-white/80 hover:bg-white/10 transition">Application école</button>
                  </>
                ) : (
                  <>
                    <p className="text-white/80 text-base mt-3">Vous êtes administrateur plateforme ? Accédez à la console.</p>
                    <button onClick={() => switchTo('console')} className="mt-5 px-6 py-2.5 rounded-xl font-semibold text-base border-2 border-white/80 hover:bg-white/10 transition">Console plateforme</button>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* ---------- Mobile : onglets + formulaire ---------- */}
          <div className="relative z-10 md:hidden w-full max-w-md">
            <div className="flex flex-col items-center mb-5"><LogoFull variant="color" height={88} /></div>
            <div className="card rounded-2xl p-6">
              <div className="grid grid-cols-2 gap-2 p-1 rounded-xl mb-5" style={{ background: 'var(--surface-2)' }}>
                <button type="button" onClick={() => switchTo('app')} className="flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold"
                  style={!consoleActive ? { background: 'var(--accent)', color: 'var(--accent-ink)' } : { color: 'var(--muted)' }}><Icon name="building" size={16} /> Application</button>
                <button type="button" onClick={() => switchTo('console')} className="flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold"
                  style={consoleActive ? { background: 'var(--sidebar)', color: '#fff' } : { color: 'var(--muted)' }}><Icon name="globe" size={16} /> Console</button>
              </div>
              {renderForm(active)}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
