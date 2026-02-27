import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import type { Snapshot } from './types.js'

const SNAPSHOT_PATH = path.resolve('data', 'snapshot.json')

export function emptySnapshot(): Snapshot {
  return {
    lastRun: new Date().toISOString(),
    version: 1,
    mandates: {},
  }
}

export async function loadSnapshot(): Promise<Snapshot> {
  if (!existsSync(SNAPSHOT_PATH)) return emptySnapshot()
  const raw = await readFile(SNAPSHOT_PATH, 'utf-8')
  return JSON.parse(raw) as Snapshot
}

export async function saveSnapshot(snapshot: Snapshot): Promise<void> {
  const dir = path.dirname(SNAPSHOT_PATH)
  if (!existsSync(dir)) await mkdir(dir, { recursive: true })
  snapshot.lastRun = new Date().toISOString()
  await writeFile(SNAPSHOT_PATH, JSON.stringify(snapshot, null, 2) + '\n')
}
