export type Role = 'presidente' | 'vice-presidente'
export type RegionName = 'Norte' | 'Nordeste' | 'Sudeste' | 'Sul' | 'Centro-Oeste' | 'Exterior'

export type Candidate = {
  id: string
  name: string
  number: string
  role: Role
  group: string
  photo: string
}

export type Vote = {
  kind: 'candidate' | 'blank' | 'null'
  number: string
  candidate?: Candidate
}

export type BallotRecord = {
  id: string
  timestamp: number
  dateString: string
  region: RegionName
  source: 'manual' | 'geolocation'
  presidente: Vote
  vicePresidente: Vote
}

export type ElectionPreset = {
  id: string
  title: string
  subtitle: string
  candidates: Candidate[]
}
