import { PROPERTIES, POSITIONS } from '../config/wikidata.js'
import { deputeReference, senateurReference } from '../config/sources.js'
import type { DiffEntry, SnapshotEntry } from '../diff/types.js'
import type { WBEditInstance } from './client.js'

function buildReference(positionQid: string, retrievedDate: string) {
  if (positionQid === POSITIONS.DEPUTE) return deputeReference(retrievedDate)
  if (positionQid === POSITIONS.SENATEUR) return senateurReference(retrievedDate)
  throw new Error(`Unknown position QID: ${positionQid}`)
}

export interface WriteResult {
  success: boolean
  claimGuid: string | null
  error?: string
}

// wikibase-edit v8 uses branded types (Q${number}, Guid, etc.)
// Our IDs come as runtime strings from the DB, so we cast them
type AnyId = any // eslint-disable-line @typescript-eslint/no-explicit-any

export async function addClaim(
  wbEdit: WBEditInstance,
  entry: DiffEntry,
  retrievedDate: string
): Promise<WriteResult> {
  try {
    const qualifiers: Record<string, string> = {}
    if (entry.qualifiers.P580) qualifiers[PROPERTIES.START_TIME] = entry.qualifiers.P580
    if (entry.qualifiers.P582) qualifiers[PROPERTIES.END_TIME] = entry.qualifiers.P582

    const res = await wbEdit.claim.create({
      id: entry.politicianQid as AnyId,
      property: PROPERTIES.POSITION_HELD as AnyId,
      value: entry.value as AnyId,
      qualifiers: qualifiers as AnyId,
      references: [buildReference(entry.value, retrievedDate)] as AnyId,
      reconciliation: {
        mode: 'skip-on-value-match',
        matchingQualifiers: [PROPERTIES.START_TIME],
      },
    })

    return {
      success: true,
      claimGuid: res?.claim?.id ?? null,
    }
  } catch (error) {
    return {
      success: false,
      claimGuid: null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export async function updateClaimEndDate(
  wbEdit: WBEditInstance,
  entry: DiffEntry,
): Promise<WriteResult> {
  try {
    if (!entry.existingClaimGuid) {
      throw new Error(`No claim GUID for update on ${entry.politicianQid}`)
    }
    if (!entry.qualifiers.P582) {
      throw new Error(`No end date for update on ${entry.politicianQid}`)
    }

    await wbEdit.qualifier.set({
      guid: entry.existingClaimGuid as AnyId,
      property: PROPERTIES.END_TIME as AnyId,
      value: entry.qualifiers.P582,
    })

    return {
      success: true,
      claimGuid: entry.existingClaimGuid,
    }
  } catch (error) {
    return {
      success: false,
      claimGuid: entry.existingClaimGuid ?? null,
      error: error instanceof Error ? error.message : String(error),
    }
  }
}

export function toSnapshotEntry(
  entry: DiffEntry,
  claimGuid: string | null
): SnapshotEntry {
  return {
    value: entry.value,
    qualifiers: {
      P580: entry.qualifiers.P580,
      P582: entry.qualifiers.P582,
    },
    claimGuid,
    pushedAt: new Date().toISOString(),
  }
}
