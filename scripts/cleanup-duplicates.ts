/**
 * One-off cleanup script: removes duplicate P39 claims added by PoliGraphBot
 * on 2026-02-27. Identifies bot claims by their P248=Q19938912 reference
 * (Assemblée nationale open data source).
 */
import 'dotenv/config'
import WBEdit from 'wikibase-edit'

const AFFECTED_ENTITIES = [
  'Q63537077',  // Marie-Do Aeschlimann (wrong date from timezone bug)
]

const BOT_SOURCE_QID = 'Q3475482' // Sénat (France)
const USER_AGENT = 'PoliGraphBot/0.1.0 (https://github.com/ironlam/poligraph-wikibot)'

interface WikidataClaim {
  id: string
  mainsnak: { datavalue?: { value?: { id?: string } } }
  qualifiers?: Record<string, Array<{ datavalue?: { value?: { time?: string } } }>>
  references?: Array<{ snaks?: Record<string, Array<{ datavalue?: { value?: unknown } }>> }>
}

async function fetchP39Claims(entityId: string): Promise<WikidataClaim[]> {
  const url = `https://www.wikidata.org/w/api.php?action=wbgetclaims&entity=${entityId}&property=P39&format=json`
  const res = await fetch(url, { headers: { 'User-Agent': USER_AGENT } })
  const data = await res.json() as { claims?: { P39?: WikidataClaim[] } }
  return data.claims?.P39 ?? []
}

function isBotClaim(claim: WikidataClaim): boolean {
  return (claim.references ?? []).some(ref =>
    (ref.snaks?.P248 ?? []).some(s => {
      const val = s.datavalue?.value
      return typeof val === 'object' && val !== null && 'id' in val && (val as { id: string }).id === BOT_SOURCE_QID
    })
  )
}

async function main() {
  const dryRun = process.argv.includes('--dry-run')
  const instance = process.env.WIKIDATA_INSTANCE || 'https://www.wikidata.org'

  console.log(`=== Cleanup duplicate bot claims ===`)
  console.log(`Mode: ${dryRun ? 'DRY RUN' : 'LIVE'}`)
  console.log(`Instance: ${instance}\n`)

  const wbEdit = WBEdit({
    instance: instance as `http${string}`,
    credentials: {
      username: process.env.WIKIDATA_BOT_USERNAME!,
      password: process.env.WIKIDATA_BOT_PASSWORD!,
    },
    bot: false,
    maxlag: 20,
    summary: 'Removing P39 claim with incorrect date (timezone bug) — will re-add with correct date',
    userAgent: USER_AGENT,
  })

  let totalRemoved = 0

  for (const entityId of AFFECTED_ENTITIES) {
    const claims = await fetchP39Claims(entityId)
    const botClaims = claims.filter(isBotClaim)

    if (botClaims.length === 0) {
      console.log(`${entityId}: no bot claims found, skipping`)
      continue
    }

    console.log(`${entityId}: found ${botClaims.length} bot claims to remove`)

    for (const claim of botClaims) {
      const start = claim.qualifiers?.P580?.[0]?.datavalue?.value?.time?.slice(1, 11) ?? '?'
      const end = claim.qualifiers?.P582?.[0]?.datavalue?.value?.time?.slice(1, 11) ?? 'current'

      if (dryRun) {
        console.log(`  would remove: ${claim.id} (${start} -> ${end})`)
      } else {
        try {
          await (wbEdit as any).claim.remove({ guid: claim.id })
          console.log(`  removed: ${claim.id} (${start} -> ${end})`)
          totalRemoved++
        } catch (err) {
          console.error(`  FAILED: ${claim.id}: ${err instanceof Error ? err.message : err}`)
        }
      }
    }
  }

  console.log(`\nDone. Removed ${totalRemoved} claims.`)
}

main().catch(err => { console.error(err); process.exit(1) })
