import { describe, it, expect } from 'vitest'
import { computeChangeset } from '../diff/compute.js'
import { emptySnapshot } from '../diff/snapshot.js'
import type { PoligraphMandate } from '../db/types.js'

describe('E2E dry run', () => {
  const mockMandates: PoligraphMandate[] = [
    {
      id: 'm1',
      type: 'DEPUTE',
      isCurrent: true,
      startDate: new Date('2024-07-07'),
      endDate: null,
      institution: 'Assemblée nationale',
      politicianId: 'p1',
      politicianFirstName: 'Marine',
      politicianLastName: 'Le Pen',
      wikidataId: 'Q182764',
    },
    {
      id: 'm2',
      type: 'SENATEUR',
      isCurrent: true,
      startDate: new Date('2023-10-01'),
      endDate: null,
      institution: 'Sénat',
      politicianId: 'p2',
      politicianFirstName: 'Bruno',
      politicianLastName: 'Retailleau',
      wikidataId: 'Q3055816',
    },
  ]

  it('should produce correct changeset from empty snapshot', () => {
    const snapshot = emptySnapshot()
    const changeset = computeChangeset(mockMandates, snapshot)

    expect(changeset.adds).toHaveLength(2)
    expect(changeset.updates).toHaveLength(0)
    expect(changeset.skips).toBe(0)

    // Député mapped to Q3044918
    expect(changeset.adds[0].politicianQid).toBe('Q182764')
    expect(changeset.adds[0].value).toBe('Q3044918')
    // Sénateur mapped to Q19803890
    expect(changeset.adds[1].politicianQid).toBe('Q3055816')
    expect(changeset.adds[1].value).toBe('Q19803890')
  })

  it('should detect ended mandates as updates after first sync', () => {
    const snapshot = emptySnapshot()

    // First run: populate snapshot
    const cs1 = computeChangeset(mockMandates, snapshot)
    for (const add of cs1.adds) {
      if (!snapshot.mandates[add.politicianQid]) {
        snapshot.mandates[add.politicianQid] = { P39: [] }
      }
      snapshot.mandates[add.politicianQid].P39.push({
        value: add.value,
        qualifiers: { P580: add.qualifiers.P580, P582: add.qualifiers.P582 },
        claimGuid: `${add.politicianQid}$fake-guid`,
        pushedAt: new Date().toISOString(),
      })
    }

    // Second run: Le Pen's mandate ended
    const updatedMandates = mockMandates.map(m =>
      m.id === 'm1'
        ? { ...m, isCurrent: false, endDate: new Date('2025-12-31') }
        : m
    )
    const cs2 = computeChangeset(updatedMandates, snapshot)
    expect(cs2.updates).toHaveLength(1)
    expect(cs2.updates[0].politicianQid).toBe('Q182764')
    expect(cs2.updates[0].qualifiers.P582).toBe('2025-12-31')
    expect(cs2.updates[0].existingClaimGuid).toBe('Q182764$fake-guid')
    expect(cs2.skips).toBe(1) // Retailleau unchanged
  })

  it('should handle a full lifecycle: add -> skip -> update', () => {
    const snapshot = emptySnapshot()
    const mandate: PoligraphMandate = {
      id: 'm-lifecycle',
      type: 'DEPUTE',
      isCurrent: true,
      startDate: new Date('2024-07-07'),
      endDate: null,
      institution: 'Assemblée nationale',
      politicianId: 'p-life',
      politicianFirstName: 'Test',
      politicianLastName: 'User',
      wikidataId: 'Q999999',
    }

    // Step 1: ADD
    const cs1 = computeChangeset([mandate], snapshot)
    expect(cs1.adds).toHaveLength(1)
    snapshot.mandates['Q999999'] = {
      P39: [{
        value: 'Q3044918',
        qualifiers: { P580: '2024-07-07', P582: null },
        claimGuid: 'Q999999$guid-1',
        pushedAt: new Date().toISOString(),
      }]
    }

    // Step 2: SKIP (no change)
    const cs2 = computeChangeset([mandate], snapshot)
    expect(cs2.skips).toBe(1)
    expect(cs2.adds).toHaveLength(0)
    expect(cs2.updates).toHaveLength(0)

    // Step 3: UPDATE (mandate ended)
    const ended = { ...mandate, isCurrent: false, endDate: new Date('2026-01-15') }
    const cs3 = computeChangeset([ended], snapshot)
    expect(cs3.updates).toHaveLength(1)
    expect(cs3.updates[0].qualifiers.P582).toBe('2026-01-15')
  })
})
