import { fetchParliamentaryMandates, disconnect } from '../db/reader.js'
import { loadSnapshot, saveSnapshot } from '../diff/snapshot.js'
import { computeChangeset } from '../diff/compute.js'
import { getClientFromEnv } from '../wikidata/client.js'
import { addClaim, updateClaimEndDate, enrichClaimQualifiers, toSnapshotEntry } from '../wikidata/write.js'
import { preflightCheck } from '../wikidata/preflight.js'
import { PROPERTIES } from '../config/wikidata.js'

export interface RunOptions {
  dryRun: boolean
  limit?: number
}

export async function run(options: RunOptions) {
  const { dryRun, limit } = options
  const today = new Date().toISOString().split('T')[0]

  console.log(`\n=== Poligraph Wikibot ===`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Date: ${today}\n`)

  // 1. Fetch mandates from Poligraph DB
  console.log('1. Fetching mandates from Poligraph DB...')
  const mandates = await fetchParliamentaryMandates()
  console.log(`   Found ${mandates.length} parliamentary mandates with Wikidata IDs`)

  // 2. Load snapshot & compute diff
  console.log('2. Computing diff against snapshot...')
  const snapshot = await loadSnapshot()
  const changeset = computeChangeset(mandates, snapshot)
  console.log(`   ADD: ${changeset.adds.length} | UPDATE: ${changeset.updates.length} | ENRICH: ${changeset.enrichments.length} | SKIP: ${changeset.skips}`)

  if (changeset.adds.length === 0 && changeset.updates.length === 0 && changeset.enrichments.length === 0) {
    console.log('\nNothing to do. Snapshot is up to date.')
    await disconnect()
    return
  }

  // Apply limit if set
  const adds = limit ? changeset.adds.slice(0, limit) : changeset.adds
  const updates = limit
    ? changeset.updates.slice(0, Math.max(0, limit - adds.length))
    : changeset.updates
  const enrichments = limit
    ? changeset.enrichments.slice(0, Math.max(0, limit - adds.length - updates.length))
    : changeset.enrichments

  if (limit) {
    console.log(`   (limited to ${limit} edits: ${adds.length} adds + ${updates.length} updates + ${enrichments.length} enrichments)`)
  }

  // 2b. Pre-flight: check Wikidata for near-duplicate claims (±2 day tolerance)
  const instance = process.env.WIKIDATA_INSTANCE || 'https://test.wikidata.org'
  if (adds.length > 0) {
    console.log('   Running pre-flight duplicate check against Wikidata...')
    const preflight = await preflightCheck(adds, instance)
    if (preflight.skipped.length > 0) {
      console.log(`   Pre-flight: ${preflight.skipped.length} near-duplicates skipped, ${preflight.cleared.length} cleared`)
      for (const entry of preflight.skipped) {
        console.log(`   ~ SKIP ${entry.politicianQid} (${entry.politicianName}): near-duplicate on Wikidata [${entry.qualifiers.P580}]`)
      }
    }
    adds.length = 0
    adds.push(...preflight.cleared)
  }

  if (adds.length === 0 && updates.length === 0 && enrichments.length === 0) {
    console.log('\nNothing to do after pre-flight check.')
    await disconnect()
    return
  }

  // 3. Write to Wikidata (or dry-run)
  if (dryRun) {
    console.log('\n3. DRY RUN — would perform these edits:')
    for (const entry of adds) {
      console.log(`   ADD  ${entry.politicianQid} (${entry.politicianName}): ${entry.value} [${entry.qualifiers.P580} -> ${entry.qualifiers.P582 ?? 'current'}]`)
    }
    for (const entry of updates) {
      console.log(`   UPD  ${entry.politicianQid} (${entry.politicianName}): set P582=${entry.qualifiers.P582} on ${entry.existingClaimGuid}`)
    }
    for (const entry of enrichments) {
      const quals = entry.qualifiersToAdd.map(q => `${q.property}=${q.value}`).join(', ')
      console.log(`   ENR  ${entry.politicianQid} (${entry.politicianName}): ${quals} on ${entry.claimGuid}`)
    }
    console.log(`\n   Total: ${adds.length} adds + ${updates.length} updates + ${enrichments.length} enrichments (not applied)`)
  } else {
    console.log('\n3. Writing to Wikidata...')
    const wbEdit = getClientFromEnv()
    let successCount = 0
    let errorCount = 0

    for (const entry of adds) {
      const result = await addClaim(wbEdit, entry, today)
      if (result.success) {
        successCount++
        if (!snapshot.mandates[entry.politicianQid]) {
          snapshot.mandates[entry.politicianQid] = { P39: [] }
        }
        snapshot.mandates[entry.politicianQid].P39.push(
          toSnapshotEntry(entry, result.claimGuid)
        )
        console.log(`   + ADD  ${entry.politicianQid} (${entry.politicianName})`)
      } else {
        errorCount++
        console.error(`   x ADD  ${entry.politicianQid} (${entry.politicianName}): ${result.error}`)
      }
    }

    for (const entry of updates) {
      const result = await updateClaimEndDate(wbEdit, entry)
      if (result.success) {
        successCount++
        const existingEntries = snapshot.mandates[entry.politicianQid]?.P39 ?? []
        const snapshotEntry = existingEntries.find(
          e => e.claimGuid === entry.existingClaimGuid
        )
        if (snapshotEntry) {
          snapshotEntry.qualifiers.P582 = entry.qualifiers.P582
          snapshotEntry.pushedAt = new Date().toISOString()
        }
        console.log(`   + UPD  ${entry.politicianQid} (${entry.politicianName})`)
      } else {
        errorCount++
        console.error(`   x UPD  ${entry.politicianQid} (${entry.politicianName}): ${result.error}`)
      }
    }

    // 3b. Enrich existing claims with missing qualifiers
    for (const entry of enrichments) {
      const result = await enrichClaimQualifiers(wbEdit, entry)
      if (result.success) {
        successCount += result.written
        // Update snapshot with enriched qualifiers
        const existingEntries = snapshot.mandates[entry.politicianQid]?.P39 ?? []
        const snapshotEntry = existingEntries.find(e => e.claimGuid === entry.claimGuid)
        if (snapshotEntry) {
          for (const q of entry.qualifiersToAdd) {
            if (q.property === PROPERTIES.PARLIAMENTARY_TERM) {
              snapshotEntry.qualifiers.P2937 = q.value
            } else if (q.property === PROPERTIES.PARLIAMENTARY_GROUP) {
              snapshotEntry.qualifiers.P4100 = q.value
            }
          }
          snapshotEntry.pushedAt = new Date().toISOString()
        }
        const quals = entry.qualifiersToAdd.map(q => `${q.property}=${q.value}`).join(', ')
        console.log(`   + ENR  ${entry.politicianQid} (${entry.politicianName}): ${quals}`)
      } else {
        errorCount++
        console.error(`   x ENR  ${entry.politicianQid} (${entry.politicianName}): ${result.error}`)
      }
    }

    console.log(`\n   Results: ${successCount} success, ${errorCount} errors`)

    // 4. Save snapshot
    console.log('4. Saving snapshot...')
    await saveSnapshot(snapshot)
  }

  await disconnect()
  console.log('\nDone.')
}
