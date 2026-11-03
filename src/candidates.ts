import type { Candidate, ElectionPreset } from './types'

export const defaultCandidates: Candidate[] = [
  // --- CANDIDATOS A PRESIDENTE ---
  {
    id: 'pres-kaio',
    name: 'Kaio',
    number: '70',
    role: 'presidente',
    group: 'Avante Grupal',
    photo:
      'https://conteudo.imguol.com.br/c/esporte/05/2021/01/31/o-momento-do-gol-de-breno-lopes-que-deu-o-titulo-da-libertadores-para-o-palmeiras-1612117548219_v2_1x1.jpg',
  },
  {
    id: 'pres-pedro',
    name: 'Pedro',
    number: '12',
    role: 'presidente',
    group: 'Partido Comunista do Grupal',
    photo:
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/e/e1/Hitler_portrait_crop.jpg/960px-Hitler_portrait_crop.jpg?utm_source=pt.wikipedia.org&utm_campaign=index&utm_content=thumbnail',
  },
  {
    id: 'pres-daniel',
    name: 'Daniel Vorcaro',
    number: '69',
    role: 'presidente',
    group: 'Banco Master',
    photo:
      'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fd/Daniel_Vorcaro_-_2024_%28cropped%29.jpg/250px-Daniel_Vorcaro_-_2024_%28cropped%29.jpg?utm_source=pt.wikipedia.org&utm_campaign=parser&utm_content=thumbnail',
  },

  // --- CANDIDATOS A VICE-PRESIDENTE ---
  {
    id: 'vice-fred',
    name: 'Fred',
    number: '18',
    role: 'vice-presidente',
    group: 'Partido Cachorro Orelha',
    photo: 'https://stories.cnnbrasil.com.br/wp-content/uploads/sites/9/2026/04/diniz-tecnico-corinthians.jpg',
  },
  {
    id: 'vice-arthur',
    name: 'Arthur',
    number: '44',
    role: 'vice-presidente',
    group: 'Partido Trabalhista do Grupal',
    photo: 'https://ntvb.tmsimg.com/assets/assets/928962_v9_bc.jpg',
  },
  {
    id: 'vice-toth',
    name: 'Toth',
    number: '51',
    role: 'vice-presidente',
    group: 'Partido Comunista Maoista Santariterrense da Ordem Mundial',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/9/9e/Foto_oficial_de_Luiz_In%C3%A1cio_Lula_da_Silva_%28ombros%29_denoise.jpg?utm_source=pt.wikipedia.org&utm_campaign=index&utm_content=original',
  },
  {
    id: 'vice-auri',
    name: 'Auri',
    number: '21',
    role: 'vice-presidente',
    group: 'Partido Roludo',
    photo:
      'https://upload.wikimedia.org/wikipedia/commons/b/b3/Foto_oficial_do_senador_Fl%C3%A1vio_Bolsonaro_%28v._AgSen%29_%283x4%29.jpg?utm_source=pt.wikipedia.org&utm_campaign=index&utm_content=original',
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
