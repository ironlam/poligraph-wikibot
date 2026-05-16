import { PROPERTIES } from "./wikidata.js";

// Wikidata items representing our data sources (P248 stated in)
export const SOURCES = {
  ASSEMBLEE_NATIONALE_OPEN_DATA: "Q19938912", // Assemblée nationale (France)
  SENAT: "Q3475482", // Sénat (France)
  // TODO: verify Q-ID on wikidata.org before live use
  GOUVERNEMENT_FR: "Q3505546", // Gouvernement de la République française
} as const;

// Reference URLs (P854)
export const SOURCE_URLS = {
  AN_DATA: "https://data.assemblee-nationale.fr/acteurs/deputes-en-exercice",
  SENAT_API: "https://www.senat.fr/api-senat/senateurs.json",
  GOUVERNEMENT_FR: "https://www.gouvernement.fr/composition-du-gouvernement",
} as const;

// Build a reference snak for a deputy mandate
export function deputeReference(retrievedDate: string) {
  return {
    [PROPERTIES.STATED_IN]: SOURCES.ASSEMBLEE_NATIONALE_OPEN_DATA,
    [PROPERTIES.REFERENCE_URL]: SOURCE_URLS.AN_DATA,
    [PROPERTIES.RETRIEVED]: retrievedDate,
  };
}

// Build a reference snak for a senator mandate
export function senateurReference(retrievedDate: string) {
  return {
    [PROPERTIES.STATED_IN]: SOURCES.SENAT,
    [PROPERTIES.REFERENCE_URL]: SOURCE_URLS.SENAT_API,
    [PROPERTIES.RETRIEVED]: retrievedDate,
  };
}

// Build a reference snak for a government mandate (ministre, secrétaire d'État, etc.)
export function gouvernementReference(retrievedDate: string) {
  return {
    [PROPERTIES.STATED_IN]: SOURCES.GOUVERNEMENT_FR,
    [PROPERTIES.REFERENCE_URL]: SOURCE_URLS.GOUVERNEMENT_FR,
    [PROPERTIES.RETRIEVED]: retrievedDate,
  };
}
