import WBEdit from 'wikibase-edit'

export type WBEditInstance = ReturnType<typeof WBEdit>

export interface WikidataClientConfig {
  instance: `http${string}`
  username: string
  password: string
  dryRun: boolean
}

export function createWikidataClient(config: WikidataClientConfig): WBEditInstance {
  return WBEdit({
    instance: config.instance,
    credentials: {
      username: config.username,
      password: config.password,
    },
    bot: false,
    maxlag: 5,
    summary: 'Updating French parliamentary mandates from official open data (Poligraph)',
    userAgent: 'PoliGraphBot/0.1.0 (https://github.com/ironlam/poligraph-wikibot)',
    dry: config.dryRun,
  })
}

export function getClientFromEnv(): WBEditInstance {
  const instance = (process.env.WIKIDATA_INSTANCE || 'https://test.wikidata.org') as `http${string}`
  const username = process.env.WIKIDATA_BOT_USERNAME
  const password = process.env.WIKIDATA_BOT_PASSWORD

  if (!username || !password) {
    throw new Error('WIKIDATA_BOT_USERNAME and WIKIDATA_BOT_PASSWORD are required')
  }

  const dryRun = process.env.DRY_RUN !== 'false'
  return createWikidataClient({ instance, username, password, dryRun })
}
