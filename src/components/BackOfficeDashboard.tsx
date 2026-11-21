import { useMemo, useState } from 'react'
import type { BallotRecord, Candidate, ElectionPreset, RegionName, Role, Vote } from '../types'
import { CandidateManagerModal } from './CandidateManagerModal'

type TokenItem = {
  token: string
  label: string
  used: boolean
  usedAt?: number
}

type CandidateResult = {
  candidate: Candidate
  count: number
  percent: number
}

type RoleResult = {
  role: Role
  totals: CandidateResult[]
  winner?: CandidateResult
}

type RegionTotal = {
  region: RegionName
  count: number
}

type BackOfficeDashboardProps = {
  electionTitle: string
  totalVotes: number
  activeUsers: number
  stats: RoleResult[]
  regionCounts: RegionTotal[]
  records: BallotRecord[]
  tokens: TokenItem[]
  candidates: Candidate[]
  managerOpen: boolean
  onManagerOpen: () => void
  onManagerClose: () => void
  onUpdateCandidates: (candidates: Candidate[]) => void
  onSelectPreset: (preset: ElectionPreset) => void
  onGoToUrna: () => void
  onLogout: () => void
  onExportCsv: () => void
  onClearVotes: () => void
  onCreateToken: () => void
  onCreateTokenBatch: () => void
  onClearTokens: () => void
}

const regions: RegionName[] = ['Norte', 'Nordeste', 'Centro-Oeste', 'Sudeste', 'Sul', 'Exterior']

const roleLabels: Record<Role, string> = {
  'vice-presidente': 'Vice-presidente',
  presidente: 'Presidente',
}

const getVoteLabel = (vote: Vote) => {
  if (vote.kind === 'candidate') {
    return {
      name: vote.candidate?.name ?? 'Candidato não identificado',
      number: vote.number || '—',
    }
  }

  return {
    name: vote.kind === 'blank' ? 'Voto em branco' : 'Voto nulo',
    number: '—',
  }
}

const navigation = [
  { href: '#overview', label: 'Visão geral', number: '01' },
  { href: '#apuracao', label: 'Apuração', number: '02' },
  { href: '#regioes', label: 'Regiões e horários', number: '03' },
  { href: '#registros', label: 'Registro de votos', number: '04' },
  { href: '#tokens', label: 'Títulos eleitorais', number: '05' },
]

