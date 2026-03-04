# Poligraph Wikibot

Wikidata bot that contributes French parliamentary mandate data (P39) from Poligraph's verified official sources back to Wikidata.

## Commands

- `npm run sync` — Run the bot (reads DRY_RUN env, defaults to dry-run)
- `npm run sync:dry` — Explicitly dry-run
- `npm run sync -- --limit=50` — Limit to 50 edits
- `npm run sync -- --dry-run` — CLI flag for dry-run
- `npm test` — Run all tests (vitest)
- `npm run test:watch` — Watch mode
- `npm run build` — TypeScript compilation

## Environment Variables

```
DATABASE_URL          — Poligraph DB connection string (read-only)
WIKIDATA_BOT_USERNAME — Bot username (format: PoliGraphBot@PoliGraphBot)
WIKIDATA_BOT_PASSWORD — Bot password token (from Special:BotPasswords)
WIKIDATA_INSTANCE     — Target instance (default: https://test.wikidata.org)
DRY_RUN               — "true" (default) or "false"
```

## Architecture

**Diff-based batch bot.** Pipeline: FETCH → DIFF → RECONCILE → WRITE.

- `src/config/` — Wikidata P-IDs, Q-IDs, source references
- `src/db/` — Read-only Poligraph DB reader (pg)
- `src/diff/` — Snapshot persistence + changeset computation (ADD/UPDATE/SKIP)
- `src/wikidata/` — wikibase-edit client wrapper + write operations
- `src/bot/run.ts` — Main orchestrator
- `data/snapshot.json` — Last pushed state (committed after each live run)

## Key Patterns

- **wikibase-edit v8** uses branded types (`Q${number}`, `Guid`). We cast with `as AnyId` in write.ts since our IDs come as runtime strings from the DB.
- **Reconciliation**: `skip-on-value-match` with `matchingQualifiers: ['P580']` prevents duplicate claims.
- **References**: Every P39 claim gets P248 (stated in) + P854 (reference URL) + P813 (retrieved). Required by Wikidata bot policy.
- **No DELETE in v0**: We only add claims and update qualifiers (end dates). Never remove existing Wikidata statements.

## Wikidata Bot Approval

Status: **Not yet submitted.** Process:
1. Test on test.wikidata.org first
2. Post request on Wikidata:Requests for permissions/Bot
3. Do test run (50-250 edits on real Wikidata)
4. Community review (~1-2 weeks)
5. Bot flag granted

## Related

- **politic-tracker** — Main Poligraph app, source of mandate data
- **Issue**: ironlam/politic-tracker#212
- **Design doc**: `docs/plans/2026-02-27-wikidata-bot-design.md`

## Rules

- Never mention Claude in commits
- DB access is READ-ONLY — the bot never writes to Poligraph
- Default to dry-run in CI until bot is approved
- maxlag=5 (Wikidata etiquette)
