import { useState, useEffect } from 'react'
import { TrialProvider } from './context/TrialContext.jsx'
import LandingPage from './components/Landing/LandingPage.jsx'
import TrialPage from './components/Trial/TrialPage.jsx'
import VerdictPage from './components/Verdict/VerdictPage.jsx'

export default function App() {
  const [page, setPage] = useState('landing') // 'landing' | 'trial' | 'verdict'
  const [prevPage, setPrevPage] = useState(null)
  const [voiceModeOn, setVoiceModeOn] = useState('off') // 'off' | 'hybrid' | 'full'
  const [theme, setTheme] = useState(() =>
    localStorage.getItem('theme') || 'light'
  )

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('theme', theme)
  }, [theme])

  function navigate(to) {
    setPrevPage(page)
    setPage(to)
  }

  function toggleTheme() {
    setTheme(t => t === 'light' ? 'dark' : 'light')
  }

  function getPageClass(name) {
    if (page === name) return 'page visible'
    if (prevPage === name && page !== name) return `page hidden ${page === 'landing' ? 'from-left' : ''}`
    return 'page hidden'
  }

  return (
    <TrialProvider>
      {/* Theme toggle only shown on landing and verdict — trial page embeds it in the header */}
      {page !== 'trial' && (
        <button className="theme-toggle" onClick={toggleTheme} title="Toggle theme">
          {theme === 'light' ? '☽' : '○'}
        </button>
      )}

      <div className="page-stack">
        <div className={getPageClass('landing')}>
          <LandingPage onStart={(mode) => { setVoiceModeOn(mode ?? 'off'); navigate('trial') }} />
        </div>
        <div className={getPageClass('trial')}>
          <TrialPage
            onVerdict={() => navigate('verdict')}
            onBack={() => navigate('landing')}
            voiceModeOn={voiceModeOn}
            onVoiceModeChange={setVoiceModeOn}
            theme={theme}
            onToggleTheme={toggleTheme}
          />
        </div>
        <div className={getPageClass('verdict')}>
          <VerdictPage onNewCase={() => { setVoiceModeOn('off'); navigate('landing') }} voiceModeOn={voiceModeOn !== 'off'} />
        </div>
      </div>
    </TrialProvider>
  )
}