export function BackOfficeDashboard({
  electionTitle,
  totalVotes,
  activeUsers,
  stats,
  regionCounts,
  records,
  tokens,
  candidates,
  managerOpen,
  onManagerOpen,
  onManagerClose,
  onUpdateCandidates,
  onSelectPreset,
  onGoToUrna,
  onLogout,
  onExportCsv,
  onClearVotes,
  onCreateToken,
  onCreateTokenBatch,
  onClearTokens,
}: BackOfficeDashboardProps) {
  const [regionFilter, setRegionFilter] = useState<RegionName | 'all'>('all')
  const [voteSearch, setVoteSearch] = useState('')
  const [tokenSearch, setTokenSearch] = useState('')
  const [tokenFilter, setTokenFilter] = useState<'all' | 'available' | 'used'>('all')
  const [copyFeedback, setCopyFeedback] = useState<{ token: string; status: 'copied' | 'error' } | null>(null)

  const usedTokens = tokens.filter((token) => token.used).length
  const availableTokens = tokens.length - usedTokens
  const tokenUsage = tokens.length ? Math.round((usedTokens / tokens.length) * 100) : 0
  const availabilityPercent = tokens.length ? 100 - tokenUsage : 0
  const recordNumbers = useMemo(
    () => new Map(records.map((record, index) => [record.id, records.length - index] as const)),
    [records],
  )

  const filteredRecords = useMemo(() => {
    const query = voteSearch.trim().toLowerCase()
    return records.filter((record) => {
      const vice = getVoteLabel(record.vicePresidente)
      const president = getVoteLabel(record.presidente)
      const region = record.region ?? 'Exterior'
      const matchesRegion = regionFilter === 'all' || region === regionFilter
      const matchesQuery =
        !query ||
        [vice.name, vice.number, president.name, president.number, region, record.dateString]
          .some((value) => value.toLowerCase().includes(query))
      return matchesRegion && matchesQuery
    })
  }, [records, regionFilter, voteSearch])

  const filteredTokens = useMemo(() => {
    const query = tokenSearch.trim().toLowerCase()
    return tokens.filter((token) => {
      const matchesStatus = tokenFilter === 'all' || (tokenFilter === 'used' ? token.used : !token.used)
      const matchesQuery = !query || token.token.toLowerCase().includes(query) || token.label.toLowerCase().includes(query)
      return matchesStatus && matchesQuery
    })
  }, [tokens, tokenFilter, tokenSearch])

  const hourlyVotes = useMemo(
    () => Array.from({ length: 24 }, (_, hour) => ({
      hour,
      count: records.filter((record) => new Date(record.timestamp).getHours() === hour).length,
    })),
    [records],
  )
  const maxHourlyVotes = Math.max(...hourlyVotes.map((item) => item.count), 1)

  const copyToken = async (token: string) => {
    try {
      await navigator.clipboard.writeText(token)
      setCopyFeedback({ token, status: 'copied' })
      window.setTimeout(() => setCopyFeedback((current) => current?.token === token ? null : current), 1800)
    } catch {
      setCopyFeedback({ token, status: 'error' })
      window.setTimeout(() => setCopyFeedback((current) => current?.token === token ? null : current), 1800)
    }
  }

  return (
    <main className="min-h-screen bg-[#f3f5f9] text-slate-900">
      <div className="mx-auto min-h-screen max-w-[1680px] lg:grid lg:grid-cols-[248px_minmax(0,1fr)]">
        <aside className="hidden h-screen flex-col bg-[#111d33] px-5 py-6 text-white lg:sticky lg:top-0 lg:flex">
          <a href="#overview" className="flex items-center gap-3 px-2" aria-label="Ir ao início do painel">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-blue-500 text-lg font-black shadow-lg shadow-blue-950/30">U</span>
            <span>
              <span className="block text-sm font-black tracking-wide">URNA</span>
              <span className="mt-0.5 block text-[10px] font-semibold tracking-[0.16em] text-slate-400 uppercase">Central eleitoral</span>
            </span>
          </a>

          <div className="mt-10 px-3 text-[10px] font-black tracking-[0.18em] text-slate-500 uppercase">Painel</div>
          <nav className="mt-3 space-y-1" aria-label="Navegação do back office">
            {navigation.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-300 transition hover:bg-white/8 hover:text-white"
              >
                <span className="font-mono text-[10px] text-slate-500 group-hover:text-blue-300">{item.number}</span>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="mt-auto space-y-3">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_12px_rgba(52,211,153,0.75)]" />
                Painel ativo
              </div>
              <p className="mt-2 text-xs leading-5 text-slate-400">Dados salvos neste navegador e atualizados em tempo real.</p>
            </div>
            <button onClick={onGoToUrna} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-300 transition hover:bg-white/8 hover:text-white">
              ← Voltar para a urna
            </button>
            <button onClick={onLogout} className="w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold text-slate-400 transition hover:bg-rose-500/10 hover:text-rose-200">
              Sair do back office
            </button>
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 px-4 py-3 backdrop-blur-xl sm:px-6 lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-[#111d33] text-sm font-black text-white lg:hidden">U</span>
                <div>
                  <p className="text-[10px] font-black tracking-[0.16em] text-slate-500 uppercase">Back office eleitoral</p>
                  <p className="text-sm font-black text-slate-900 sm:text-base">{electionTitle}</p>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <button onClick={onManagerOpen} className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700 sm:px-4 sm:text-sm">
                  Gerenciar urna
                </button>
                <button onClick={onExportCsv} className="rounded-xl bg-blue-700 px-3 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-blue-800 sm:px-4 sm:text-sm">
                  Exportar CSV
                </button>
                <button onClick={onLogout} className="rounded-xl px-3 py-2 text-xs font-bold text-slate-500 transition hover:bg-rose-50 hover:text-rose-700 sm:text-sm lg:hidden">
                  Sair
                </button>
              </div>
            </div>
            <nav className="mt-3 flex gap-1 overflow-x-auto lg:hidden" aria-label="Navegação do painel">
              {navigation.map((item) => (
                <a key={item.href} href={item.href} className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 hover:text-blue-700">
                  {item.label}
                </a>
              ))}
              <button onClick={onGoToUrna} className="shrink-0 rounded-lg px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100">Voltar à urna</button>
            </nav>
          </header>

          <div className="mx-auto max-w-[1350px] space-y-6 p-4 sm:p-6 lg:p-8">
            <section id="overview" className="scroll-mt-28 rounded-3xl bg-[#172844] p-6 text-white shadow-[0_16px_40px_rgba(15,23,42,0.14)] sm:p-8">
              <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
                <div>
                  <p className="text-[10px] font-black tracking-[0.2em] text-blue-200 uppercase">Visão geral da eleição</p>
                  <h1 className="mt-3 max-w-3xl text-3xl font-black tracking-[-0.05em] sm:text-4xl">Apuração em tempo real</h1>
                  <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-300">
                    Acompanhe os votos, a distribuição regional e os títulos eleitorais desta sessão.
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="rounded-full border border-emerald-300/20 bg-emerald-400/10 px-3 py-1.5 text-xs font-bold text-emerald-200">
                    ● Sessão ativa
                  </span>
                  <button
                    onClick={() => {
                      if (records.length === 0) return
                      if (window.confirm('Apagar todos os registros de votos? Os títulos eleitorais não serão alterados.')) onClearVotes()
                    }}
                    disabled={records.length === 0}
                    className="rounded-xl border border-white/15 bg-white/5 px-3.5 py-2.5 text-xs font-bold text-slate-200 transition hover:border-rose-300/40 hover:bg-rose-400/10 hover:text-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Apagar registros
                  </button>
                </div>
              </div>
            </section>

            <section aria-label="Indicadores da eleição" className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <MetricCard label="Votos apurados" value={totalVotes} caption="Cédulas registradas" accent="blue" />
              <MetricCard label="Títulos emitidos" value={tokens.length} caption="Tokens gerados para eleitores" accent="violet" />
              <MetricCard label="Disponíveis" value={availableTokens} caption={`${usedTokens} já utilizados`} accent="emerald" />
              <MetricCard label="Painel online" value={activeUsers} caption="Sessões administrativas ativas" accent="amber" />
            </section>

            <section id="apuracao" className="scroll-mt-28 space-y-4">
              <SectionHeading eyebrow="Resultados" title="Apuração por cargo" detail="Parciais calculadas a partir dos votos registrados." />
              <div className="grid gap-4 xl:grid-cols-2">
                {stats.map(({ role, totals, winner }) => (
                  <article key={role} className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                    <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-100 pb-4">
                      <div>
                        <p className="text-[10px] font-black tracking-[0.16em] text-slate-500 uppercase">Cargo · {role === 'vice-presidente' ? '01' : '02'}</p>
                        <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">{roleLabels[role]}</h2>
                      </div>
                      {winner && winner.count > 0 ? (
                        <span className="rounded-full bg-emerald-50 px-3 py-1.5 text-xs font-bold text-emerald-700">Líder parcial</span>
                      ) : (
                        <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">Aguardando votos</span>
                      )}
                    </div>
                    {totals.length === 0 ? (
                      <p className="py-8 text-center text-sm text-slate-500">Nenhum candidato cadastrado para este cargo.</p>
                    ) : (
                      <div className="mt-4 space-y-4">
                        {totals.map(({ candidate, count, percent }, index) => (
                          <div key={candidate.id} className="flex items-center gap-3">
                            <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg font-mono text-[10px] font-black ${index === 0 && count > 0 ? 'bg-blue-700 text-white' : 'bg-slate-100 text-slate-500'}`}>
                              {String(index + 1).padStart(2, '0')}
                            </span>
                            <img src={candidate.photo} alt="" className="h-11 w-10 shrink-0 rounded-lg bg-slate-100 object-cover object-top" />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-baseline justify-between gap-3">
                                <p className="truncate text-sm font-bold text-slate-800">{candidate.name}</p>
                                <p className="shrink-0 font-mono text-sm font-black text-slate-900">{count} <span className="text-[10px] font-semibold text-slate-400">({percent.toFixed(1)}%)</span></p>
                              </div>
                              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100">
                                <div className={`h-full rounded-full ${index === 0 && count > 0 ? 'bg-blue-600' : 'bg-slate-300'}`} style={{ width: `${Math.min(percent, 100)}%` }} />
                              </div>
                              <p className="mt-1 text-[10px] text-slate-500">Nº {candidate.number} · {candidate.group}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            </section>

            <section id="regioes" className="scroll-mt-28 grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <SectionHeading eyebrow="Origem dos votos" title="Distribuição por região" detail={`${totalVotes} cédulas contabilizadas`} />
                <div className="mt-6 space-y-4">
                  {regionCounts.map(({ region, count }) => {
                    const percent = totalVotes ? (count / totalVotes) * 100 : 0
                    return (
                      <div key={region}>
                        <div className="mb-1.5 flex items-center justify-between gap-3 text-sm">
                          <span className="font-semibold text-slate-700">{region}</span>
                          <span className="font-mono text-xs font-bold text-slate-500">{count} <span className="text-slate-400">· {percent.toFixed(1)}%</span></span>
                        </div>
                        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
                          <div className="h-full rounded-full bg-blue-600 transition-all" style={{ width: `${percent}%` }} />
                        </div>
                      </div>
                    )
                  })}
                </div>
              </article>

              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <SectionHeading eyebrow="Volume de participação" title="Votos por horário" detail="Distribuição por hora local" />
                <div className="mt-7 flex h-44 items-end gap-1.5 sm:gap-2" role="img" aria-label="Gráfico de votos registrados por hora do dia">
                  {hourlyVotes.map(({ hour, count }) => (
                    <div key={hour} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" title={`${String(hour).padStart(2, '0')}:00 · ${count} votos`}>
                      <div className="flex w-full flex-1 items-end">
                        <div className={`w-full rounded-t-md ${count > 0 ? 'bg-blue-600' : 'bg-slate-100'}`} style={{ height: `${count ? Math.max((count / maxHourlyVotes) * 100, 8) : 4}%` }} />
                      </div>
                      {(hour % 4 === 0) && <span className="text-[9px] font-medium text-slate-400">{String(hour).padStart(2, '0')}</span>}
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-[11px] text-slate-500">Cada coluna representa uma hora; passe o cursor para ver o total.</p>
              </article>
            </section>

            <section id="registros" className="scroll-mt-28 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
              <div className="flex flex-col gap-4 border-b border-slate-100 p-5 sm:p-6 lg:flex-row lg:items-end lg:justify-between">
                <SectionHeading eyebrow="Auditoria" title="Registro de votos" detail="Consulte cédulas individuais com região e horário." />
                <div className="grid gap-2 sm:grid-cols-[minmax(220px,1fr)_190px]">
                  <label className="sr-only" htmlFor="vote-search">Pesquisar votos</label>
                  <input
                    id="vote-search"
                    value={voteSearch}
                    onChange={(event) => setVoteSearch(event.target.value)}
                    placeholder="Buscar candidato, número ou região"
                    className="min-w-0 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-sm outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-50"
                  />
                  <label className="sr-only" htmlFor="region-filter">Filtrar por região</label>
                  <select
                    id="region-filter"
                    value={regionFilter}
                    onChange={(event) => setRegionFilter(event.target.value as RegionName | 'all')}
                    className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:bg-white"
                  >
                    <option value="all">Todas as regiões</option>
                    {regions.map((region) => <option key={region} value={region}>{region}</option>)}
                  </select>
                </div>
              </div>
              <div className="flex items-center justify-between px-5 py-3 text-xs text-slate-500 sm:px-6">
                <span>{filteredRecords.length} de {records.length} registros</span>
                <button onClick={onExportCsv} className="font-bold text-blue-700 hover:text-blue-900">Baixar CSV</button>
              </div>
              <div className="overflow-x-auto">
                <table className="min-w-[760px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[10px] font-black tracking-[0.12em] text-slate-500 uppercase">
                    <tr>
                      <th className="px-5 py-3">Nº</th>
                      <th className="px-5 py-3">Data e hora</th>
                      <th className="px-5 py-3">Região</th>
                      <th className="px-5 py-3">Vice-presidente</th>
                      <th className="px-5 py-3">Presidente</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredRecords.length === 0 ? (
                      <tr><td colSpan={5} className="px-5 py-12 text-center text-sm text-slate-500">{records.length ? 'Nenhum voto corresponde a estes filtros.' : 'Os votos registrados aparecerão aqui.'}</td></tr>
                    ) : filteredRecords.map((record) => {
                      const vice = getVoteLabel(record.vicePresidente)
                      const president = getVoteLabel(record.presidente)
                      return (
                        <tr key={record.id} className="hover:bg-slate-50/80">
                          <td className="px-5 py-4 font-mono text-xs font-bold text-slate-500">{recordNumbers.get(record.id)}</td>
                          <td className="whitespace-nowrap px-5 py-4 text-xs text-slate-600">{record.dateString}</td>
                          <td className="px-5 py-4"><span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">{record.region ?? 'Exterior'}</span></td>
                          <td className="px-5 py-4"><VoteCell name={vice.name} number={vice.number} /></td>
                          <td className="px-5 py-4"><VoteCell name={president.name} number={president.number} /></td>
                        </tr>
                      )
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            <section id="tokens" className="scroll-mt-28 space-y-4">
              <article className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm sm:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <SectionHeading eyebrow="Acesso do eleitor" title="Títulos eleitorais" detail="Tokens de uso único para liberar cada sessão de votação." />
                  <div className="flex flex-wrap gap-2">
                    <button onClick={onCreateToken} className="rounded-xl bg-blue-700 px-3.5 py-2.5 text-xs font-bold text-white transition hover:bg-blue-800">+ Gerar token</button>
                    <button onClick={onCreateTokenBatch} className="rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 transition hover:border-blue-300 hover:text-blue-700">Gerar 10</button>
                    <button
                      onClick={onClearTokens}
                      disabled={tokens.length === 0}
                      className="rounded-xl border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs font-bold text-rose-700 transition hover:bg-rose-100 disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Limpar tokens
                    </button>
                  </div>
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <TokenMetric label="Emitidos" value={tokens.length} />
                  <TokenMetric label="Utilizados" value={usedTokens} />
                  <div className="rounded-xl bg-emerald-50 p-4">
                    <div className="flex items-center justify-between text-xs font-semibold text-emerald-800"><span>Disponíveis</span><span>{availableTokens}</span></div>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-emerald-100"><div className="h-full rounded-full bg-emerald-500" style={{ width: `${availabilityPercent}%` }} /></div>
                    <p className="mt-2 text-[10px] text-emerald-700">{availabilityPercent}% ainda não utilizados</p>
                  </div>
                </div>
              </article>

              <article className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
                <div className="flex flex-col gap-3 border-b border-slate-100 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div>
                    <h3 className="text-sm font-black text-slate-900">Tokens gerados</h3>
                    <p className="mt-1 text-xs text-slate-500">{filteredTokens.length} exibidos de {tokens.length}</p>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-[minmax(200px,1fr)_150px]">
                    <label className="sr-only" htmlFor="token-search">Pesquisar tokens</label>
                    <input
                      id="token-search"
                      value={tokenSearch}
                      onChange={(event) => setTokenSearch(event.target.value)}
                      placeholder="Buscar token ou eleitor"
                      className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none focus:border-blue-400 focus:bg-white"
                    />
                    <label className="sr-only" htmlFor="token-filter">Filtrar tokens</label>
                    <select id="token-filter" value={tokenFilter} onChange={(event) => setTokenFilter(event.target.value as typeof tokenFilter)} className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400">
                      <option value="all">Todos os estados</option>
                      <option value="available">Disponíveis</option>
                      <option value="used">Utilizados</option>
                    </select>
                  </div>
                </div>
                {filteredTokens.length === 0 ? (
                  <div className="px-5 py-12 text-center text-sm text-slate-500">
                    {tokens.length ? 'Nenhum token corresponde a estes filtros.' : 'Ainda não existem tokens. Gere um token para começar.'}
                  </div>
                ) : (
                  <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
                    {filteredTokens.map((token) => (
                      <div key={token.token} className={`rounded-xl border p-4 ${token.used ? 'border-slate-200 bg-slate-50' : 'border-blue-100 bg-blue-50/60'}`}>
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className={`font-mono text-base font-black tracking-[0.16em] ${token.used ? 'text-slate-500' : 'text-blue-800'}`}>{token.token}</p>
                            <p className="mt-1 truncate text-xs font-semibold text-slate-700">{token.label}</p>
                          </div>
                          <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${token.used ? 'bg-slate-200 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>
                            {token.used ? 'Utilizado' : 'Disponível'}
                          </span>
                        </div>
                        <p className="mt-3 text-[10px] text-slate-500">
                          {token.used && token.usedAt ? `Utilizado em ${new Date(token.usedAt).toLocaleString('pt-BR')}` : 'Pronto para ser entregue ao eleitor'}
                        </p>
                        <button
                          type="button"
                          onClick={() => void copyToken(token.token)}
                          className="mt-2 text-[11px] font-bold text-blue-700 transition hover:text-blue-900"
                          aria-label={`Copiar token ${token.token}`}
                        >
                          {copyFeedback?.token === token.token
                            ? copyFeedback.status === 'copied' ? 'Copiado' : 'Não foi possível copiar'
                            : 'Copiar token'}
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            </section>

            <footer className="pb-4 pt-1 text-center text-[11px] text-slate-400">
              {electionTitle} · Central de apuração
            </footer>
          </div>
        </div>
      </div>

      <CandidateManagerModal
        isOpen={managerOpen}
        onClose={onManagerClose}
        candidates={candidates}
        onUpdateCandidates={onUpdateCandidates}
        onSelectPreset={onSelectPreset}
      />
    </main>
  )
}

function SectionHeading({ eyebrow, title, detail }: { eyebrow: string; title: string; detail: string }) {
  return (
    <div>
      <p className="text-[10px] font-black tracking-[0.16em] text-blue-700 uppercase">{eyebrow}</p>
      <h2 className="mt-1 text-xl font-black tracking-tight text-slate-900">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-slate-500">{detail}</p>
    </div>
  )
}

function MetricCard({ label, value, caption, accent }: { label: string; value: number; caption: string; accent: 'blue' | 'violet' | 'emerald' | 'amber' }) {
  const styles = {
    blue: 'bg-blue-50 text-blue-700',
    violet: 'bg-violet-50 text-violet-700',
    emerald: 'bg-emerald-50 text-emerald-700',
    amber: 'bg-amber-50 text-amber-700',
  }
  return (
    <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-bold text-slate-500">{label}</p>
        <span className={`grid h-9 w-9 place-items-center rounded-xl text-xs font-black ${styles[accent]}`} aria-hidden="true">●</span>
      </div>
      <p className="mt-4 text-3xl font-black tracking-[-0.05em] text-slate-900">{value}</p>
      <p className="mt-1 text-[11px] text-slate-500">{caption}</p>
    </article>
  )
}

function TokenMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-slate-50 p-4">
      <div className="flex items-center justify-between text-xs font-semibold text-slate-600"><span>{label}</span><span className="font-mono text-lg font-black text-slate-900">{value}</span></div>
    </div>
  )
}

function VoteCell({ name, number }: { name: string; number: string }) {
  return (
    <div>
      <p className="font-bold text-slate-800">{name}</p>
      <p className="mt-0.5 text-[11px] text-slate-500">Número {number}</p>
    </div>
  )
}
