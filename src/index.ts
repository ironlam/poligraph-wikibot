import 'dotenv/config'
import { run } from './bot/run.js'

const args = process.argv.slice(2)
const dryRun = process.env.DRY_RUN !== 'false' || args.includes('--dry-run')
const limitArg = args.find(a => a.startsWith('--limit='))
const limit = limitArg ? parseInt(limitArg.split('=')[1], 10) : undefined

run({ dryRun, limit }).catch((err) => {
  console.error('Fatal error:', err)
  process.exit(1)
})
