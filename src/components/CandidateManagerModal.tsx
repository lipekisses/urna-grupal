import { useState } from 'react'
import type { Candidate, ElectionPreset, Role } from '../types'
import { electionPresets } from '../candidates'

interface CandidateManagerModalProps {
  isOpen: boolean
  onClose: () => void
  candidates: Candidate[]
  onUpdateCandidates: (newCandidates: Candidate[]) => void
  onSelectPreset: (preset: ElectionPreset) => void
  currentPresetId?: string
}

export function CandidateManagerModal({
  isOpen,
  onClose,
  candidates,
  onUpdateCandidates,
  onSelectPreset,
}: CandidateManagerModalProps) {
  const [activeTab, setActiveTab] = useState<'list' | 'add' | 'presets'>('list')

  // Form state para adicionar novo
  const [name, setName] = useState('')
  const [number, setNumber] = useState('')
  const [role, setRole] = useState<Role>('presidente')
  const [group, setGroup] = useState('')
  const [photo, setPhoto] = useState('')
  const [formError, setFormError] = useState('')

  // Estado para editar foto de um candidato existente
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editPhotoValue, setEditPhotoValue] = useState('')

  if (!isOpen) return null

  const handleStartEditPhoto = (c: Candidate) => {
    setEditingId(c.id)
    setEditPhotoValue(c.photo)
  }

  const handleSavePhoto = (c: Candidate) => {
    if (!editPhotoValue.trim()) return
    const updated = candidates.map((cand) =>
      cand.id === c.id ? { ...cand, photo: editPhotoValue.trim() } : cand
    )
    onUpdateCandidates(updated)
    setEditingId(null)
  }

  const handleAddCandidate = (e: React.FormEvent) => {
    e.preventDefault()
    setFormError('')

    if (!name.trim()) {
      setFormError('Informe o nome do candidato.')
      return
    }
    if (!/^\d{2}$/.test(number)) {
      setFormError('O número deve conter exatamente 2 dígitos.')
      return
    }
    if (!group.trim()) {
      setFormError('Informe o grupo ou partido.')
      return
    }

    const defaultPhoto =
      photo.trim() ||
      'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?crop=faces&fit=crop&w=500&h=620&q=85'

    // Verifica se já existe candidato com este número no mesmo cargo
    const duplicate = candidates.some((c) => c.role === role && c.number === number)
    if (duplicate) {
      setFormError(`Já existe um candidato para ${role} com o número ${number}.`)
      return
    }

    const newCandidate: Candidate = {
      id: Date.now().toString(),
      name: name.trim(),
      number,
      role,
      group: group.trim(),
      photo: defaultPhoto,
    }

    onUpdateCandidates([...candidates, newCandidate])
    setName('')
    setNumber('')
    setGroup('')
    setPhoto('')
    setActiveTab('list')
  }

  const handleDeleteCandidate = (id: string) => {
    if (candidates.length <= 2) {
      alert('A urna precisa de pelo menos 2 candidatos para funcionar.')
      return
    }
    onUpdateCandidates(candidates.filter((c) => c.id !== id))
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
      <div className="relative max-h-[90vh] w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl flex flex-col border border-slate-200">
        {/* Cabeçalho */}
        <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-6 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white font-black text-sm shadow-md shadow-indigo-500/20">
              ⚙️
            </span>
            <div>
              <h2 className="text-lg font-black text-slate-800 tracking-tight">
                Gerenciador de Candidatos & Eleições
              </h2>
              <p className="text-xs text-slate-500 font-medium">
                Altere fotos, nomes, números ou carregue novas chapas
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full text-slate-400 hover:bg-slate-200 hover:text-slate-700 transition"
          >
            ✕
          </button>
        </div>

        {/* Abas */}
        <div className="flex border-b border-slate-200 bg-slate-100/70 px-6 gap-2 pt-2">
          <button
            onClick={() => setActiveTab('list')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 ${
              activeTab === 'list'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            👥 Candidatos Cadastrados ({candidates.length})
          </button>
          <button
            onClick={() => setActiveTab('add')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 ${
              activeTab === 'add'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            ➕ Novo Candidato
          </button>
          <button
            onClick={() => setActiveTab('presets')}
            className={`px-4 py-2 text-xs font-bold rounded-t-lg transition border-b-2 ${
              activeTab === 'presets'
                ? 'border-indigo-600 text-indigo-700 bg-white shadow-sm'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            ⭐ Chapas Prontas (Presets)
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'list' && (
            <div className="space-y-5">
              {(['presidente', 'vice-presidente'] as Role[]).map((r) => {
                const list = candidates.filter((c) => c.role === r)
                return (
                  <div key={r} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                    <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider mb-3">
                      {r === 'presidente'
                        ? 'Candidatos a Presidente'
                        : 'Candidatos a Vice-presidente'}{' '}
                      ({list.length})
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {list.map((c) => (
                        <div
                          key={c.id}
                          className="bg-white p-3 rounded-lg border border-slate-200 shadow-xs flex flex-col justify-between gap-2"
                        >
                          <div className="flex items-center gap-3">
                            <img
                              src={c.photo}
                              alt={c.name}
                              className="h-14 w-12 rounded-md object-cover border border-slate-200 shrink-0"
                            />
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-slate-800 truncate">{c.name}</p>
                              <p className="text-[10px] text-slate-500 truncate">{c.group}</p>
                              <span className="inline-block mt-1 font-mono font-bold text-xs text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                                Nº {c.number}
                              </span>
                            </div>
                            <div className="text-right">
                              <button
                                onClick={() => handleDeleteCandidate(c.id)}
                                className="text-[10px] text-rose-500 hover:text-rose-700 font-semibold p-1"
                                title="Remover candidato"
                              >
                                Remover
                              </button>
                            </div>
                          </div>

                          {/* Seção de alteração rápida de foto */}
                          {editingId === c.id ? (
                            <div className="mt-2 pt-2 border-t border-slate-100 space-y-2">
                              <label className="block text-[10px] font-bold text-slate-600">
                                Caminho da foto ou Link da Web:
                              </label>
                              <input
                                type="text"
                                value={editPhotoValue}
                                onChange={(e) => setEditPhotoValue(e.target.value)}
                                placeholder="./fotos/nome_da_foto.jpg ou https://..."
                                className="w-full text-[11px] p-1.5 border border-indigo-300 rounded focus:outline-none font-mono"
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  type="button"
                                  onClick={() => handleSavePhoto(c)}
                                  className="bg-emerald-600 text-white text-[10px] font-bold px-2.5 py-1 rounded hover:bg-emerald-700"
                                >
                                  Salvar Foto
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setEditingId(null)}
                                  className="bg-slate-200 text-slate-700 text-[10px] font-bold px-2 py-1 rounded"
                                >
                                  Cancelar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleStartEditPhoto(c)}
                              className="text-[10px] text-blue-600 hover:text-blue-800 font-bold self-start mt-1 flex items-center gap-1"
                            >
                              📷 Alterar Foto deste candidato
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {activeTab === 'add' && (
            <form onSubmit={handleAddCandidate} className="max-w-md mx-auto space-y-4">
              {formError && (
                <div className="rounded-lg bg-rose-50 p-3 text-xs text-rose-700 border border-rose-200 font-medium">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">Cargo</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as Role)}
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-medium focus:border-indigo-500 focus:outline-none"
                  >
                    <option value="presidente">Presidente</option>
                    <option value="vice-presidente">Vice-presidente</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Número (2 dígitos)
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={number}
                    onChange={(e) => setNumber(e.target.value.replace(/\D/g, ''))}
                    placeholder="Ex: 15"
                    className="w-full rounded-lg border border-slate-300 p-2 text-xs font-mono font-bold text-center focus:border-indigo-500 focus:outline-none"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Nome Completo</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Partido / Grupo / Chapa
                </label>
                <input
                  type="text"
                  value={group}
                  onChange={(e) => setGroup(e.target.value)}
                  placeholder="Ex: Chapa Renovação"
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Caminho da Foto ou Link
                </label>
                <input
                  type="text"
                  value={photo}
                  onChange={(e) => setPhoto(e.target.value)}
                  placeholder="./fotos/minha_foto.jpg ou https://..."
                  className="w-full rounded-lg border border-slate-300 p-2 text-xs focus:border-indigo-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 mt-1">
                  Você pode usar fotos locais salvas na pasta fotos (ex: ./fotos/pedro.jpg) ou qualquer link da internet.
                </p>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full rounded-lg bg-indigo-600 py-2.5 text-xs font-bold text-white hover:bg-indigo-700 shadow-md shadow-indigo-500/20 transition"
                >
                  Cadastrar Candidato
                </button>
              </div>
            </form>
          )}

          {activeTab === 'presets' && (
            <div className="grid gap-3 sm:grid-cols-3">
              {electionPresets.map((preset) => (
                <div
                  key={preset.id}
                  className="rounded-xl border border-slate-200 bg-slate-50 p-4 flex flex-col justify-between hover:border-indigo-300 hover:shadow-sm transition"
                >
                  <div>
                    <span className="text-xl">🗳️</span>
                    <h4 className="font-bold text-slate-800 text-sm mt-1">{preset.title}</h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">{preset.subtitle}</p>
                    <div className="mt-3 text-[10px] text-slate-600 space-y-0.5">
                      {preset.candidates.slice(0, 3).map((c) => (
                        <p key={c.id}>
                          • {c.number} - {c.name}
                        </p>
                      ))}
                      {preset.candidates.length > 3 && (
                        <p className="text-slate-400 font-italic">
                          + {preset.candidates.length - 3} outros
                        </p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      onSelectPreset(preset)
                      onClose()
                    }}
                    className="mt-4 w-full rounded-lg bg-indigo-50 py-2 text-xs font-bold text-indigo-700 hover:bg-indigo-600 hover:text-white transition"
                  >
                    Carregar Esta Chapa
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Rodapé */}
        <div className="border-t border-slate-200 bg-slate-50 px-6 py-3 text-right">
          <button
            onClick={onClose}
            className="rounded-lg bg-slate-200 px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-300 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  )
}
