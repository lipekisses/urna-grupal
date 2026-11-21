import { useEffect, useState, useCallback } from 'react'
import type { BallotRecord, Candidate, ElectionPreset, RegionName, Role, Vote } from './types'
import { defaultCandidates } from './candidates'
import { sounds } from './sound'
import { BoletimModal } from './components/BoletimModal'
import { CandidateManagerModal } from './components/CandidateManagerModal'
import { BackOfficeDashboard } from './components/BackOfficeDashboard'

const keypad = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']
const CANDIDATES_STORAGE_KEY = 'urna_candidates_list_v9'
const CANDIDATES_SIGNATURE_KEY = 'urna_candidates_signature'
const BACKOFFICE_PASSWORD = 'admin123'
const BACKOFFICE_ACCESS_KEY = 'urna_backoffice_access'
const BACKOFFICE_PRESENCE_KEY = 'urna_backoffice_presence'
const BACKOFFICE_SESSION_ID = `${Date.now()}-${Math.random().toString(16).slice(2)}`
const TOKENS_STORAGE_KEY = 'urna_voter_tokens'

// 🗳️ Modo Somente Vice-Presidente — coloca true para ocultar tudo de presidente
const VP_ONLY_MODE = true

// Tipos de token de eleitor
type VoterToken = {
  token: string
  label: string
  used: boolean
  usedAt?: number
}

const generateToken = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let result = ''
  for (let i = 0; i < 8; i++) {
    if (i === 4) result += '-'
    result += chars[Math.floor(Math.random() * chars.length)]
  }
  return result
}

const loadTokens = (): VoterToken[] => {
  try {
    const saved = localStorage.getItem(TOKENS_STORAGE_KEY)
    if (saved) return JSON.parse(saved)
  } catch {}
  return []
}

