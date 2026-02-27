import type { DiffEntry } from '../diff/types.js'
import { PROPERTIES } from '../config/wikidata.js'

const USER_AGENT = 'PoliGraphBot/0.1.0 (https://github.com/ironlam/poligraph-wikibot)'

/** Tolerance in days for fuzzy start-date matching */
const DATE_TOLERANCE_DAYS = 2

interface WikidataClaim {
  mainsnak: { datavalue?: { value?: { id?: string } } }
  qualifiers?: Record<string, Array<{ datavalue?: { value?: { time?: string } } }>>
}

interface ClaimsResponse {
  claims?: { P39?: WikidataClaim[] }
}

/** Fetch existing P39 claims for an entity from the Wikidata API */
export async function fetchExistingP39Claims(
  entityId: string,
  instance: string
): Promise<WikidataClaim[]> {
  const url = `${instance}/w/api.php?action=wbgetclaims&entity=${entityId}&property=P39&format=json`
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  const data = (await res.json()) as ClaimsResponse
  return data.claims?.P39 ?? []
}

/** Parse a Wikidata time value (+2012-06-20T00:00:00Z) to YYYY-MM-DD */
function parseWikidataTime(time: string): string {
  return time.replace(/^\+/, '').slice(0, 10)
}

/** Check if two dates are within ±toleranceDays of each other */
function datesWithinTolerance(
  dateA: string | null,
  dateB: string | null,
  toleranceDays: number
): boolean {
  if (!dateA || !dateB) return false
  const a = new Date(dateA).getTime()
  const b = new Date(dateB).getTime()
  return Math.abs(a - b) <= toleranceDays * 86_400_000
}

/**
 * Checks whether a DiffEntry already has a near-match among existing Wikidata
 * claims (same position QID, start date within ±2 days).
 */
export function hasNearDuplicate(
  entry: DiffEntry,
  existingClaims: WikidataClaim[]
): boolean {
  for (const claim of existingClaims) {
    const existingPosition = claim.mainsnak?.datavalue?.value?.id
    if (existingPosition !== entry.value) continue

    const existingStart = claim.qualifiers?.[PROPERTIES.START_TIME]?.[0]?.datavalue?.value?.time
    if (!existingStart) continue

    const existingDate = parseWikidataTime(existingStart)
    if (datesWithinTolerance(entry.qualifiers.P580, existingDate, DATE_TOLERANCE_DAYS)) {
      return true
    }
  }
  return false
}

export interface PreflightResult {
  /** Entries that passed preflight (no near-duplicate found on Wikidata) */
  cleared: DiffEntry[]
  /** Entries skipped because a near-duplicate exists on Wikidata */
  skipped: DiffEntry[]
}

/**
 * Run pre-flight checks on a batch of ADD entries.
 * Groups entries by entity to minimize API calls.
 */
export async function preflightCheck(
  entries: DiffEntry[],
  instance: string
): Promise<PreflightResult> {
  const cleared: DiffEntry[] = []
  const skipped: DiffEntry[] = []

  // Group entries by entity to batch API calls
  const byEntity = new Map<string, DiffEntry[]>()
  for (const entry of entries) {
    const existing = byEntity.get(entry.politicianQid) ?? []
    existing.push(entry)
    byEntity.set(entry.politicianQid, existing)
  }

  for (const [entityId, entityEntries] of byEntity) {
    const existingClaims = await fetchExistingP39Claims(entityId, instance)

    for (const entry of entityEntries) {
      if (hasNearDuplicate(entry, existingClaims)) {
        skipped.push(entry)
      } else {
        cleared.push(entry)
      }
    }
  }

  return { cleared, skipped }
}
