export interface SnapshotEntry {
  value: string            // Q-ID of position (e.g. Q3044918)
  qualifiers: {
    P580: string | null    // start time
    P582: string | null    // end time
    P2937?: string | null  // parliamentary term
    P4100?: string | null  // parliamentary group
  }
  claimGuid: string | null
  pushedAt: string         // ISO timestamp
}

export interface Snapshot {
  lastRun: string
  version: number
  mandates: Record<string, {   // keyed by politician Q-ID
    P39: SnapshotEntry[]
  }>
}

export type DiffAction = 'ADD' | 'UPDATE' | 'SKIP'

export interface DiffEntry {
  action: DiffAction
  politicianQid: string
  politicianName: string
  mandateId: string         // Poligraph mandate ID
  value: string             // position Q-ID
  qualifiers: {
    P580: string | null
    P582: string | null
  }
  existingClaimGuid?: string // for UPDATE
}

export interface EnrichEntry {
  politicianQid: string
  politicianName: string
  mandateId: string
  claimGuid: string
  qualifiersToAdd: { property: string; value: string }[]
}

export interface Changeset {
  adds: DiffEntry[]
  updates: DiffEntry[]
  enrichments: EnrichEntry[]
  skips: number
}
