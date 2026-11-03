import { useEffect, useState } from 'react'
import type { BallotRecord, Candidate, Role } from '../types'

const roleLabels: Record<Role, string> = {
  presidente: 'Presidente',
  'vice-presidente': 'Vice-presidente',
}

interface BoletimModalProps {
  isOpen: boolean
  onClose: () => void
  records: BallotRecord[]
  candidates: Candidate[]
  onClearVotes: () => void
  electionTitle: string
  initialTab?: 'boletim' | 'backoffice' | 'zeresima' | 'auditoria'
}

export function BoletimModal({
  isOpen,
  onClose,
  records,
  candidates,
  onClearVotes,
  electionTitle,
  initialTab = 'boletim',
}: BoletimModalProps) {
  const [activeTab, setActiveTab] = useState<'boletim' | 'backoffice' | 'zeresima' | 'auditoria'>(initialTab)
  const [confirmClear, setConfirmClear] = useState(false)

  useEffect(() => {
    setActiveTab(initialTab)
  }, [initialTab])

  if (!isOpen) return null

  // Cálculo da apuração para Presidente
  const totalVotes = records.length

  const calcRoleStats = (role: Role) => {
    const roleCandidates = candidates.filter((c) => c.role === role)
    const voteCounts: Record<string, number> = {}
    let blankCount = 0
    let nullCount = 0

    // Inicializa candidatos com 0
    roleCandidates.forEach((c) => {
      voteCounts[c.number] = 0
    })

    records.forEach((rec) => {
      const vote = role === 'presidente' ? rec.presidente : rec.vicePresidente
      if (vote.kind === 'blank') {
        blankCount++
      } else if (vote.kind === 'null') {
        nullCount++
      } else if (vote.kind === 'candidate' && vote.number) {
        voteCounts[vote.number] = (voteCounts[vote.number] || 0) + 1
      }
    })

    const candidateResults = roleCandidates
      .map((c) => {
        const count = voteCounts[c.number] || 0
        const percent = totalVotes > 0 ? ((count / totalVotes) * 100).toFixed(1) : '0.0'
        return {
          candidate: c,
          count,
          percent: parseFloat(percent),
        }
      })
      .sort((a, b) => b.count - a.count)

    const blankPercent = totalVotes > 0 ? ((blankCount / totalVotes) * 100).toFixed(1) : '0.0'
    const nullPercent = totalVotes > 0 ? ((nullCount / totalVotes) * 100).toFixed(1) : '0.0'

    return {
      candidateResults,
      blankCount,
      blankPercent,
      nullCount,
      nullPercent,
      winner: candidateResults[0]?.count > 0 ? candidateResults[0].candidate : null,
    }
  }

  const presStats = calcRoleStats('presidente')
  const viceStats = calcRoleStats('vice-presidente')

  const backOfficeStats = (['presidente', 'vice-presidente'] as Role[]).map((role) => {
    const roleCandidates = candidates.filter((candidate) => candidate.role === role)
    const totals = roleCandidates.map((candidate) => {
      const count = records.reduce((total, record) => {
        const vote = role === 'presidente' ? record.presidente : record.vicePresidente
        if (vote.kind === 'candidate' && vote.candidate?.id === candidate.id) {
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

    return {
      role,
      totals: totals.sort((a, b) => b.count - a.count),
    }
  })

  const handlePrint = () => {
    window.print()
  }

  const handleExportJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(records, null, 2))
    const downloadAnchor = document.createElement('a')
    downloadAnchor.setAttribute('href', dataStr)
    downloadAnchor.setAttribute('download', `boletim_urna_${Date.now()}.json`)
    document.body.appendChild(downloadAnchor)
    downloadAnchor.click()
    downloadAnchor.remove()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative max-h-[92vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col border border-slate-200">
        {/* Cabeçalho do Modal */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white font-black text-sm shadow-md shadow-blue-500/20">
              BU
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">
                Boletim de Urna Eletrônica
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                {electionTitle} · Total de Votos: <span className="font-bold text-blue-600">{totalVotes}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
            aria-label="Fechar modal"
          >
            ✕
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('boletim')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 ${
              activeTab === 'boletim'
                ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📊 Boletim & Apuração
          </button>
          <button
            onClick={() => setActiveTab('backoffice')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 ${
              activeTab === 'backoffice'
                ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🧾 Back Office
          </button>
          <button
            onClick={() => setActiveTab('zeresima')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 ${
              activeTab === 'zeresima'
                ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            📜 Zerésima
          </button>
          <button
            onClick={() => setActiveTab('auditoria')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 ${
              activeTab === 'auditoria'
                ? 'border-blue-600 text-blue-700 bg-white shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            🗳️ Registro de Votos ({records.length})
          </button>
        </div>

        {/* Conteúdo rolável */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeTab === 'boletim' && (
            <div className="space-y-6">
              {totalVotes === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
                  <div className="text-3xl mb-2">🗳️</div>
                  <h3 className="font-bold text-slate-700 text-sm">Nenhum voto registrado ainda</h3>
                  <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                    Realize votos na urna para visualizar a apuração em tempo real, percentuais e o vencedor da eleição.
                  </p>
                </div>
              ) : (
                <>
                  {/* Apuração Presidente */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                      <div>
                        <span className="text-[10px] font-bold text-blue-600 tracking-wider uppercase">
                          Cargo Majoritário
                        </span>
                        <h3 className="text-base font-black text-slate-800">Presidente</h3>
                      </div>
                      {presStats.winner && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-[11px] font-bold text-amber-800 border border-amber-200">
                          🏆 Líder: {presStats.winner.name} ({presStats.winner.number})
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      {presStats.candidateResults.map(({ candidate, count, percent }) => (
                        <div key={candidate.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="flex items-center gap-2 text-slate-800">
                              <span className="font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                {candidate.number}
                              </span>
                              {candidate.name}
                              <span className="text-[10px] text-slate-400 font-normal">({candidate.group})</span>
                            </span>
                            <span className="text-slate-700 font-mono">
                              <b>{count}</b> voto{count !== 1 ? 's' : ''} ({percent}%)
                            </span>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      ))}

                      {/* Brancos e Nulos Desativados */}
                      <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="text-slate-500 text-[10px] font-semibold block uppercase">Brancos</span>
                          <span className="font-bold text-slate-500">
                            0 (Desativado)
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="text-slate-500 text-[10px] font-semibold block uppercase">Nulos</span>
                          <span className="font-bold text-slate-500">
                            0 (Desativado)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Apuração Vice-Presidente */}
                  <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-5">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-4">
                      <div>
                        <span className="text-[10px] font-bold text-indigo-600 tracking-wider uppercase">
                          Cargo Majoritário
                        </span>
                        <h3 className="text-base font-black text-slate-800">Vice-presidente</h3>
                      </div>
                      {viceStats.winner && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-indigo-100 px-3 py-1 text-[11px] font-bold text-indigo-800 border border-indigo-200">
                          🏆 Líder: {viceStats.winner.name} ({viceStats.winner.number})
                        </span>
                      )}
                    </div>

                    <div className="space-y-3">
                      {viceStats.candidateResults.map(({ candidate, count, percent }) => (
                        <div key={candidate.id} className="space-y-1">
                          <div className="flex items-center justify-between text-xs font-semibold">
                            <span className="flex items-center gap-2 text-slate-800">
                              <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-200">
                                {candidate.number}
                              </span>
                              {candidate.name}
                              <span className="text-[10px] text-slate-400 font-normal">({candidate.group})</span>
                            </span>
                            <span className="text-slate-700 font-mono">
                              <b>{count}</b> voto{count !== 1 ? 's' : ''} ({percent}%)
                            </span>
                          </div>
                          <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                            <div
                              className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 transition-all duration-500"
                              style={{ width: `${percent}%` }}
                            />
                          </div>
                        </div>
                      ))}

                      {/* Brancos e Nulos Desativados */}
                      <div className="mt-4 pt-3 border-t border-slate-200 grid grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="text-slate-500 text-[10px] font-semibold block uppercase">Brancos</span>
                          <span className="font-bold text-slate-500">
                            0 (Desativado)
                          </span>
                        </div>
                        <div className="bg-white p-2.5 rounded-lg border border-slate-200">
                          <span className="text-slate-500 text-[10px] font-semibold block uppercase">Nulos</span>
                          <span className="font-bold text-slate-500">
                            0 (Desativado)
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}

          {activeTab === 'backoffice' && (
            <div className="space-y-6">
              {backOfficeStats.map(({ role, totals }) => (
                <div key={role} className="rounded-xl border border-slate-200 bg-slate-50/80 p-5">
                  <div className="mb-4 flex items-center justify-between border-b border-slate-200 pb-3">
                    <div>
                      <span className="text-[10px] font-bold tracking-wider uppercase text-blue-600">
                        Cargo
                      </span>
                      <h3 className="text-base font-black text-slate-800">{roleLabels[role]}</h3>
                    </div>
                    <span className="rounded-full bg-blue-100 px-3 py-1 text-[11px] font-bold text-blue-700">
                      {totals.reduce((sum, item) => sum + item.count, 0)} votos
                    </span>
                  </div>

                  <div className="space-y-3">
                    {totals.map(({ candidate, count, percent }) => (
                      <div key={candidate.id} className="rounded-lg border border-slate-200 bg-white p-3">
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-black text-slate-800">{candidate.name}</p>
                            <p className="truncate text-[10px] text-slate-500">{candidate.group}</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono text-lg font-black text-slate-800">{count}</p>
                            <p className="text-[10px] text-slate-500">{percent.toFixed(1)}%</p>
                          </div>
                        </div>
                        <div className="h-2.5 w-full overflow-hidden rounded-full bg-slate-200">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600"
                            style={{ width: `${Math.min(percent, 100)}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          {activeTab === 'zeresima' && (
            <div className="rounded-xl border border-slate-200 bg-amber-50/50 p-6 font-mono text-xs text-slate-800 space-y-4">
              <div className="text-center border-b border-dashed border-amber-300 pb-3">
                <p className="font-bold uppercase tracking-widest text-[11px] text-slate-600">
                  JUSTIÇA ELEITORAL / URNA ELETRÔNICA
                </p>
                <p className="text-base font-black tracking-tight text-slate-900 mt-0.5">
                  RELATÓRIO DE ZERÉSIMA
                </p>
                <p className="text-[10px] text-slate-500 mt-1">
                  Comprovante de Inexistência de Votos Registrados
                </p>
              </div>

              <div className="text-[11px] space-y-1 text-slate-600 border-b border-dashed border-amber-300 pb-3">
                <p><b>ELEIÇÃO:</b> {electionTitle}</p>
                <p><b>SEÇÃO:</b> 0001 · <b>ZONA:</b> 001</p>
                <p><b>STATUS:</b> URNA PRONTA PARA VOTAÇÃO</p>
                <p><b>DATA/HORA EMISSÃO:</b> {new Date().toLocaleString('pt-BR')}</p>
              </div>

              <div>
                <p className="font-bold text-[11px] uppercase mb-2 text-slate-700">Candidatos Registrados (0 votos):</p>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  {candidates.map((c) => (
                    <div key={c.id} className="bg-white/80 p-2 rounded border border-amber-200 flex justify-between">
                      <span>{c.number} - {c.name} ({c.role})</span>
                      <b className="text-green-700">000 VOTOS</b>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-2 text-center text-[10px] text-slate-500">
                ---------------- ASSINATURA DA MESA RECEPTORA ----------------
              </div>
            </div>
          )}

          {activeTab === 'auditoria' && (
            <div className="space-y-3">
              {records.length === 0 ? (
                <p className="text-center text-xs text-slate-500 py-6">
                  Nenhum registro de voto encontrado nesta urna.
                </p>
              ) : (
                records.map((rec, idx) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between p-3.5 bg-slate-50 rounded-xl border border-slate-200 text-xs"
                  >
                    <div>
                      <span className="font-bold text-slate-800">
                        Voto #{records.length - idx}
                      </span>
                      <span className="text-[10px] text-slate-400 block">{rec.dateString}</span>
                    </div>
                    <div className="text-right space-y-0.5">
                      <div className="text-[11px]">
                        <span className="text-slate-400">Pres: </span>
                        <b>
                          {rec.presidente.kind === 'candidate'
                            ? `${rec.presidente.candidate?.name} (${rec.presidente.number})`
                            : rec.presidente.kind === 'blank'
                              ? 'Branco'
                              : 'Nulo'}
                        </b>
                      </div>
                      <div className="text-[11px]">
                        <span className="text-slate-400">Vice: </span>
                        <b>
                          {rec.vicePresidente.kind === 'candidate'
                            ? `${rec.vicePresidente.candidate?.name} (${rec.vicePresidente.number})`
                            : rec.vicePresidente.kind === 'blank'
                              ? 'Branco'
                              : 'Nulo'}
                        </b>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>

        {/* Rodapé com Ações */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3.5 py-2 text-xs font-bold text-white hover:bg-blue-700 shadow-sm transition"
            >
              🖨️ Imprimir B.U.
            </button>
            <button
              onClick={handleExportJSON}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-200 px-3.5 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 transition"
            >
              📥 Exportar JSON
            </button>
          </div>

          <div>
            {!confirmClear ? (
              <button
                onClick={() => setConfirmClear(true)}
                className="text-xs font-semibold text-rose-600 hover:text-rose-800 transition"
              >
                ⚠️ Zerar Urna (Limpar Votos)
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-bold text-rose-600">Tem certeza?</span>
                <button
                  onClick={() => {
                    onClearVotes()
                    setConfirmClear(false)
                  }}
                  className="rounded bg-rose-600 px-2.5 py-1 text-[11px] font-bold text-white hover:bg-rose-700 transition"
                >
                  Sim, limpar
                </button>
                <button
                  onClick={() => setConfirmClear(false)}
                  className="rounded bg-slate-200 px-2.5 py-1 text-[11px] font-bold text-slate-700 hover:bg-slate-300 transition"
                >
                  Cancelar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
