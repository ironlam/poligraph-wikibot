export interface PoligraphMandate {
  id: string
  type: 'DEPUTE' | 'SENATEUR'
  isCurrent: boolean
  startDate: Date | null
  endDate: Date | null
  institution: string | null
  politicianId: string
  politicianFirstName: string
  politicianLastName: string
  wikidataId: string | null
  parliamentaryGroupWikidataId: string | null
}
