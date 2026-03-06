import { describe, it, expect } from 'vitest'
import { computeChangeset } from '../compute.js'
import { emptySnapshot } from '../snapshot.js'
import type { PoligraphMandate } from '../../db/types.js'
import type { Snapshot } from '../types.js'

const makeMockMandate = (overrides?: Partial<PoligraphMandate>): PoligraphMandate => ({
  id: 'mandate-1',
  type: 'DEPUTE',
  isCurrent: true,
  startDate: new Date('2024-07-07'),
  endDate: null,
  institution: 'Assemblée nationale',
  politicianId: 'pol-1',
  politicianFirstName: 'Jean',
  politicianLastName: 'Dupont',
  wikidataId: 'Q123456',
  parliamentaryGroupWikidataId: null,
  ...overrides,
})

describe('computeChangeset', () => {
  it('should detect ADD when snapshot is empty', () => {
    const mandates = [makeMockMandate()]
    const snapshot = emptySnapshot()
    const result = computeChangeset(mandates, snapshot)
    expect(result.adds).toHaveLength(1)
    expect(result.updates).toHaveLength(0)
    expect(result.skips).toBe(0)
    expect(result.adds[0].action).toBe('ADD')
    expect(result.adds[0].politicianQid).toBe('Q123456')
    expect(result.adds[0].value).toBe('Q3044918')
  })

  it('should detect SKIP when snapshot matches', () => {
    const mandates = [makeMockMandate()]
    const snapshot: Snapshot = {
      lastRun: '',
      version: 1,
      mandates: {
        'Q123456': {
          P39: [{
            value: 'Q3044918',
            qualifiers: { P580: '2024-07-07', P582: null },
            claimGuid: 'Q123456$abc',
            pushedAt: '2026-01-01T00:00:00Z',
          }],
        },
      },
    }
    const result = computeChangeset(mandates, snapshot)
    expect(result.adds).toHaveLength(0)
    expect(result.updates).toHaveLength(0)
    expect(result.skips).toBe(1)
  })

  it('should detect UPDATE when endDate changes', () => {
    const mandates = [makeMockMandate({ endDate: new Date('2025-06-30'), isCurrent: false })]
    const snapshot: Snapshot = {
      lastRun: '',
      version: 1,
      mandates: {
        'Q123456': {
          P39: [{
            value: 'Q3044918',
            qualifiers: { P580: '2024-07-07', P582: null },
            claimGuid: 'Q123456$abc',
            pushedAt: '2026-01-01T00:00:00Z',
          }],
        },
      },
    }
    const result = computeChangeset(mandates, snapshot)
    expect(result.updates).toHaveLength(1)
    expect(result.updates[0].qualifiers.P582).toBe('2025-06-30')
    expect(result.updates[0].existingClaimGuid).toBe('Q123456$abc')
  })

  it('should skip mandates without wikidataId', () => {
    const mandates = [makeMockMandate({ wikidataId: null })]
    const snapshot = emptySnapshot()
    const result = computeChangeset(mandates, snapshot)
    expect(result.adds).toHaveLength(0)
    expect(result.skips).toBe(0)
  })

  it('should handle multiple mandates for same politician', () => {
    const mandates = [
      makeMockMandate({ id: 'm1', startDate: new Date('2017-06-18'), endDate: new Date('2022-06-19') }),
      makeMockMandate({ id: 'm2', startDate: new Date('2024-07-07'), endDate: null }),
    ]
    const snapshot = emptySnapshot()
    const result = computeChangeset(mandates, snapshot)
    expect(result.adds).toHaveLength(2)
    expect(result.adds[0].qualifiers.P580).toBe('2017-06-18')
    expect(result.adds[1].qualifiers.P580).toBe('2024-07-07')
  })

  it('should detect ENRICH when P2937 is missing from snapshot', () => {
    const mandates = [makeMockMandate({ startDate: new Date('2024-07-08') })]
    const snapshot: Snapshot = {
      lastRun: '',
      version: 1,
      mandates: {
        'Q123456': {
          P39: [{
            value: 'Q3044918',
            qualifiers: { P580: '2024-07-08', P582: null },
            claimGuid: 'Q123456$abc',
            pushedAt: '2026-01-01T00:00:00Z',
          }],
        },
      },
    }
    const result = computeChangeset(mandates, snapshot)
    expect(result.skips).toBe(1)
    expect(result.enrichments).toHaveLength(1)
    expect(result.enrichments[0].politicianQid).toBe('Q123456')
    expect(result.enrichments[0].claimGuid).toBe('Q123456$abc')
    expect(result.enrichments[0].qualifiersToAdd).toContainEqual({
      property: 'P2937',
      value: 'Q117155032', // XVIIe legislature
    })
  })

  it('should detect ENRICH when P4100 is missing from snapshot', () => {
    const mandates = [makeMockMandate({
      startDate: new Date('2024-07-08'),
      parliamentaryGroupWikidataId: 'Q123789',
    })]
    const snapshot: Snapshot = {
      lastRun: '',
      version: 1,
      mandates: {
        'Q123456': {
          P39: [{
            value: 'Q3044918',
            qualifiers: { P580: '2024-07-08', P582: null, P2937: 'Q117155032' },
            claimGuid: 'Q123456$abc',
            pushedAt: '2026-01-01T00:00:00Z',
          }],
        },
      },
    }
    const result = computeChangeset(mandates, snapshot)
    expect(result.enrichments).toHaveLength(1)
    expect(result.enrichments[0].qualifiersToAdd).toEqual([
      { property: 'P4100', value: 'Q123789' },
    ])
  })

  it('should NOT enrich when both P2937 and P4100 already present', () => {
    const mandates = [makeMockMandate({
      startDate: new Date('2024-07-08'),
      parliamentaryGroupWikidataId: 'Q123789',
    })]
    const snapshot: Snapshot = {
      lastRun: '',
      version: 1,
      mandates: {
        'Q123456': {
          P39: [{
            value: 'Q3044918',
            qualifiers: { P580: '2024-07-08', P582: null, P2937: 'Q117155032', P4100: 'Q123789' },
            claimGuid: 'Q123456$abc',
            pushedAt: '2026-01-01T00:00:00Z',
          }],
        },
      },
    }
    const result = computeChangeset(mandates, snapshot)
    expect(result.skips).toBe(1)
    expect(result.enrichments).toHaveLength(0)
  })

  it('should NOT enrich when claim has no GUID', () => {
    const mandates = [makeMockMandate({ startDate: new Date('2024-07-08') })]
    const snapshot: Snapshot = {
      lastRun: '',
      version: 1,
      mandates: {
        'Q123456': {
          P39: [{
            value: 'Q3044918',
            qualifiers: { P580: '2024-07-08', P582: null },
            claimGuid: null,
            pushedAt: '2026-01-01T00:00:00Z',
          }],
        },
      },
    }
    const result = computeChangeset(mandates, snapshot)
    expect(result.skips).toBe(1)
    expect(result.enrichments).toHaveLength(0)
  })
})
