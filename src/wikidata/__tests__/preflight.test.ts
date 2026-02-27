import { describe, it, expect } from 'vitest'
import { hasNearDuplicate } from '../preflight.js'
import type { DiffEntry } from '../../diff/types.js'

function makeEntry(overrides?: Partial<DiffEntry>): DiffEntry {
  return {
    action: 'ADD',
    politicianQid: 'Q123',
    politicianName: 'Jean Dupont',
    mandateId: 'm1',
    value: 'Q3044918',
    qualifiers: { P580: '2024-07-07', P582: null },
    ...overrides,
  }
}

function makeClaim(positionId: string, startTime: string) {
  return {
    mainsnak: { datavalue: { value: { id: positionId } } },
    qualifiers: {
      P580: [{ datavalue: { value: { time: `+${startTime}T00:00:00Z` } } }],
    },
  }
}

describe('hasNearDuplicate', () => {
  it('returns true for exact date match', () => {
    const entry = makeEntry({ qualifiers: { P580: '2024-07-07', P582: null } })
    const claims = [makeClaim('Q3044918', '2024-07-07')]
    expect(hasNearDuplicate(entry, claims)).toBe(true)
  })

  it('returns true for 1-day difference', () => {
    const entry = makeEntry({ qualifiers: { P580: '2024-07-07', P582: null } })
    const claims = [makeClaim('Q3044918', '2024-07-08')]
    expect(hasNearDuplicate(entry, claims)).toBe(true)
  })

  it('returns true for 2-day difference', () => {
    const entry = makeEntry({ qualifiers: { P580: '2024-07-07', P582: null } })
    const claims = [makeClaim('Q3044918', '2024-07-09')]
    expect(hasNearDuplicate(entry, claims)).toBe(true)
  })

  it('returns false for 3-day difference', () => {
    const entry = makeEntry({ qualifiers: { P580: '2024-07-07', P582: null } })
    const claims = [makeClaim('Q3044918', '2024-07-10')]
    expect(hasNearDuplicate(entry, claims)).toBe(false)
  })

  it('returns false for different position QID', () => {
    const entry = makeEntry({ qualifiers: { P580: '2024-07-07', P582: null } })
    const claims = [makeClaim('Q19803890', '2024-07-07')]
    expect(hasNearDuplicate(entry, claims)).toBe(false)
  })

  it('returns false when no claims exist', () => {
    const entry = makeEntry()
    expect(hasNearDuplicate(entry, [])).toBe(false)
  })

  it('returns false when entry has no start date', () => {
    const entry = makeEntry({ qualifiers: { P580: null, P582: null } })
    const claims = [makeClaim('Q3044918', '2024-07-07')]
    expect(hasNearDuplicate(entry, claims)).toBe(false)
  })

  it('handles negative day difference (entry after existing)', () => {
    const entry = makeEntry({ qualifiers: { P580: '2024-07-09', P582: null } })
    const claims = [makeClaim('Q3044918', '2024-07-07')]
    expect(hasNearDuplicate(entry, claims)).toBe(true)
  })

  it('matches against correct claim among many', () => {
    const entry = makeEntry({ qualifiers: { P580: '2017-06-20', P582: null } })
    const claims = [
      makeClaim('Q3044918', '2012-06-20'),
      makeClaim('Q3044918', '2017-06-21'), // 1 day off — should match
      makeClaim('Q3044918', '2022-06-22'),
    ]
    expect(hasNearDuplicate(entry, claims)).toBe(true)
  })
})
