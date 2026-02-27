import { describe, it, expect } from 'vitest'
import { toSnapshotEntry } from '../write.js'
import type { DiffEntry } from '../../diff/types.js'

describe('toSnapshotEntry', () => {
  it('should convert a DiffEntry to SnapshotEntry', () => {
    const entry: DiffEntry = {
      action: 'ADD',
      politicianQid: 'Q123',
      politicianName: 'Jean Dupont',
      mandateId: 'm-1',
      value: 'Q3044918',
      qualifiers: { P580: '2024-07-07', P582: null },
    }
    const result = toSnapshotEntry(entry, 'Q123$abc')
    expect(result.value).toBe('Q3044918')
    expect(result.claimGuid).toBe('Q123$abc')
    expect(result.qualifiers.P580).toBe('2024-07-07')
    expect(result.qualifiers.P582).toBeNull()
    expect(result.pushedAt).toBeTruthy()
  })

  it('should handle entry with end date', () => {
    const entry: DiffEntry = {
      action: 'UPDATE',
      politicianQid: 'Q456',
      politicianName: 'Marie Martin',
      mandateId: 'm-2',
      value: 'Q19803890',
      qualifiers: { P580: '2020-10-01', P582: '2025-06-30' },
      existingClaimGuid: 'Q456$existing',
    }
    const result = toSnapshotEntry(entry, 'Q456$existing')
    expect(result.qualifiers.P582).toBe('2025-06-30')
    expect(result.claimGuid).toBe('Q456$existing')
  })
})
