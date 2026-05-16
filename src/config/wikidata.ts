// Wikidata properties used by the bot
export const PROPERTIES = {
  POSITION_HELD: "P39",
  START_TIME: "P580",
  END_TIME: "P582",
  PARLIAMENTARY_TERM: "P2937",
  PARLIAMENTARY_GROUP: "P4100",
  STATED_IN: "P248",
  REFERENCE_URL: "P854",
  RETRIEVED: "P813",
} as const;

// Wikidata Q-IDs for French parliamentary and government positions
// Multiple Q-IDs exist per position, we use the canonical ones for writing
export const POSITIONS = {
  DEPUTE: "Q3044918", // député français (verified 2026-05-16)
  SENATEUR: "Q19803890", // membre du Sénat français
  PREMIER_MINISTRE: "Q1587677", // Premier ministre français (verified 2026-05-16)
  // TODO: verify Q-ID on wikidata.org before live use, generic Q83307 may not be French-specific
  MINISTRE: "Q83307",
  // TODO: verify Q-ID on wikidata.org before live use
  SECRETAIRE_ETAT: "Q1352101",
  // TODO: verify Q-ID on wikidata.org before live use
  MINISTRE_DELEGUE: "Q22989102",
} as const;

// Map from Poligraph MandateType to Wikidata Q-ID
export const MANDATE_TYPE_TO_QID: Record<string, string> = {
  DEPUTE: POSITIONS.DEPUTE,
  SENATEUR: POSITIONS.SENATEUR,
  PREMIER_MINISTRE: POSITIONS.PREMIER_MINISTRE,
  MINISTRE: POSITIONS.MINISTRE,
  SECRETAIRE_ETAT: POSITIONS.SECRETAIRE_ETAT,
  MINISTRE_DELEGUE: POSITIONS.MINISTRE_DELEGUE,
};

// Parliamentary terms (législatures) — Sénat uses triennial renewal, not legislatures
export const LEGISLATURES: Record<string, string> = {
  XVII: "Q117155032", // XVIIe législature (2024-)
  XVI: "Q112567597", // XVIe législature (2022-2024)
  XV: "Q30897847", // XVe législature (2017-2022)
};

// Legislature date boundaries (Assemblée nationale only)
const LEGISLATURE_PERIODS: Array<{
  key: string;
  start: string;
  end: string | null;
}> = [
  { key: "XV", start: "2017-06-21", end: "2022-06-21" },
  { key: "XVI", start: "2022-06-22", end: "2024-07-07" },
  { key: "XVII", start: "2024-07-08", end: null },
];

/** Resolve a mandate start date to its legislature Q-ID, or null if unmapped. */
export function resolveLegislature(startDate: string): string | null {
  for (const period of LEGISLATURE_PERIODS) {
    if (startDate >= period.start && (!period.end || startDate <= period.end)) {
      return LEGISLATURES[period.key] ?? null;
    }
  }
  return null;
}
