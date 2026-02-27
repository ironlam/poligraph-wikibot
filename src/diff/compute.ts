import type { PoligraphMandate } from '../db/types.js'
import type { Snapshot, DiffEntry, Changeset } from './types.js'
import { MANDATE_TYPE_TO_QID } from '../config/wikidata.js'

function formatDate(d: Date | null): string | null {
  if (!d) return null
  // Format in Europe/Paris timezone — all French parliamentary dates are local
  // Without this, midnight CEST (UTC+2) shifts back 1 day in UTC
  return d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Paris' })
}

export function computeChangeset(
  mandates: PoligraphMandate[],
  snapshot: Snapshot
): Changeset {
  const adds: DiffEntry[] = []
  const updates: DiffEntry[] = []
  let skips = 0

  for (const m of mandates) {
    const qid = m.wikidataId
    if (!qid) continue

    const positionQid = MANDATE_TYPE_TO_QID[m.type]
    if (!positionQid) continue

    const startDate = formatDate(m.startDate)
    const endDate = formatDate(m.endDate)

    // Check snapshot for existing entry with same position + same start date
    const existingEntries = snapshot.mandates[qid]?.P39 ?? []
    const match = existingEntries.find(
      e => e.value === positionQid && e.qualifiers.P580 === startDate
    )

    const entry: DiffEntry = {
      action: 'ADD',
      politicianQid: qid,
      politicianName: `${m.politicianFirstName} ${m.politicianLastName}`,
      mandateId: m.id,
      value: positionQid,
      qualifiers: { P580: startDate, P582: endDate },
    }

    if (!match) {
      entry.action = 'ADD'
      adds.push(entry)
    } else if (match.qualifiers.P582 !== endDate) {
      // End date changed (typically: mandate ended)
      entry.action = 'UPDATE'
      entry.existingClaimGuid = match.claimGuid ?? undefined
      updates.push(entry)
    } else {
      skips++
    }
  }

  return { adds, updates, skips }
}
