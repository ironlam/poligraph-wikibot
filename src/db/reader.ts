import pg from 'pg'
import type { PoligraphMandate } from './types.js'

const { Pool } = pg

let pool: InstanceType<typeof Pool> | null = null

export function getPool() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL is required')
    pool = new Pool({
      connectionString,
      max: 5,
      idleTimeoutMillis: 10_000,
      connectionTimeoutMillis: 10_000,
      ssl: { rejectUnauthorized: false },
    })
  }
  return pool
}

export async function disconnect() {
  if (pool) {
    await pool.end()
    pool = null
  }
}

export async function fetchParliamentaryMandates(): Promise<PoligraphMandate[]> {
  const db = getPool()
  const result = await db.query<PoligraphMandate>(`
    SELECT
      m.id,
      m.type,
      m."isCurrent",
      m."startDate",
      m."endDate",
      m.institution,
      m."politicianId",
      p."firstName" as "politicianFirstName",
      p."lastName" as "politicianLastName",
      eid."externalId" as "wikidataId"
    FROM "Mandate" m
    JOIN "Politician" p ON p.id = m."politicianId"
    LEFT JOIN "ExternalId" eid ON eid."politicianId" = p.id AND eid.source = 'WIKIDATA'
    WHERE m.type IN ('DEPUTE') -- SENATEUR disabled: dates are incorrect in Poligraph DB
      AND eid."externalId" IS NOT NULL
    ORDER BY p."lastName", m."startDate"
  `)
  return result.rows
}
