import { describe, it, expect, vi } from 'vitest'
import { toSnapshotEntry, enrichClaimQualifiers } from '../write.js'
import type { DiffEntry, EnrichEntry } from '../../diff/types.js'
import type { WBEditInstance } from '../client.js'

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

describe('enrichClaimQualifiers', () => {
  const makeMockWbEdit = () => ({
    claim: { create: vi.fn() },
    qualifier: { set: vi.fn().mockResolvedValue({}) },
  }) as unknown as WBEditInstance

  const makeEnrichEntry = (qualifiers: EnrichEntry['qualifiersToAdd']): EnrichEntry => ({
    politicianQid: 'Q123',
    politicianName: 'Jean Dupont',
    mandateId: 'm-1',
    claimGuid: 'Q123$abc',
    qualifiersToAdd: qualifiers,
  })

  it('should call qualifier.set for each qualifier', async () => {
    const wbEdit = makeMockWbEdit()
    const entry = makeEnrichEntry([
      { property: 'P2937', value: 'Q117155032' },
      { property: 'P4100', value: 'Q789' },
    ])
    const result = await enrichClaimQualifiers(wbEdit, entry)
    expect(result.success).toBe(true)
    expect(result.written).toBe(2)
    expect(wbEdit.qualifier.set).toHaveBeenCalledTimes(2)
    expect(wbEdit.qualifier.set).toHaveBeenCalledWith({
      guid: 'Q123$abc',
      property: 'P2937',
      value: 'Q117155032',
    })
    expect(wbEdit.qualifier.set).toHaveBeenCalledWith({
      guid: 'Q123$abc',
      property: 'P4100',
      value: 'Q789',
    })
  })

  it('should report partial writes on error', async () => {
    const wbEdit = makeMockWbEdit()
    ;(wbEdit.qualifier.set as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({})
      .mockRejectedValueOnce(new Error('API error'))
    const entry = makeEnrichEntry([
      { property: 'P2937', value: 'Q117155032' },
      { property: 'P4100', value: 'Q789' },
    ])
    const result = await enrichClaimQualifiers(wbEdit, entry)
    expect(result.success).toBe(false)
    expect(result.written).toBe(1)
    expect(result.error).toBe('API error')
  })
})
