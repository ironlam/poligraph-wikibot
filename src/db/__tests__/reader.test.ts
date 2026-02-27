import { describe, it, expect } from 'vitest'
import type { PoligraphMandate } from '../types.js'

describe('PoligraphMandate type', () => {
  it('should have required fields', () => {
    const mandate: PoligraphMandate = {
      id: 'test-id',
      type: 'DEPUTE',
      isCurrent: true,
      startDate: new Date('2024-07-07'),
      endDate: null,
      institution: 'Assemblée nationale',
      politicianId: 'pol-id',
      politicianFirstName: 'Jean',
      politicianLastName: 'Dupont',
      wikidataId: 'Q123456',
    }
    expect(mandate.type).toBe('DEPUTE')
    expect(mandate.wikidataId).toBe('Q123456')
  })
})
