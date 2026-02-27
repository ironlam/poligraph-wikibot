// Wikidata properties used by the bot
export const PROPERTIES = {
  POSITION_HELD: 'P39',
  START_TIME: 'P580',
  END_TIME: 'P582',
  PARLIAMENTARY_TERM: 'P2937',
  PARLIAMENTARY_GROUP: 'P4100',
  STATED_IN: 'P248',
  REFERENCE_URL: 'P854',
  RETRIEVED: 'P813',
} as const

// Wikidata Q-IDs for French parliamentary positions
// Multiple Q-IDs exist per position — we use the canonical ones for writing
export const POSITIONS = {
  DEPUTE: 'Q3044918',       // membre de l'Assemblée nationale française
  SENATEUR: 'Q19803890',    // membre du Sénat français
} as const

// Map from Poligraph MandateType to Wikidata Q-ID
export const MANDATE_TYPE_TO_QID: Record<string, string> = {
  DEPUTE: POSITIONS.DEPUTE,
  SENATEUR: POSITIONS.SENATEUR,
}

// Parliamentary terms (législatures) — Sénat uses triennial renewal, not legislatures
export const LEGISLATURES: Record<string, string> = {
  'XVII': 'Q117155032',     // XVIIe législature (2024-)
  'XVI': 'Q112567597',      // XVIe législature (2022-2024)
  'XV': 'Q30897847',        // XVe législature (2017-2022)
}