const saveTokens = (tokens: VoterToken[]) => {
  try {
    localStorage.setItem(TOKENS_STORAGE_KEY, JSON.stringify(tokens))
  } catch {}
}

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
  const [role, setRole] = useState<Role>('vice-presidente')
  const [digits, setDigits] = useState('')
  const [isBlank, setIsBlank] = useState(false)
  const [votes, setVotes] = useState<Partial<Record<Role, Vote>>>({})
  const [isEndingAnimation, setIsEndingAnimation] = useState(false)
  const [finished, setFinished] = useState(false)
  const [feedbackMsg, setFeedbackMsg] = useState('')

  // Sistema de mesário / tokens
  const [tokens, setTokens] = useState<VoterToken[]>(() => loadTokens())
  const [mesarioPhase, setMesarioPhase] = useState<'waiting' | 'voting'>('waiting')
  const [tokenInput, setTokenInput] = useState('')
  const [tokenError, setTokenError] = useState('')
  const [currentVoterToken, setCurrentVoterToken] = useState<string | null>(null)
  const [isRegionModalOpen, setIsRegionModalOpen] = useState(false)
  const [regionDraft, setRegionDraft] = useState<RegionName | ''>('')

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
    if (finished || isEndingAnimation || isRegionModalOpen) return

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

    if (role === 'vice-presidente' && !VP_ONLY_MODE) {
      sounds.playStepConfirm()
      setRole('presidente')
      setDigits('')
      setIsBlank(false)
    } else {
      // Voto final → Inicia animação oficial FIM e som da urna
      setIsEndingAnimation(true)
      sounds.playUrnaFim().then(() => {
        // Registra o voto completo no histórico permanente
        const viceCandidate =
          updatedVotes['vice-presidente']?.candidate ??
          candidates.find((candidate) => candidate.role === 'vice-presidente')

        const newRecord: BallotRecord = {
          id: Date.now().toString(),
          timestamp: Date.now(),
          dateString: new Date().toLocaleString('pt-BR'),
          region: selectedRegion,
          source: 'manual',
          presidente: VP_ONLY_MODE
            ? { kind: 'blank', number: '' }
            : currentVote,
          vicePresidente: VP_ONLY_MODE
            ? currentVote
            : {
                kind: 'candidate',
                number: updatedVotes['vice-presidente']?.number ?? viceCandidate?.number ?? '',
                candidate: viceCandidate,
              },
        }
        const newRecords = [newRecord, ...records]
        setRecords(newRecords)
        try {
          localStorage.setItem('urna_votes_records', JSON.stringify(newRecords))
        } catch {}

        // Marca o token como usado
        if (currentVoterToken) {
          const updatedTokens = tokens.map((t) =>
            t.token === currentVoterToken ? { ...t, used: true, usedAt: Date.now() } : t
          )
          setTokens(updatedTokens)
          saveTokens(updatedTokens)
        }

        setIsEndingAnimation(false)
        setRole('vice-presidente')
        setDigits('')
        setIsBlank(false)
        setVotes({})
        setFinished(false)
        setFeedbackMsg('')
        setIsRegionModalOpen(false)
        setRegionDraft('')
        // Volta para a tela de mesário para o próximo eleitor
        setMesarioPhase('waiting')
        setTokenInput('')
        setTokenError('')
        setCurrentVoterToken(null)
      })
    }
  }, [finished, isEndingAnimation, isRegionModalOpen, isComplete, candidate, digits, votes, role, records, candidates, selectedRegion, currentVoterToken, tokens])

  // Validação do token do título de eleitor
  const handleTokenSubmit = useCallback((event: React.FormEvent) => {
    event.preventDefault()
    const normalized = tokenInput.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '')
    if (!normalized) {
      setTokenError('Por favor, digite o token do seu título de eleitor.')
      return
    }

    const currentTokens = loadTokens()
    const found = currentTokens.find((t) => t.token === normalized)

    if (!found) {
      setTokenError('Token não encontrado. Verifique e tente novamente.')
      return
    }
    if (found.used) {
      setTokenError('Este título já foi utilizado para votar nesta eleição.')
      return
    }

    // Token válido — libera a votação
    setCurrentVoterToken(normalized)
    setTokenError('')
    setRegionDraft('')
    setMesarioPhase('voting')
    setIsRegionModalOpen(true)
  }, [tokenInput])

  const handleRegionConfirm = () => {
    if (!regionDraft) return
    setSelectedRegion(regionDraft)
    localStorage.setItem('urna_selected_region', regionDraft)
    setIsRegionModalOpen(false)
  }

  const handleRegionBack = () => {
    setIsRegionModalOpen(false)
    setRegionDraft('')
    setCurrentVoterToken(null)
    setTokenInput('')
    setMesarioPhase('waiting')
  }

  const restart = () => {
    sounds.playKeyBeep()
    setRole('vice-presidente')
    setDigits('')
    setIsBlank(false)
    setVotes({})
    setFinished(false)
    setFeedbackMsg('')
    setMesarioPhase('waiting')
    setTokenInput('')
    setTokenError('')
    setCurrentVoterToken(null)
    setRegionDraft('')
    setIsRegionModalOpen(false)
  }

  // Teclado físico do computador (números, Numpad, Enter, Backspace, Esc/Delete, B)
  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      // Se algum modal estiver aberto ou o foco estiver em campo de texto, ignora
      if (isBoletimOpen || isManagerOpen || isRegionModalOpen) return
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
    isRegionModalOpen,
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

  const backOfficeStats = (['vice-presidente', 'presidente'] as Role[]).map((role) => {
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

  const exportCsv = () => {
    const rows = [
      ['ID', 'Data', 'Hora', 'Região', 'Vice-presidente', 'Nº vice', 'Presidente', 'Nº presidente'],
      ...records.map((record) => {
        const president = record.presidente
        const vice = record.vicePresidente

        return [
          record.id,
          record.dateString,
          new Date(record.timestamp).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
          record.region ?? 'Exterior',
          vice.kind === 'candidate' ? vice.candidate?.name ?? '—' : 'Branco / Nulo',
          vice.kind === 'candidate' ? vice.number : '—',
          president.kind === 'candidate' ? president.candidate?.name ?? '—' : 'Branco / Nulo',
          president.kind === 'candidate' ? president.number : '—',
        ]
      }),
    ]

    const csv = rows
      .map((cols) => cols.map((value) => `"${String(value).replace(/"/g, '""')}"`).join(','))
      .join('\n')

    const blob = new Blob(['\uFEFF', csv], { type: 'text/csv;charset=utf-8;' })
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
      <main className="min-h-screen bg-[#f3f5f9] px-4 text-slate-800">
        <div className="mx-auto flex min-h-screen max-w-lg flex-col items-center justify-center py-8">
          <form
            onSubmit={handleBackOfficeLogin}
            className="w-full rounded-3xl border border-slate-200 bg-white p-7 shadow-[0_24px_70px_rgba(15,23,42,0.10)] sm:p-9"
          >
            <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-2xl bg-[#172844] text-lg font-black text-white shadow-lg shadow-slate-900/15">U</div>
            <p className="text-[10px] font-black tracking-[0.2em] text-blue-700 uppercase">Acesso administrativo</p>
            <h1 className="mt-2 text-3xl font-black tracking-[-0.05em] text-slate-900">Back office</h1>
            <p className="mt-2 text-sm leading-6 text-slate-500">Entre para acompanhar a apuração, os registros e os títulos eleitorais.</p>

            <label htmlFor="backoffice-password" className="mt-6 block text-xs font-bold text-slate-700">
              Senha
            </label>
            <input
              id="backoffice-password"
              type="password"
              value={backOfficePassword}
              onChange={(event) => setBackOfficePassword(event.target.value)}
              placeholder="Digite a senha"
              autoComplete="current-password"
              className="mt-2 w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-50"
            />

            {backOfficePasswordError && (
              <p role="alert" className="mt-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">{backOfficePasswordError}</p>
            )}

            <button
              type="submit"
              className="mt-5 w-full rounded-xl bg-blue-700 px-4 py-3 text-sm font-black text-white shadow-sm transition hover:bg-blue-800 focus-visible:outline-blue-500"
            >
              Acessar painel
            </button>
          </form>
          <button onClick={() => navigateTo('/')} className="mt-5 text-sm font-semibold text-slate-500 transition hover:text-blue-700">← Voltar para a urna</button>
        </div>
      </main>
    )
  }

  if (isBackOfficeView) {
    return (
      <BackOfficeDashboard
        electionTitle={electionTitle}
        totalVotes={totalVotes}
        activeUsers={activeBackOfficeUsers}
        stats={backOfficeStats}
        regionCounts={regionCounts}
        records={records}
        tokens={tokens}
        candidates={candidates}
        managerOpen={isManagerOpen}
        onManagerOpen={() => setIsManagerOpen(true)}
        onManagerClose={() => setIsManagerOpen(false)}
        onUpdateCandidates={handleUpdateCandidates}
        onSelectPreset={handleSelectPreset}
        onGoToUrna={() => navigateTo('/')}
        onLogout={handleBackOfficeLogout}
        onExportCsv={exportCsv}
        onClearVotes={handleClearVotes}
        onCreateToken={() => {
          const newToken: VoterToken = {
            token: generateToken(),
            label: `Eleitor ${tokens.length + 1}`,
            used: false,
          }
          const updated = [newToken, ...tokens]
          setTokens(updated)
          saveTokens(updated)
        }}
        onCreateTokenBatch={() => {
          const batch = Array.from({ length: 10 }, (_, index) => ({
            token: generateToken(),
            label: `Eleitor ${tokens.length + index + 1}`,
            used: false,
          }))
          const updated = [...batch, ...tokens]
          setTokens(updated)
          saveTokens(updated)
        }}
        onClearTokens={() => {
          if (!tokens.length || !window.confirm('Apagar todos os tokens? Esta ação não pode ser desfeita.')) return
          setTokens([])
          saveTokens([])
        }}
      />
    )
  }
  if (mesarioPhase === 'waiting' && !isBackOfficeView) {
    return (
      <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#f6faff_0%,_#e3edff_30%,_#bfd1fb_63%,_#dfeaff_100%)] text-[#0a1c3b]">
        <div className="blue-grid pointer-events-none fixed inset-0" />
        <MesarioScreen
          tokenInput={tokenInput}
          tokenError={tokenError}
          onTokenChange={(v) => { setTokenInput(v); setTokenError('') }}
          onSubmit={handleTokenSubmit}
          electionTitle={electionTitle}
        />
      </main>
    )
  }

  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top,_#f6faff_0%,_#e3edff_30%,_#bfd1fb_63%,_#dfeaff_100%)] text-[#0a1c3b] flex flex-col justify-between">
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
              {VP_ONLY_MODE
                ? <>Vote para <b>Vice-presidente</b>. Digite os 2 números no teclado e aperte <b>CONFIRMA</b>. Se errar, aperte <b>CORRIGE</b>.</>
                : <>Vote para <b>Vice-presidente</b> e depois para <b>Presidente</b>. Digite os 2 números no teclado e aperte <b>CONFIRMA</b>. Se errar, aperte <b>CORRIGE</b>.</>
              }
            </p>
          </div>

          <div className="flex items-center gap-3 rounded-2xl border border-blue-200 bg-white/80 p-3 shadow-sm">
            <div>
              <p className="text-[9px] font-black tracking-[0.18em] text-slate-500 uppercase">Região do eleitor</p>
              <p className="mt-1 text-sm font-black text-slate-800">{selectedRegion}</p>
            </div>
          </div>

          <div className="flex items-center gap-2" aria-label="Progresso da votação">
            <Step active={role === 'vice-presidente' && !finished} done={Boolean(votes['vice-presidente'])} number="01">
              Vice-presidente
            </Step>
            {!VP_ONLY_MODE && (
              <>
                <span className="h-px w-5 bg-[#b3c5e5]" />
                <Step
                  active={role === 'presidente' && !finished}
                  done={Boolean(votes.presidente)}
                  number="02"
                >
                  Presidente
                </Step>
              </>
            )}
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
                  <span>{VP_ONLY_MODE ? 'Vice-presidente' : (role === 'vice-presidente' ? 'Etapa 1/2' : 'Etapa 2/2')}</span>
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
            {(['vice-presidente', 'presidente'] as Role[]).filter((r) => !VP_ONLY_MODE || r === 'vice-presidente').map((candidateRole) => {
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

      {isRegionModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 px-4 py-8 backdrop-blur-sm">
          <section
            role="dialog"
            aria-modal="true"
            aria-labelledby="region-dialog-title"
            className="w-full max-w-md rounded-[28px] border border-white/70 bg-white p-6 shadow-[0_32px_90px_rgba(2,12,36,0.35)] sm:p-8"
          >
            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-blue-50 text-blue-700">
              <svg className="h-6 w-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 21s7-4.35 7-11a7 7 0 1 0-14 0c0 6.65 7 11 7 11Z" />
                <circle cx="12" cy="10" r="2.25" />
              </svg>
            </div>
            <p className="text-[10px] font-black tracking-[0.2em] text-blue-600 uppercase">Antes de votar</p>
            <h2 id="region-dialog-title" className="mt-2 text-2xl font-black tracking-tight text-[#0a2c68]">
              Selecione sua região
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">
              Escolha a região onde seu voto será registrado para iniciar a votação.
            </p>

            <label htmlFor="voter-region" className="mt-6 mb-2 block text-xs font-black tracking-wide text-slate-700 uppercase">
              Região eleitoral
            </label>
            <select
              id="voter-region"
              autoFocus
              value={regionDraft}
              onChange={(event) => setRegionDraft(event.target.value as RegionName | '')}
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm font-bold text-slate-800 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100"
            >
              <option value="" disabled>Selecione uma região</option>
              {regionOptions.map(({ value, label }) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={handleRegionBack}
                className="rounded-2xl border border-slate-200 px-5 py-3 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Voltar
              </button>
              <button
                type="button"
                onClick={handleRegionConfirm}
                disabled={!regionDraft}
                className="rounded-2xl bg-blue-700 px-5 py-3 text-sm font-black text-white shadow-lg shadow-blue-900/15 transition hover:bg-blue-800 disabled:cursor-not-allowed disabled:opacity-45"
              >
                Continuar para votação
              </button>
            </div>
          </section>
        </div>
      )}

    </main>
  )
}

// ─── Tela de Mesário ────────────────────────────────────────────────────────
function MesarioScreen({
  tokenInput,
  tokenError,
  onTokenChange,
  onSubmit,
  electionTitle,
}: {
  tokenInput: string
  tokenError: string
  onTokenChange: (value: string) => void
  onSubmit: (event: React.FormEvent) => void
  electionTitle: string
}) {
  return (
    <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 py-10">
      {/* Carimbo decorativo de fundo */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center opacity-[0.04]">
        <svg viewBox="0 0 200 200" className="w-[480px]" fill="none">
          <circle cx="100" cy="100" r="95" stroke="#0a2c68" strokeWidth="6" />
          <circle cx="100" cy="100" r="78" stroke="#0a2c68" strokeWidth="2" strokeDasharray="4 3" />
          <text x="100" y="88" textAnchor="middle" fontWeight="900" fontSize="13" fill="#0a2c68" fontFamily="sans-serif">REPÚBLICA FEDERATIVA</text>
          <text x="100" y="105" textAnchor="middle" fontWeight="900" fontSize="13" fill="#0a2c68" fontFamily="sans-serif">DO BRASIL</text>
          <text x="100" y="122" textAnchor="middle" fontWeight="700" fontSize="10" fill="#0a2c68" fontFamily="sans-serif">TÍTULO ELEITORAL</text>
        </svg>
      </div>

      <div className="relative w-full max-w-sm">
        {/* Badge do mesário */}
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0a2c68] shadow-lg">
            <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <div>
            <p className="text-[9px] font-black tracking-[0.2em] text-[#54709f] uppercase">Seção Eleitoral</p>
            <p className="text-sm font-black text-[#092863]">{electionTitle}</p>
          </div>
        </div>

        {/* Card principal */}
        <div className="rounded-[28px] border border-white/70 bg-white/85 p-7 shadow-[0_32px_80px_rgba(37,99,235,0.14)] backdrop-blur-xl">
          {/* Avatar do mesário */}
          <div className="mb-5 flex flex-col items-center text-center">
            <div className="mb-3 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-blue-100 to-indigo-200 ring-4 ring-white shadow-md">
              <svg className="h-8 w-8 text-[#1e3f7a]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-[10px] font-bold tracking-[0.18em] text-[#5c7ba0] uppercase">Mesário</p>
            <h2 className="mt-1 text-xl font-black leading-tight text-[#0a2a62]">
              Por favor, apresente seu<br />título de eleitor
            </h2>
            <p className="mt-2 text-xs leading-5 text-[#6880a0]">
              Digite o <b>código do token</b> que você recebeu do mesário para liberar o acesso à urna.
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-4">
            <div>
              <label className="mb-1.5 block text-[10px] font-black tracking-[0.18em] text-[#4a6080] uppercase">
                Token do Título
              </label>
              <input
                type="text"
                value={tokenInput}
                onChange={(e) => onTokenChange(e.target.value)}
                placeholder="Ex: ABCD-1234"
                autoFocus
                autoComplete="off"
                spellCheck={false}
                className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-center font-mono text-xl font-black tracking-[0.3em] text-[#0a2c68] outline-none transition focus:border-blue-500 focus:bg-white focus:ring-2 focus:ring-blue-200 uppercase placeholder:text-slate-300 placeholder:font-normal placeholder:tracking-normal placeholder:text-sm"
                maxLength={9}
              />
            </div>

            {tokenError && (
              <div className="animate-fade-in rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-center text-sm font-semibold text-rose-700">
                {tokenError}
              </div>
            )}

            <button
              type="submit"
              className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 py-3.5 text-sm font-black text-white shadow-[0_14px_32px_rgba(59,130,246,0.38)] transition duration-200 hover:-translate-y-0.5 hover:shadow-[0_18px_36px_rgba(59,130,246,0.44)] active:scale-[0.98]"
            >
              Validar e Votar →
            </button>
          </form>
        </div>

        <p className="mt-4 text-center text-[10px] text-[#7a90b4]">
          Acesso controlado · Tokens gerados pelo mesário no painel de administração
        </p>
      </div>
    </div>
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
          {(['vice-presidente', 'presidente'] as Role[]).filter((r) => !VP_ONLY_MODE || r === 'vice-presidente').map((itemRole) => {
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
