import { useEffect, useState, useCallback } from 'react'
import type { BallotRecord, Candidate, ElectionPreset, RegionName, Role, Vote } from './types'
import { defaultCandidates } from './candidates'
import { sounds } from './sound'
import { BoletimModal } from './components/BoletimModal'
import { CandidateManagerModal } from './components/CandidateManagerModal'

const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
const CANDIDATES_STORAGE_KEY = 'urna_candidates_list_v6'
const CANDIDATES_SIGNATURE_KEY = 'urna_candidates_signature'
const BACKOFFICE_PASSWORD = 'admin123'
const BACKOFFICE_ACCESS_KEY = 'urna_backoffice_access'
const BACKOFFICE_PRESENCE_KEY = 'urna_backoffice_presence'
const BACKOFFICE_SESSION_ID = `${Date.now()}-${Math.random().toString(16).slice(2)}`

const getCandidatesSignature = () =>
  JSON.stringify(
    defaultCandidates.map((candidate) =>
      [
        candidate.id,
        candidate.name,
        candidate.number,
        candidate.role,
        candidate.group,
        candidate.photo,
      ].join('|'),
    ),
  )

const persistCandidates = (nextCandidates: Candidate[]) => {
  try {
    localStorage.setItem(CANDIDATES_STORAGE_KEY, JSON.stringify(nextCandidates))
    localStorage.setItem(CANDIDATES_SIGNATURE_KEY, getCandidatesSignature())
  } catch {}
}

const roleLabels: Record<Role, string> = {
  presidente: 'Presidente',
  'vice-presidente': 'Vice-presidente',
}

const getCandidateByNumber = (role: Role, digits: string, sourceCandidates: Candidate[]) => {
  return sourceCandidates.filter((item) => item.role === role).find((item) => item.number === digits)
}

const regionOptions: Array<{ value: RegionName; label: string }> = [
  { value: 'Norte', label: 'Norte' },
  { value: 'Nordeste', label: 'Nordeste' },
  { value: 'Centro-Oeste', label: 'Centro-Oeste' },
  { value: 'Sudeste', label: 'Sudeste' },
  { value: 'Sul', label: 'Sul' },
  { value: 'Exterior', label: 'Exterior' },
]

const resolveRegionFromCoordinates = (lat: number, lng: number): RegionName => {
  const inBrazil = lat >= -34 && lat <= 7 && lng >= -74 && lng <= -30

  if (!inBrazil) return 'Exterior'

  if (lat < -22) return 'Sul'
  if (lat < -15) return 'Sudeste'
  if (lat < -8) return 'Centro-Oeste'
  if (lat < 0) return 'Nordeste'
  return 'Norte'
}

const brazilRegionSummary = (records: BallotRecord[]) => {
  const map: Record<RegionName, number> = {
    Norte: 0,
    Nordeste: 0,
    'Centro-Oeste': 0,
    Sudeste: 0,
    Sul: 0,
    Exterior: 0,
  }

  records.forEach((record) => {
    const region = record.region ?? 'Exterior'
    map[region] = (map[region] ?? 0) + 1
  })

  return Object.entries(map).map(([region, count]) => ({
    region: region as RegionName,
    count,
  }))
}

const getActiveBackOfficeUsers = () => {
  if (typeof window === 'undefined') return 0

  try {
    const saved = localStorage.getItem(BACKOFFICE_PRESENCE_KEY)
    if (!saved) return 0

    const parsed = JSON.parse(saved) as Record<string, { lastSeen: number }>
    const now = Date.now()
    const validEntries = Object.entries(parsed).filter(([, entry]) => entry.lastSeen > now - 30000)

    if (validEntries.length !== Object.keys(parsed).length) {
      localStorage.setItem(
        BACKOFFICE_PRESENCE_KEY,
        JSON.stringify(Object.fromEntries(validEntries)),
      )
    }

    return validEntries.length
  } catch {
    return 0
  }
}

const writeBackOfficePresence = (sessionId: string) => {
  if (typeof window === 'undefined') return

  try {
    const saved = localStorage.getItem(BACKOFFICE_PRESENCE_KEY)
    const parsed = saved ? (JSON.parse(saved) as Record<string, { lastSeen: number }>) : {}
    const next = {
      ...parsed,
      [sessionId]: {
        lastSeen: Date.now(),
      },
    }

    const cleaned = Object.fromEntries(
      Object.entries(next).filter(([, entry]) => entry.lastSeen > Date.now() - 30000),
    )

    localStorage.setItem(BACKOFFICE_PRESENCE_KEY, JSON.stringify(cleaned))
  } catch {}
}

const clearBackOfficePresence = (sessionId: string) => {
  if (typeof window === 'undefined') return

  try {
    const saved = localStorage.getItem(BACKOFFICE_PRESENCE_KEY)
    if (!saved) return

    const parsed = JSON.parse(saved) as Record<string, { lastSeen: number }>
    delete parsed[sessionId]
    localStorage.setItem(BACKOFFICE_PRESENCE_KEY, JSON.stringify(parsed))
  } catch {}
}

