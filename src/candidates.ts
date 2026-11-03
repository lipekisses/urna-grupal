import type { Candidate, ElectionPreset } from './types'

export const defaultCandidates: Candidate[] = [
  // --- CANDIDATOS A PRESIDENTE ---
  {
    id: 'pres-kaio',
    name: 'Kaio',
    number: '70',
    role: 'presidente',
    group: 'Avante Grupal',
    photo: './fotos/kaio.jpg',
  },
  {
    id: 'pres-pedro',
    name: 'Pedro',
    number: '12',
    role: 'presidente',
    group: 'Partido Comunista do Grupal',
    photo: './fotos/pedro.png',
  },
  {
    id: 'pres-daniel',
    name: 'Daniel Vorcaro',
    number: '69',
    role: 'presidente',
    group: 'Banco Master',
    photo: './fotos/daniel_vorcaro.jpg',
  },

  // --- CANDIDATOS A VICE-PRESIDENTE ---
  {
    id: 'vice-fred',
    name: 'Fred',
    number: '18',
    role: 'vice-presidente',
    group: 'Partido Cachorro Orelha',
    photo:
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=faces&fit=crop&w=500&h=620&q=85',
  },
  {
    id: 'vice-arthur',
    name: 'Arthur',
    number: '44',
    role: 'vice-presidente',
    group: 'Partido Trabalhista do Grupal',
    photo:
      'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?crop=faces&fit=crop&w=500&h=620&q=85',
  },
  {
    id: 'vice-toth',
    name: 'Toth',
    number: '51',
    role: 'vice-presidente',
    group: 'Partido Comunista Maoista Santariterrense da Ordem Mundial',
    photo:
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?crop=faces&fit=crop&w=500&h=620&q=85',
  },
  {
    id: 'vice-auri',
    name: 'Auri',
    number: '21',
    role: 'vice-presidente',
    group: 'Partido Roludo',
    photo:
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?crop=faces&fit=crop&w=500&h=620&q=85',
  },
  {
    id: 'vice-fatihzin',
    name: 'Fatihzin',
    number: '77',
    role: 'vice-presidente',
    group: 'Partido Lázaro Barbosa',
    photo:
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?crop=faces&fit=crop&w=500&h=620&q=85',
  },
]

export const electionPresets: ElectionPreset[] = [
  {
    id: 'grupal',
    title: 'Eleição Oficial Grupal',
    subtitle: 'Chapa Oficial Grupal (Kaio 70, Pedro 12, Daniel Vorcaro 69)',
    candidates: defaultCandidates,
  },
  {
    id: 'gremio',
    title: 'Grêmio Estudantil',
    subtitle: 'Eleição das Chapas Escolares / Acadêmicas',
    candidates: [
      {
        id: 'g1',
        name: 'Lucas Ferreira',
        number: '10',
        role: 'presidente',
        group: 'Chapa 10 - Inovação & Voz',
        photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?crop=faces&fit=crop&w=500&h=620&q=85',
      },
      {
        id: 'g2',
        name: 'Camila Rocha',
        number: '20',
        role: 'presidente',
        group: 'Chapa 20 - União Estudantil',
        photo: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?crop=faces&fit=crop&w=500&h=620&q=85',
      },
      {
        id: 'g3',
        name: 'Gabriel Alves',
        number: '10',
        role: 'vice-presidente',
        group: 'Chapa 10 - Inovação & Voz',
        photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?crop=faces&fit=crop&w=500&h=620&q=85',
      },
      {
        id: 'g4',
        name: 'Isabela Ribeiro',
        number: '20',
        role: 'vice-presidente',
        group: 'Chapa 20 - União Estudantil',
        photo: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?crop=faces&fit=crop&w=500&h=620&q=85',
      },
    ],
  },
  {
    id: 'tse',
    title: 'Simulação Presidencial',
    subtitle: 'Simulação estilo Tribunal Superior Eleitoral',
    candidates: [
      {
        id: 't1',
        name: 'Luiz Inácio',
        number: '13',
        role: 'presidente',
        group: 'Federação Brasil da Esperança',
        photo: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?crop=faces&fit=crop&w=500&h=620&q=85',
      },
      {
        id: 't2',
        name: 'Jair Messias',
        number: '22',
        role: 'presidente',
        group: 'Partido Liberal',
        photo: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?crop=faces&fit=crop&w=500&h=620&q=85',
      },
      {
        id: 't3',
        name: 'Geraldo José',
        number: '13',
        role: 'vice-presidente',
        group: 'Federação Brasil da Esperança',
        photo: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?crop=faces&fit=crop&w=500&h=620&q=85',
      },
      {
        id: 't4',
        name: 'Walter Souza',
        number: '22',
        role: 'vice-presidente',
        group: 'Partido Liberal',
        photo: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?crop=faces&fit=crop&w=500&h=620&q=85',
      },
    ],
  },
]