export default function App() {
  // Configuração e dados salvos (chave v6 com Avante Grupal)
  const [candidates, setCandidates] = useState<Candidate[]>(() => {
    if (typeof window !== 'undefined') {
      const currentSignature = getCandidatesSignature()
      const savedSignature = localStorage.getItem(CANDIDATES_SIGNATURE_KEY)
      const saved = localStorage.getItem(CANDIDATES_STORAGE_KEY)

      if (saved && savedSignature === currentSignature) {
        try {
          const parsed = JSON.parse(saved)
          if (Array.isArray(parsed) && parsed.length > 0) return parsed
        } catch {}
      }

      if (saved && savedSignature !== currentSignature) {
        localStorage.removeItem(CANDIDATES_STORAGE_KEY)
      }

      localStorage.setItem(CANDIDATES_SIGNATURE_KEY, currentSignature)
    }
    return defaultCandidates
  })

  const [electionTitle, setElectionTitle] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('urna_election_title') || 'Eleição Oficial Grupal'
    }
    return 'Eleição Oficial Grupal'
  })

  const [selectedRegion, setSelectedRegion] = useState<RegionName>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('urna_selected_region') as RegionName | null
      if (saved && regionOptions.some((option) => option.value === saved)) return saved
    }
    return 'Sudeste'
  })
  const [locationReady, setLocationReady] = useState(false)

  const [records, setRecords] = useState<BallotRecord[]>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('urna_votes_records')
      if (saved) {
        try {
          return JSON.parse(saved)
        } catch {}
      }
    }
    return []
  })

  const [backOfficePassword, setBackOfficePassword] = useState('')
  const [backOfficePasswordError, setBackOfficePasswordError] = useState('')
  const [backOfficeUnlocked, setBackOfficeUnlocked] = useState(() => {
    if (typeof window === 'undefined') return false
    return localStorage.getItem(BACKOFFICE_ACCESS_KEY) === 'true'
  })
  const [activeBackOfficeUsers, setActiveBackOfficeUsers] = useState<number>(() => getActiveBackOfficeUsers())

  const getCurrentPath = () => (typeof window !== 'undefined' ? window.location.pathname : '/')
  const [currentPath, setCurrentPath] = useState<string>(getCurrentPath)
  const isBackOfficeView = currentPath === '/backoffice'

  useEffect(() => {
    const syncPath = () => setCurrentPath(getCurrentPath())
    window.addEventListener('popstate', syncPath)
    return () => window.removeEventListener('popstate', syncPath)
  }, [])

  const navigateTo = (path: string) => {
    if (typeof window !== 'undefined') {
      window.history.pushState({}, '', path)
      setCurrentPath(path)
    }
  }

  // Modais
  const [isBoletimOpen, setIsBoletimOpen] = useState(false)
  const [isManagerOpen, setIsManagerOpen] = useState(false)

  // Configurações de som e voz
  const [soundOn, setSoundOn] = useState(false)
  const [voiceOn, setVoiceOn] = useState(false)

  // Estado da sessão de voto atual
  const [role, setRole] = useState<Role>('presidente')
  const [digits, setDigits] = useState('')
  const [isBlank, setIsBlank] = useState(false)
  const [votes, setVotes] = useState<Partial<Record<Role, Vote>>>({})
  const [isEndingAnimation, setIsEndingAnimation] = useState(false)
  const [finished, setFinished] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState('')

  const roleCandidates = candidates.filter((item) => item.role === role)
  const candidate = getCandidateByNumber(role, digits, candidates)
  const isComplete = digits.length === 2
  // Voto em branco e voto nulo são impossíveis: só pode confirmar se for um candidato válido
  const canConfirm = Boolean(candidate) && isComplete

  // Sincroniza som
  useEffect(() => {
    sounds.setSoundEnabled(false)
    sounds.setVoiceEnabled(false)
    setSoundOn(false)
    setVoiceOn(false)
  }, [])

  // Audiodescrição quando digita os 2 números
  useEffect(() => {
    if (isComplete && !isBlank) {
      if (candidate) {
        sounds.speak(`Candidato ${candidate.name}, ${candidate.group}`)
      } else {
        sounds.speak('Número não localizado. Voto nulo.')
      }
    } else if (isBlank) {
      sounds.speak('Voto em branco')
    }
  }, [digits, isBlank, candidate, isComplete])

  // Digitação de números (100% funcional via teclado na tela e teclado físico)
  const typeDigit = useCallback(
    (digit: string) => {
      if (finished || isEndingAnimation) return

      setFeedbackMsg('')

      // Se estava em branco, digitar número sai do modo branco e coloca o dígito
      if (isBlank) {
        setIsBlank(false)
        setDigits(digit)
        sounds.playKeyBeep()
        return
      }

      if (digits.length < 2) {
        sounds.playKeyBeep()
        setDigits((current) => current + digit)
      } else {
        // Já tem 2 dígitos digitados: toca bip de aviso
        sounds.playErrorBeep()
      }
    },
    [finished, isEndingAnimation, isBlank, digits]
  )

  // Botão CORRIGE (limpa tudo do cargo atual e permite redigitar)
  const correct = useCallback(() => {
    if (finished || isEndingAnimation) return
    sounds.playKeyBeep()
    setDigits('')
    setIsBlank(false)
    setFeedbackMsg('')
  }, [finished, isEndingAnimation])

  // Botão CONFIRMA
  const confirm = useCallback(() => {
    if (finished || isEndingAnimation) return

    if (!locationReady) {
      sounds.playErrorBeep()
      setFeedbackMsg('📍 Ative a geolocalização para confirmar o voto.')
      handleUseMyLocation()
      return
    }

    if (!isComplete) {
      sounds.playErrorBeep()
      setFeedbackMsg('⚠️ Digite os 2 números de um candidato válido para confirmar.')
      return
    }

    if (!candidate) {
      sounds.playErrorBeep()
      setFeedbackMsg('🚫 Candidato não localizado. Aperte CORRIGE e escolha um candidato válido.')
      return
    }

    setFeedbackMsg('')

    const currentVote: Vote = {
      kind: 'candidate',
      number: candidate.number,
      candidate,
    }

    const updatedVotes = { ...votes, [role]: currentVote }
    setVotes(updatedVotes)

    if (role === 'presidente') {
      sounds.playStepConfirm()
      setRole('vice-presidente')
      setDigits('')
      setIsBlank(false)
    } else {
      // Voto final (Vice-presidente) -> Inicia animação oficial FIM e som da urna
      setIsEndingAnimation(true)
      sounds.playUrnaFim().then(() => {
        // Registra o voto completo no histórico permanente
        const presidentCandidate =
          updatedVotes.presidente?.candidate ??
          getCandidateByNumber('presidente', '12', candidates) ??
          candidates.find((candidate) => candidate.role === 'presidente')

        const newRecord: BallotRecord = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          dateString: new Date().toLocaleString('pt-BR'),
          region: selectedRegion,
          source: 'manual',
          presidente: {
            kind: 'candidate',
            number: updatedVotes.presidente?.number ?? presidentCandidate?.number ?? '12',
            candidate: presidentCandidate,
          },
          vicePresidente: currentVote,
        }
        const newRecords = [newRecord, ...records]
        setRecords(newRecords)
        try {
          localStorage.setItem('urna_votes_records', JSON.stringify(newRecords))
        } catch {}

        setIsEndingAnimation(false)
        setRole('presidente')
        setDigits('')
        setIsBlank(false)
        setVotes({})
        setFinished(false)
        setFeedbackMsg('')
      })
    }
  }, [finished, isEndingAnimation, isComplete, candidate, digits, votes, role, records, candidates, locationReady, handleUseMyLocation])

  const restart = () => {
    sounds.playKeyBeep()
    setRole('presidente')
    setDigits('')
    setIsBlank(false)
    setVotes({})
    setFinished(false)
    setFeedbackMsg('')
  }

  // Teclado físico do computador (números, Numpad, Enter, Backspace, Esc/Delete, B)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Se algum modal estiver aberto ou o foco estiver em campo de texto, ignora
      if (isBoletimOpen || isManagerOpen) return
      const target = event.target as HTMLElement | null
      if (
        target &&
        (target.tagName === 'INPUT' ||
          target.tagName === 'SELECT' ||
          target.tagName === 'TEXTAREA')
      ) {
        return
      }

      // Números do topo e do teclado numérico (Numpad)
      if (/^[0-9]$/.test(event.key)) {
        event.preventDefault()
        typeDigit(event.key)
      } else if (
        event.code &&
        event.code.startsWith('Numpad') &&
        /^Numpad[0-9]$/.test(event.code)
      ) {
        event.preventDefault()
        const digit = event.code.replace('Numpad', '')
        typeDigit(digit)
      } else if (event.key === 'Backspace') {
        event.preventDefault()
        if (digits.length > 0) {
          sounds.playKeyBeep()
          setDigits((current) => current.slice(0, -1))
        } else if (isBlank) {
          correct()
        }
      } else if (
        event.key === 'Escape' ||
        event.key === 'Delete' ||
        event.key.toLowerCase() === 'c'
      ) {
        event.preventDefault()
        correct()
      } else if (event.key === 'Enter') {
        event.preventDefault()
        confirm()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [
    isBoletimOpen,
    isManagerOpen,
    digits,
    isBlank,
    finished,
    isEndingAnimation,
    canConfirm,
    typeDigit,
    correct,
    confirm,
  ])

  // Atualização de candidatos
  const handleUpdateCandidates = (newCandidates: Candidate[]) => {
    setCandidates(newCandidates)
    persistCandidates(newCandidates)
  }

  const handleSelectPreset = (preset: ElectionPreset) => {
    setCandidates(preset.candidates)
    setElectionTitle(preset.title)
    try {
      persistCandidates(preset.candidates)
      localStorage.setItem('urna_election_title', preset.title)
    } catch {}
    restart()
  }

  const handleClearVotes = () => {
    setRecords([])
    try {
      localStorage.removeItem('urna_votes_records')
    } catch {}
  }

  const handleOpenBackOffice = () => {
    setIsBoletimOpen(false)
    navigateTo('/backoffice')
  }

  const handleCloseBackOffice = () => {
    setIsBoletimOpen(false)
    if (backOfficeUnlocked) {
      clearBackOfficePresence(BACKOFFICE_SESSION_ID)
    }
    navigateTo('/')
  }

  const handleBackOfficeLogin = (event: React.FormEvent) => {
    event.preventDefault()

    if (backOfficePassword === BACKOFFICE_PASSWORD) {
      setBackOfficePasswordError('')
      setBackOfficeUnlocked(true)
      localStorage.setItem(BACKOFFICE_ACCESS_KEY, 'true')
      navigateTo('/backoffice')
      return
    }

    setBackOfficePasswordError('Senha incorreta. Tente novamente.')
  }

  const handleBackOfficeLogout = () => {
    setBackOfficeUnlocked(false)
    localStorage.setItem(BACKOFFICE_ACCESS_KEY, 'false')
    clearBackOfficePresence(BACKOFFICE_SESSION_ID)
    setActiveBackOfficeUsers(0)
    navigateTo('/')
  }

  useEffect(() => {
    localStorage.setItem('urna_selected_region', selectedRegion)
  }, [selectedRegion])

  useEffect(() => {
    if (!backOfficeUnlocked || !isBackOfficeView) return

    const syncPresence = () => {
      writeBackOfficePresence(BACKOFFICE_SESSION_ID)
      setActiveBackOfficeUsers(getActiveBackOfficeUsers())
    }

    const cleanup = () => {
      clearBackOfficePresence(BACKOFFICE_SESSION_ID)
      setActiveBackOfficeUsers(getActiveBackOfficeUsers())
    }

    syncPresence()

    const heartbeat = window.setInterval(syncPresence, 10000)
    const onStorage = () => setActiveBackOfficeUsers(getActiveBackOfficeUsers())
    const onPageHide = () => cleanup()
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        cleanup()
      } else {
        syncPresence()
      }
    }

    window.addEventListener('storage', onStorage)
    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibilityChange)

    return () => {
      cleanup()
      window.clearInterval(heartbeat)
      window.removeEventListener('storage', onStorage)
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }, [backOfficeUnlocked, isBackOfficeView])

  const totalVotes = records.length
  const regionCounts = brazilRegionSummary(records)

  const handleUseMyLocation = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocationReady(false)
      setSelectedRegion('Exterior')
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const region = resolveRegionFromCoordinates(
          position.coords.latitude,
          position.coords.longitude,
        )
        setSelectedRegion(region)
        setLocationReady(true)
        localStorage.setItem('urna_selected_region', region)
      },
      () => {
        setSelectedRegion('Exterior')
        setLocationReady(false)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }, [])

  useEffect(() => {
    handleUseMyLocation()
  }, [handleUseMyLocation])

  const backOfficeStats = (['presidente', 'vice-presidente'] as Role[]).map((role) => {
    const roleCandidates = candidates.filter((candidate) => candidate.role === role)
    const totals = roleCandidates
      .map((candidate) => {
        const count = records.reduce((total, record) => {
          const vote = role === 'presidente' ? record.presidente : record.vicePresidente
          if (vote.kind !== 'candidate' || !vote.candidate) {
            return total
          }

          const sameCandidate = vote.candidate.id === candidate.id

          if (sameCandidate) {
            return total + 1
          }
          return total
        }, 0)

        return {
          candidate,
          count,
          percent: totalVotes > 0 ? (count / totalVotes) * 100 : 0,
        }
      })
      .sort((a, b) => b.count - a.count)

    return {
      role,
      totals,
      winner: totals[0],
    }
  })

  const tableRoleFilter = useState<'all' | Role>('all')
  const [roleFilter, setRoleFilter] = tableRoleFilter
  const [searchTerm, setSearchTerm] = useState('')

  const voteRows = records
    .map((record, index) => {
      const presidency = record.presidente
      const vice = record.vicePresidente
      return {
        id: record.id,
        index: records.length - index,
        timestamp: record.timestamp,
        dateString: record.dateString,
        role: 'presidente' as const,
        number: presidency.kind === 'candidate' ? presidency.number : '—',
        name: presidency.kind === 'candidate' ? presidency.candidate?.name ?? '—' : 'Branco / Nulo',
        viceName: vice.kind === 'candidate' ? vice.candidate?.name ?? '—' : 'Branco / Nulo',
        viceNumber: vice.kind === 'candidate' ? vice.number : '—',
      }
    })
    .map((row) => ({
      ...row,
      role: 'presidente' as const,
    }))

  const filteredRows = voteRows.filter((row) => {
    const matchesRole = roleFilter === 'all' || roleFilter === 'presidente'
    const matchesSearch =
      searchTerm.trim() === '' ||
      row.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.number.toLowerCase().includes(searchTerm.toLowerCase()) ||
      row.viceName.toLowerCase().includes(searchTerm.toLowerCase())

    return matchesRole && matchesSearch
  })

  const hourlyVotes = Array.from({ length: 24 }, (_, hour) => {
    const count = records.filter((record) => {
      const date = new Date(record.timestamp)
      return date.getHours() === hour
    }).length

    return {
      hour,
      label: `${String(hour).padStart(2, '0')}:00`,
      count,
    }
  })

  const maxHourlyVotes = Math.max(...hourlyVotes.map((item) => item.count), 1)

  const exportCsv = () => {
    const rows = [
      ['ID', 'Data', 'Hora', 'Presidente', 'Número', 'Vice', 'Número Vice'],
      ...records.map((record) => {
        const president = record.presidente
        const vice = record.vicePresidente

        return [
          record.id,
          record.dateString,
          new Date(record.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          president.kind === 'candidate' ? president.candidate?.name ?? '—' : 'Branco / Nulo',
          president.kind === 'candidate' ? president.number : '—',
          vice.kind === 'candidate' ? vice.candidate?.name ?? '—' : 'Branco / Nulo',
          vice.kind === 'candidate' ? vice.number : '—',
        ]
      }),
    ]

    const csv = rows
      .map((cols) => cols.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'votos_backoffice.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(link.href)
  }

  if (isBackOfficeView && !backOfficeUnlocked) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.32),_transparent_22%),linear-gradient(135deg,#f8fbff_0%,#eef3ff_38%,#e7edff_100%)] text-slate-800">
        <div className="mx-auto flex min-h-screen max-w-lg items-center justify-center px-4 py-8">
          <form
            onSubmit={handleBackOfficeLogin}
            className="w-full rounded-[28px] border border-white/60 bg-white/80 p-6 shadow-[0_24px_60px_rgba(37,99,235,0.12)] backdrop-blur-xl"
          >
            <p className="text-[10px] font-black tracking-[0.28em] text-blue-600 uppercase">Acesso restrito</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-900">Back office</h1>
            <p className="mt-2 text-sm text-slate-500">Entre com a senha para ver a apuração e os usuários ativos.</p>

            <label className="mt-6 block text-xs font-black tracking-[0.18em] text-slate-500 uppercase">
              Senha
            </label>
            <input
              type="password"
              value={backOfficePassword}
              onChange={(event) => setBackOfficePassword(event.target.value)}
              placeholder="Digite a senha"
              className="mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-base text-slate-800 outline-none focus:border-blue-500"
            />

            {backOfficePasswordError && (
              <p className="mt-3 text-sm font-semibold text-rose-600">{backOfficePasswordError}</p>
            )}

            <button
              type="submit"
              className="mt-5 w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-3 text-sm font-black text-white shadow-[0_14px_28px_rgba(59,130,246,0.35)] transition hover:-translate-y-0.5"
            >
              Acessar painel
            </button>

            <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-3 text-xs text-blue-700">
              Senha padrão: <span className="font-black">{BACKOFFICE_PASSWORD}</span>
            </div>
          </form>
        </div>
      </main>
    )
  }

  if (isBackOfficeView) {
    return (
      <main className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(96,165,250,0.32),_transparent_22%),linear-gradient(135deg,#f8fbff_0%,#eef3ff_38%,#e7edff_100%)] text-slate-800">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <header className="mb-8 rounded-[30px] border border-white/60 bg-white/70 p-5 shadow-[0_24px_60px_rgba(37,99,235,0.12)] backdrop-blur-xl">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-black tracking-[0.28em] text-blue-600 uppercase">
                  Back office eleitoral
                </p>
                <h1 className="mt-2 text-3xl font-black tracking-[-0.06em] text-slate-900 md:text-4xl">
                  {electionTitle}
                </h1>
              </div>

              <div className="flex flex-wrap gap-3">
                <button
                  onClick={() => navigateTo('/')}
                  className="rounded-2xl border border-blue-200 bg-gradient-to-r from-blue-600 to-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-[0_12px_24px_rgba(59,130,246,0.35)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(59,130,246,0.4)] active:scale-[0.98]"
                >
                  Voltar para a urna
                </button>
                <button
                  onClick={exportCsv}
                  className="rounded-2xl border border-emerald-200 bg-gradient-to-r from-emerald-500 to-teal-500 px-4 py-2.5 text-sm font-black text-white shadow-[0_12px_24px_rgba(16,185,129,0.28)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(16,185,129,0.32)] active:scale-[0.98]"
                >
                  Exportar CSV
                </button>
                <button
                  onClick={() => handleClearVotes()}
                  className="rounded-2xl border border-rose-200 bg-gradient-to-r from-rose-500 to-red-500 px-4 py-2.5 text-sm font-black text-white shadow-[0_12px_24px_rgba(244,63,94,0.28)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_16px_28px_rgba(244,63,94,0.34)] active:scale-[0.98]"
                >
                  Zerar votos
                </button>
                <button
                  onClick={handleBackOfficeLogout}
                  className="rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-black text-slate-700 shadow-[0_10px_18px_rgba(148,163,184,0.15)] transition duration-200 hover:-translate-y-0.5 hover:bg-slate-50"
                >
                  Sair do back office
                </button>
              </div>
            </div>
          </header>

          <section className="mb-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-[28px] border border-slate-900/10 bg-slate-900 p-5 text-white shadow-[0_20px_44px_rgba(15,23,42,0.28)]">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold tracking-[0.24em] text-slate-300 uppercase">Total</p>
                <span className="rounded-full bg-white/10 px-2 py-1 text-[10px] font-black tracking-[0.18em] text-slate-200 uppercase">
                  Votos
                </span>
              </div>
              <p className="mt-6 text-4xl font-black tracking-[-0.06em]">{totalVotes}</p>
              <p className="mt-2 text-sm text-slate-300">Eleitorado contabilizado nesta sessão</p>
            </div>

            <div className="rounded-[28px] border border-emerald-200 bg-gradient-to-br from-emerald-500 to-teal-500 p-5 text-white shadow-[0_20px_44px_rgba(16,185,129,0.22)]">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold tracking-[0.24em] text-emerald-100 uppercase">Usuários</p>
                <span className="rounded-full bg-white/15 px-2 py-1 text-[10px] font-black tracking-[0.18em] text-emerald-50 uppercase">
                  Online
                </span>
              </div>
              <p className="mt-6 text-4xl font-black tracking-[-0.06em]">{activeBackOfficeUsers}</p>
              <p className="mt-2 text-sm text-emerald-50">Usuários ativos no painel neste momento</p>
            </div>

            {backOfficeStats.map(({ role, winner }) => {
              const leaderName = winner?.candidate.name ?? 'Sem liderança'
              const leaderPercent = winner ? winner.percent : 0
              const ringStyle = {
                background: `conic-gradient(#2563eb 0 ${leaderPercent}%, rgba(148,163,184,0.18) ${leaderPercent}% 100%)`,
              }

              return (
                <div
                  key={role}
                  className="rounded-[28px] border border-white/60 bg-white/75 p-5 shadow-[0_18px_36px_rgba(148,163,184,0.14)] backdrop-blur-md"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-[10px] font-bold tracking-[0.22em] text-slate-500 uppercase">{roleLabels[role]}</p>
                      <p className="mt-2 text-xl font-black text-slate-900">{leaderName}</p>
                    </div>
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-blue-100 bg-blue-50" style={ringStyle}>
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white text-[10px] font-black text-blue-700">
                        {leaderPercent.toFixed(0)}%
                      </div>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">
                    {winner ? `${winner.count} votos · ${winner.percent.toFixed(1)}%` : 'Sem apuração ainda'}
                  </p>
                </div>
              )
            })}
          </section>

          <section className="mb-8 grid gap-4 md:grid-cols-3">
            {regionCounts.map(({ region, count }) => (
              <div key={region} className="rounded-[24px] border border-white/60 bg-white/70 p-4 shadow-[0_16px_30px_rgba(148,163,184,0.12)] backdrop-blur-md">
                <p className="text-[10px] font-black tracking-[0.2em] text-slate-500 uppercase">{region}</p>
                <p className="mt-3 text-3xl font-black tracking-[-0.05em] text-slate-900">{count}</p>
                <p className="mt-1 text-xs text-slate-500">votos registrados</p>
              </div>
            ))}
          </section>

          <section className="mb-8 rounded-[28px] border border-white/60 bg-white/75 p-5 shadow-[0_24px_60px_rgba(148,163,184,0.12)] backdrop-blur-md">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black tracking-[0.24em] text-slate-500 uppercase">Mapa</p>
                <h3 className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-900">Distribuição por região</h3>
              </div>
              <span className="rounded-full bg-sky-100 px-3 py-1 text-[11px] font-black text-sky-700">
                {regionCounts.reduce((sum, item) => sum + item.count, 0)} votos totais
              </span>
            </div>

            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {regionCounts.map(({ region, count }) => {
                const percent = totalVotes > 0 ? (count / totalVotes) * 100 : 0
                return (
                  <div key={region} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-black text-slate-800">{region}</span>
                      <span className="font-mono text-lg font-black text-slate-900">{count}</span>
                    </div>
                    <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-slate-200">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-indigo-500"
                        style={{ width: `${Math.max(percent, count > 0 ? 12 : 0)}%` }}
                      />
                    </div>
                    <p className="mt-2 text-[11px] text-slate-500">{percent.toFixed(1)}% do total</p>
                  </div>
                )
              })}
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.4fr_0.6fr]">
            <div className="space-y-6">
              {backOfficeStats.map(({ role, totals, winner }) => (
                <section
                  key={role}
                  className="rounded-[28px] border border-white/60 bg-white/75 p-5 shadow-[0_24px_60px_rgba(148,163,184,0.15)] backdrop-blur-md"
                >
                  <div className="mb-5 flex items-center justify-between">
                    <div>
                      <p className="text-[10px] font-black tracking-[0.25em] text-slate-500 uppercase">Cargo</p>
                      <h2 className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-900">
                        {roleLabels[role]}
                      </h2>
                    </div>

                    {winner && (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-[11px] font-black text-amber-800">
                        Liderança: {winner.candidate.name}
                      </span>
                    )}
                  </div>

                  <div className="mb-4 rounded-2xl border border-slate-200 bg-slate-50 p-3">
                    <div className="mb-2 flex items-center justify-between text-[11px] font-black uppercase tracking-[0.15em] text-slate-500">
                      <span>Gráfico por candidato</span>
                      <span>{totals.reduce((sum, item) => sum + item.count, 0)} votos</span>
                    </div>
                    <div className="flex h-16 items-end gap-2">
                      {totals.map(({ candidate, count }) => (
                        <div key={candidate.id} className="flex flex-1 flex-col items-center justify-end gap-1">
                          <div className="w-full rounded-t-xl bg-gradient-to-t from-blue-600 via-indigo-500 to-cyan-400" style={{ height: `${Math.max((count / Math.max(totalVotes, 1)) * 100, count > 0 ? 18 : 6)}%` }} />
                          <div className="text-center">
                            <p className="font-mono text-[10px] font-black text-slate-700">{count}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-3">
                    {totals.map(({ candidate, count, percent }) => (
                      <div key={candidate.id} className="rounded-2xl border border-slate-200 bg-slate-50/80 p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-base font-black text-slate-800">{candidate.name}</p>
                            <p className="truncate text-[11px] text-slate-500">{candidate.group}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-2xl font-black text-slate-900">{count}</p>
                            <p className="text-[11px] text-slate-500">{percent.toFixed(1)}%</p>
                          </div>
                        </div>

                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 via-indigo-500 to-cyan-500"
                            style={{ width: `${Math.min(percent, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}
            </div>

            <aside className="rounded-[28px] border border-white/60 bg-slate-900 p-5 text-white shadow-[0_24px_60px_rgba(15,23,42,0.18)]">
              <p className="text-[10px] font-black tracking-[0.28em] text-slate-300 uppercase">Resumo executivo</p>
              <h3 className="mt-3 text-2xl font-black tracking-[-0.05em]">Apuração ativa</h3>

              <div className="mt-5 rounded-2xl border border-white/10 bg-white/5 p-4">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <span className="text-[10px] font-black tracking-[0.2em] text-slate-300 uppercase">Localização ativa</span>
                </div>

                <select
                  value={selectedRegion}
                  onChange={(event) => setSelectedRegion(event.target.value as RegionName)}
                  className="w-full rounded-xl border border-white/10 bg-slate-800 px-3 py-2 text-sm font-semibold text-slate-100 outline-none focus:border-cyan-400"
                >
                  {regionOptions.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="mt-6 space-y-4">
                {backOfficeStats.map(({ role, totals, winner }) => (
                  <div key={role} className="rounded-2xl border border-white/10 bg-white/5 p-3">
                    <div className="mb-2 flex items-center justify-between gap-2">
                      <span className="text-[11px] font-black tracking-[0.2em] text-slate-300 uppercase">
                        {roleLabels[role]}
                      </span>
                      <span className="rounded-full bg-emerald-500/15 px-2 py-1 text-[10px] font-black text-emerald-300">
                        {winner ? 'Líder' : 'Sem voto'}
                      </span>
                    </div>

                    <p className="text-base font-black text-white">{winner?.candidate.name ?? 'Sem candidato'}</p>
                    <p className="mt-1 text-sm text-slate-300">
                      {winner ? `${winner.count} votos` : 'Nenhum voto computado'}
                    </p>

                    <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-slate-700">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500"
                        style={{ width: `${Math.min(winner ? winner.percent : 0, 100)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4">
                <p className="text-[10px] font-black tracking-[0.22em] text-indigo-200 uppercase">Ranking</p>
                <div className="mt-3 space-y-2">
                  {backOfficeStats
                    .flatMap(({ role, totals }) =>
                      totals.slice(0, 2).map((item, index) => ({
                        role,
                        item,
                        index,
                      })),
                    )
                    .map(({ role, item, index }) => (
                      <div key={`${role}-${item.candidate.id}`} className="flex items-center justify-between text-sm text-slate-100">
                        <span>
                          {index + 1}. {item.candidate.name}
                        </span>
                        <span className="font-mono font-black">{item.count}</span>
                      </div>
                    ))}
                </div>
              </div>

              <div className="mt-6 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4">
                <p className="text-[10px] font-black tracking-[0.22em] text-cyan-200 uppercase">Votos por horário</p>
                <div className="mt-4 flex h-32 items-end gap-2">
                  {hourlyVotes.map(({ hour, count }) => (
                    <div key={hour} className="flex flex-1 flex-col items-center justify-end gap-2">
                      <div
                        className="w-full rounded-t-lg bg-gradient-to-t from-cyan-500 via-sky-500 to-blue-400"
                        style={{ height: `${Math.max((count / maxHourlyVotes) * 100, count > 0 ? 12 : 4)}%` }}
                      />
                      <span className="text-[9px] font-bold text-slate-300">{hour}</span>
                    </div>
                  ))}
                </div>
              </div>
            </aside>
          </section>

          <section className="mt-8 rounded-[28px] border border-white/60 bg-white/75 p-5 shadow-[0_24px_60px_rgba(148,163,184,0.12)] backdrop-blur-md">
            <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <div>
                <p className="text-[10px] font-black tracking-[0.28em] text-slate-500 uppercase">Tabela</p>
                <h3 className="mt-1 text-2xl font-black tracking-[-0.05em] text-slate-900">Registro de votos</h3>
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  value={roleFilter}
                  onChange={(event) => setRoleFilter(event.target.value as 'all' | Role)}
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400"
                >
                  <option value="all">Todos</option>
                  <option value="presidente">Presidente</option>
                  <option value="vice-presidente">Vice-presidente</option>
                </select>

                <input
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                  placeholder="Filtrar por nome ou número"
                  className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm text-slate-700 outline-none focus:border-blue-400"
                />
              </div>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-100 text-slate-700">
                  <tr>
                    <th className="px-4 py-3 font-black uppercase tracking-[0.12em] text-[10px]">#</th>
                    <th className="px-4 py-3 font-black uppercase tracking-[0.12em] text-[10px]">Data</th>
                    <th className="px-4 py-3 font-black uppercase tracking-[0.12em] text-[10px]">Região</th>
                    <th className="px-4 py-3 font-black uppercase tracking-[0.12em] text-[10px]">Presidente</th>
                    <th className="px-4 py-3 font-black uppercase tracking-[0.12em] text-[10px]">Vice</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredRows.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-4 py-8 text-center text-slate-500">
                        Nenhum registro encontrado com esse filtro.
                      </td>
                    </tr>
                  ) : (
                    filteredRows.map((row) => (
                      <tr key={row.id} className="border-t border-slate-200 bg-white hover:bg-slate-50">
                        <td className="px-4 py-3 font-mono font-black text-slate-700">{row.index}</td>
                        <td className="px-4 py-3 text-slate-600">{row.dateString}</td>
                        <td className="px-4 py-3 text-slate-700 font-bold">{records.find((record) => record.id === row.id)?.region ?? '—'}</td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">{row.name}</div>
                          <div className="text-[11px] text-slate-500">Número: {row.number}</div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-bold text-slate-800">{row.viceName}</div>
                          <div className="text-[11px] text-slate-500">Número: {row.viceNumber}</div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[#eef4ff] text-[#0a1c3b] flex flex-col justify-between">
      <div className="blue-grid pointer-events-none fixed inset-0" />

      {/* Cabeçalho simplificado */}
      <header className="relative z-10 border-b border-[#b9c9e7] bg-white/70 px-4 sm:px-8 backdrop-blur-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#0a2c68] text-sm font-black text-white shadow-sm">
              G
            </div>
            <div>
              <p className="text-[9px] font-black tracking-[0.2em] text-[#54709f] uppercase">
                Eleição oficial
              </p>
              <p className="text-lg leading-none font-black tracking-[-0.03em] text-[#092863]">
                {electionTitle.toUpperCase()}
                <span className="text-[#2f73df]">.</span>
              </p>
            </div>
          </div>
        </div>
      </header>

      {/* Conteúdo Principal */}
      <section className="relative z-10 mx-auto max-w-7xl px-4 py-6 sm:px-8 lg:py-8 flex-1 w-full">
        <div className="mb-6 flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <span className="mb-2 inline-block text-[11px] font-bold tracking-[0.15em] text-[#3970c4] uppercase">
              Faça a sua escolha · Simulação Urna Eletrônica
            </span>
            <h1 className="text-3xl leading-none font-black tracking-[-0.05em] text-[#071d46] sm:text-4xl">
              {electionTitle}
            </h1>
            <p className="mt-2 max-w-xl text-xs sm:text-sm leading-5 text-[#5c6f91]">
              Vote para <b>Presidente</b> e depois para <b>Vice-presidente</b>. Digite os 2 números no teclado e aperte <b>CONFIRMA</b>. Se errar, aperte <b>CORRIGE</b>.
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-white/80 p-3 shadow-sm">
            <div>
              <p className="text-[9px] font-black tracking-[0.18em] text-slate-500 uppercase">Localização</p>
              <select
                value={selectedRegion}
                onChange={(event) => setSelectedRegion(event.target.value as RegionName)}
                className="mt-1 rounded-xl border border-slate-200 bg-white px-2 py-1.5 text-xs font-bold text-slate-700 outline-none focus:border-blue-400"
              >
                {regionOptions.map(({ value, label }) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center gap-2" aria-label="Progresso da votação">
            <Step active={role === 'presidente' && !finished} done={Boolean(votes.presidente)} number="01">
              Presidente
            </Step>
            <span className="h-px w-5 bg-[#b3c5e5]" />
            <Step
              active={role === 'vice-presidente' && !finished}
              done={Boolean(votes['vice-presidente'])}
              number="02"
            >
              Vice-presidente
            </Step>
          </div>
        </div>

        <div className="grid items-start gap-6">
          <div className="urna-shell order-1 mx-auto w-full max-w-[920px]">
            <div className="flex items-center justify-between border-b border-[#8da4cd]/45 px-5 py-3.5 sm:px-7">
              <div className="flex items-center gap-3">
                <div className="brand-seal" aria-hidden="true">
                  <i />
                </div>
                <div>
                  <p className="text-[9px] font-bold tracking-[0.19em] text-[#6980a7] uppercase">
                    Tribunal da Votação
                  </p>
                  <p className="text-base font-black tracking-[-0.02em] text-[#102c61] sm:text-lg">
                    URNA ELETRÔNICA OFICIAL
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="hidden rounded-md border border-[#9db1d2]/60 bg-white/45 px-2 py-1 font-mono text-[9px] font-semibold text-[#61769a] sm:block">
                  SESSÃO ATIVA · UE-2026
                </span>
              </div>
            </div>

            <div className="grid gap-5 p-4 sm:p-6 md:grid-cols-[1.28fr_0.72fr] md:gap-6">
              <section className="screen-panel relative overflow-hidden" aria-live="polite">
                {isEndingAnimation ? (
                  <div className="flex h-full min-h-[350px] flex-col items-center justify-center text-center animate-fade-in">
                    <div className="mb-2 flex items-center gap-2 text-xs font-bold tracking-widest text-[#2c72df] uppercase animate-pulse">
                      <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-ping" />
                      GRAVANDO VOTO...
                    </div>
                    <h2 className="text-7xl sm:text-8xl font-black tracking-widest text-[#0c2a63] uppercase drop-shadow-sm">
                      F I M
                    </h2>
                    <p className="mt-4 text-xs font-bold text-[#5c739b] tracking-wider uppercase">
                      Voto computado com sucesso na urna
                    </p>
                  </div>
                ) : (
                  <VotingScreen
                    role={role}
                    digits={digits}
                    isBlank={isBlank}
                    candidate={candidate}
                    isComplete={isComplete}
                    feedbackMsg={feedbackMsg}
                  />
                )}
              </section>

              <section className="keypad-panel select-none" aria-label="Teclado numérico">
                <div className="mb-3 flex items-center justify-between px-1 text-[8px] font-bold tracking-[0.13em] text-[#8da9d5] uppercase">
                  <span>Digite 2 números</span>
                  <span>{role === 'presidente' ? 'Etapa 1/2' : 'Etapa 2/2'}</span>
                </div>
                <div className="keypad-grid">
                  {keypad.slice(0, 9).map((num) => (
                    <Key
                      key={num}
                      number={num}
                      hasBrailleDot={num === '5'}
                      onClick={() => typeDigit(num)}
                    />
                  ))}
                  <div />
                  <Key number="0" onClick={() => typeDigit('0')} />
                </div>
                <div className="mt-5 grid grid-cols-[1fr_1.12fr] items-end gap-2">
                  <button
                    type="button"
                    className="action-key correct-key active:scale-95"
                    onClick={correct}
                    title="Apagar números e recomeçar este cargo"
                  >
                    Corrige
                  </button>
                  <button
                    type="button"
                    className={`action-key confirm-key active:scale-95 ${
                      !canConfirm ? 'opacity-50 cursor-not-allowed brightness-75' : ''
                    }`}
                    onClick={confirm}
                    title={
                      canConfirm
                        ? 'Confirmar voto no candidato'
                        : 'Escolha um candidato válido para liberar o Confirma'
                    }
                  >
                    Confirma
                  </button>
                </div>
              </section>
            </div>
          </div>

          <aside className="order-2 mx-auto grid w-full max-w-[920px] gap-4 sm:grid-cols-2">
            {(['presidente', 'vice-presidente'] as Role[]).map((candidateRole) => {
              const isCurrentRole = role === candidateRole && !finished
              return (
                <section
                  key={candidateRole}
                  className={`candidate-category transition-all ${
                    isCurrentRole
                      ? 'candidate-category-active ring-2 ring-blue-500/30'
                      : 'opacity-85'
                  }`}
                >
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[9px] font-bold tracking-[0.16em] text-[#7190c1] uppercase">
                        Guia de Candidatos
                      </p>
                      <h2 className="mt-0.5 text-base font-black tracking-tight text-[#0a2c68]">
                        {roleLabels[candidateRole]}
                      </h2>
                    </div>
                    {votes[candidateRole] ? (
                      <span className="rounded-full bg-[#e6efff] px-2.5 py-1 text-[9px] font-bold text-[#2261c5] uppercase">
                        ✓ Votado
                      </span>
                    ) : isCurrentRole ? (
                      <span className="rounded-full bg-blue-600 text-white px-2.5 py-0.5 text-[9px] font-bold uppercase animate-pulse">
                        Em Votação
                      </span>
                    ) : null}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    {candidates
                      .filter((item) => item.role === candidateRole)
                      .map((item) => (
                        <div
                          key={item.id}
                          className={`candidate-mini transition cursor-pointer ${
                            isCurrentRole
                              ? 'hover:border-blue-400 hover:shadow-xs active:scale-98'
                              : 'cursor-not-allowed opacity-60'
                          }`}
                          onClick={() => {
                            if (isCurrentRole && !isEndingAnimation) {
                              setDigits(item.number)
                              setIsBlank(false)
                              sounds.playKeyBeep()
                              setFeedbackMsg('')
                            } else if (!isCurrentRole && !finished) {
                              setFeedbackMsg(
                                `ℹ️ Conclua primeiro a etapa de ${roleLabels[role]} antes de votar em ${item.name}!`
                              )
                              sounds.playErrorBeep()
                            }
                          }}
                          title={
                            isCurrentRole
                              ? `Clique para preencher o número ${item.number} na urna`
                              : `Candidato para a etapa de ${roleLabels[candidateRole]}`
                          }
                        >
                          <img src={item.photo} alt={item.name} className="candidate-mini-photo" />
                          <span className="min-w-0 flex-1 text-left">
                            <b className="block truncate text-[11px] text-[#152f5d]">{item.name}</b>
                            <small className="mt-0.5 block truncate text-[9px] text-[#7890b5]">
                              {item.group}
                            </small>
                          </span>
                          <strong className="font-mono text-sm text-blue-700">{item.number}</strong>
                        </div>
                      ))}
                  </div>
                </section>
              )
            })}
          </aside>
        </div>
      </section>

      {/* Rodapé Informativo */}
      <footer className="relative z-10 border-t border-[#c6d5ec] bg-white/60 py-3 px-4 text-center text-xs text-[#58729c]">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-center gap-2">
          <span>
            Urna Eletrônica Interativa · Simulador educacional e oficial de eleições
          </span>
        </div>
      </footer>

      {/* Modais */}
      <BoletimModal
        isOpen={isBackOfficeView || isBoletimOpen}
        onClose={isBackOfficeView ? handleCloseBackOffice : () => setIsBoletimOpen(false)}
        records={records}
        candidates={candidates}
        onClearVotes={handleClearVotes}
        electionTitle={electionTitle}
        initialTab={isBackOfficeView ? 'backoffice' : 'boletim'}
      />

      {backOfficeUnlocked && (
        <CandidateManagerModal
          isOpen={isManagerOpen}
          onClose={() => setIsManagerOpen(false)}
          candidates={candidates}
          onUpdateCandidates={handleUpdateCandidates}
          onSelectPreset={handleSelectPreset}
        />
      )}
    </main>
  )
}

function Step({
  active,
  done,
  number,
  children,
}: {
  active: boolean
  done: boolean
  number: string
  children: React.ReactNode
}) {
  return (
    <div className={`vote-step ${active ? 'vote-step-active' : ''}`}>
      <span>{done ? '✓' : number}</span>
      <b>{children}</b>
    </div>
  )
}

function VotingScreen({
  role,
  digits,
  isBlank,
  candidate,
  isComplete,
  feedbackMsg,
}: {
  role: Role
  digits: string
  isBlank: boolean
  candidate?: Candidate
  isComplete: boolean
  feedbackMsg?: string
}) {
  return (
    <div className="flex h-full min-h-[350px] flex-col justify-between">
      <div>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-[9px] font-bold tracking-[0.18em] text-[#60799f] uppercase">
              Seu voto para
            </p>
            <h2 className="mt-1 text-2xl font-black tracking-tight text-[#0a2a62] uppercase">
              {roleLabels[role]}
            </h2>
          </div>
          <span className="screen-status">
            <i />
            Em votação
          </span>
        </div>

        <div className="mt-5 flex items-start gap-3">
          <span className="pt-3 text-[10px] font-bold tracking-[0.1em] text-[#6680aa] uppercase">
            Número
          </span>
          <div className="flex gap-2">
            {[0, 1].map((index) => {
              const digit = isBlank ? '' : digits[index]
              const isCurrent = !isBlank && digits.length === index
              return (
                <span
                  key={index}
                  className={`digit-box transition-all ${
                    isCurrent
                      ? 'border-[#1e5ec6] ring-2 ring-blue-400/40 bg-white shadow-xs'
                      : ''
                  }`}
                >
                  {digit ? (
                    digit
                  ) : isCurrent ? (
                    <span className="animate-pulse text-blue-500 font-light">|</span>
                  ) : (
                    ''
                  )}
                </span>
              )
            })}
          </div>
        </div>
      </div>

      {feedbackMsg && (
        <div className="my-2 rounded-lg bg-amber-50 p-2 text-[11px] font-bold text-amber-800 border border-amber-200 animate-fade-in text-center">
          {feedbackMsg}
        </div>
      )}

      <div className="my-3 flex flex-1 items-end">
        {candidate ? (
          <div className="flex w-full items-end gap-4 animate-fade-in">
            <img
              src={candidate.photo}
              alt={`Foto de ${candidate.name}`}
              className="h-32 w-26 shrink-0 rounded-md border-2 border-white object-cover object-top shadow-md"
            />
            <div className="min-w-0 pb-1">
              <p className="text-[9px] font-bold tracking-[0.14em] text-[#7890b4] uppercase">
                Candidato(a)
              </p>
              <p className="mt-0.5 text-xl leading-tight font-black tracking-tight text-[#102c61] uppercase">
                {candidate.name}
              </p>
              <p className="mt-2 text-xs font-semibold text-[#58719b]">{candidate.group}</p>
            </div>
          </div>
        ) : isComplete ? (
          <VoteMessage
            title="NÚMERO INVÁLIDO"
            subtitle="Candidato não localizado. Voto nulo é proibido nesta eleição! Aperte CORRIGE e digite um candidato válido."
          />
        ) : (
          <p className="mb-1 text-[11px] leading-5 text-[#7186a7]">
            Use o teclado numérico ao lado ou no seu computador para digitar os 2 números.
          </p>
        )}
      </div>

      <div className="mt-3 border-t border-[#9dafcc]/65 pt-2.5 text-[9px] leading-4 text-[#60789d]">
        <p>
          Aperte a tecla: <b className="text-emerald-700">VERDE</b> para CONFIRMAR CANDIDATO ·{' '}
          <b className="text-amber-700">LARANJA</b> para CORRIGIR
        </p>
      </div>
    </div>
  )
}

function VoteMessage({ title, subtitle }: { title: string; subtitle?: string }) {
  return (
    <div className="w-full border-y-2 border-[#193b72] py-4 text-center animate-fade-in">
      <p className="text-2xl font-black tracking-[0.12em] text-[#102e62] uppercase">{title}</p>
      {subtitle && <p className="mt-1.5 text-[9px] font-semibold text-[#7084a5]">{subtitle}</p>}
    </div>
  )
}

function FinalScreen({
  votes,
  restart,
}: {
  votes: Partial<Record<Role, Vote>>
  restart: () => void
}) {
  return (
    <div className="flex min-h-[350px] flex-col justify-between animate-fade-in">
      <div>
        <div className="flex items-center gap-3 border-b border-[#9db1d0] pb-3">
          <span className="final-check">✓</span>
          <div>
            <p className="text-xl font-black tracking-tight text-[#0c2c67]">Votação Concluída</p>
            <p className="text-[9px] font-bold tracking-[0.12em] text-[#6d83a8] uppercase">
              Voto registrado e salvo no Boletim de Urna
            </p>
          </div>
        </div>
        <div className="my-4 grid gap-2.5">
          {(['presidente', 'vice-presidente'] as Role[]).map((itemRole) => {
            const vote = votes[itemRole]
            return (
              <div key={itemRole} className="result-card">
                <div>
                  <small>{roleLabels[itemRole]}</small>
                  <b>
                    {vote?.kind === 'candidate'
                      ? vote.candidate?.name
                      : vote?.kind === 'blank'
                        ? 'Voto em branco'
                        : 'Voto nulo'}
                  </b>
                </div>
                <strong>{vote?.number || '—'}</strong>
              </div>
            )
          })}
        </div>
      </div>
      <button
        onClick={restart}
        className="w-full rounded-lg bg-blue-600 py-3 text-xs font-bold text-white shadow-md hover:bg-blue-700 transition"
      >
        🗳️ Iniciar Nova Votação (Próximo Eleitor)
      </button>
    </div>
  )
}

function Key({
  number,
  onClick,
  hasBrailleDot,
}: {
  number: string
  onClick: () => void
  hasBrailleDot?: boolean
}) {
  return (
    <button
      type="button"
      className="number-key relative active:scale-95"
      onClick={onClick}
      aria-label={`Número ${number}`}
    >
      {number}
      {hasBrailleDot && (
        <span
          className="absolute bottom-1.5 left-1/2 -translate-x-1/2 h-1 w-1 rounded-full bg-slate-300 opacity-80"
          title="Ponto tátil de acessibilidade"
        />
      )}
    </button>
  )
}
