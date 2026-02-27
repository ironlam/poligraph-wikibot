# Poligraph Wikibot

[![Wikidata Sync](https://github.com/ironlam/poligraph-wikibot/actions/workflows/sync.yml/badge.svg)](https://github.com/ironlam/poligraph-wikibot/actions/workflows/sync.yml)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

Bot Wikidata qui contribue les données de mandats parlementaires français depuis [Poligraph](https://poligraph.fr) vers [Wikidata](https://www.wikidata.org).

## Pourquoi ?

Poligraph agrège des données officielles françaises (data.gouv.fr, API Sénat, HATVP) pour enrichir les fiches de politiciens. Aujourd'hui Poligraph **consomme** Wikidata mais ne **contribue** pas en retour.

Ce bot boucle la boucle : les données vérifiées de sources officielles sont poussées vers Wikidata, améliorant la qualité des données ouvertes sur les politiciens français pour tout le monde.

## Fonctionnement

Le bot suit un pipeline en 4 étapes :

```
FETCH  → Lire les mandats depuis la base Poligraph (lecture seule)
DIFF   → Comparer avec le snapshot local → produire un changeset
RECONCILE → Vérifier l'état Wikidata actuel (anti-doublon)
WRITE  → Appliquer les modifications via wikibase-edit
```

### Approche diff-based

Plutôt que de tout réécrire à chaque exécution, le bot maintient un **snapshot** de ce qu'il a déjà poussé. À chaque run, il ne pousse que les **changements** :

| Action | Condition | Résultat |
|--------|-----------|----------|
| `ADD` | Nouveau mandat, absent du snapshot | Création d'un claim P39 |
| `UPDATE` | Mandat existant, qualifiers changés (ex: date de fin ajoutée) | Mise à jour du qualifier |
| `SKIP` | Aucun changement | Rien |

### Scope actuel (v0)

- **P39** (position held) : mandats de député et sénateur
- **Qualifiers** : P580 (début), P582 (fin)
- **Références** : P248 (stated in) + P854 (reference URL) + P813 (retrieved)
- **Sources** : [data.assemblee-nationale.fr](https://data.assemblee-nationale.fr), [senat.fr API](https://www.senat.fr/api-senat/senateurs.json)

## Installation

```bash
git clone https://github.com/ironlam/poligraph-wikibot.git
cd poligraph-wikibot
npm install
cp .env.example .env
```

## Configuration

```env
# Base de données Poligraph (lecture seule)
DATABASE_URL=postgresql://readonly_user:password@host:5432/poligraph

# Identifiants bot Wikidata (Special:BotPasswords)
WIKIDATA_BOT_USERNAME=PoligraphBot
WIKIDATA_BOT_PASSWORD=botpassword_name@generated_token

# Options
DRY_RUN=true                              # true par défaut (aucune écriture)
WIKIDATA_INSTANCE=https://test.wikidata.org  # test.wikidata.org par défaut
```

## Utilisation

```bash
# Dry run (par défaut) — affiche les edits sans les appliquer
npm run sync

# Limiter à 50 edits
npm run sync -- --limit=50

# Mode live (écriture réelle sur Wikidata)
DRY_RUN=false npm run sync

# Lancer les tests
npm test
```

### Exemple de sortie (dry run)

```
=== Poligraph Wikibot ===
Mode: DRY RUN
Date: 2026-02-27

1. Fetching mandates from Poligraph DB...
   Found 1247 parliamentary mandates with Wikidata IDs
2. Computing diff against snapshot...
   ADD: 1247 | UPDATE: 0 | SKIP: 0

3. DRY RUN — would perform these edits:
   ADD  Q182764 (Marine Le Pen): Q3044918 [2024-07-07 -> current]
   ADD  Q3055816 (Bruno Retailleau): Q19803890 [2023-10-01 -> current]
   ...

Done.
```

## Structure du projet

```
src/
├── config/
│   ├── wikidata.ts      # P-IDs, Q-IDs des positions parlementaires
│   └── sources.ts       # URLs et items Wikidata des sources officielles
├── db/
│   ├── types.ts         # Types des mandats Poligraph
│   └── reader.ts        # Connexion read-only à la DB
├── diff/
│   ├── types.ts         # Types snapshot, changeset, diff
│   ├── snapshot.ts      # Lecture/écriture du snapshot JSON
│   └── compute.ts       # Calcul du diff (ADD/UPDATE/SKIP)
├── wikidata/
│   ├── client.ts        # Wrapper wikibase-edit (auth, maxlag, rate limit)
│   └── write.ts         # Écriture de claims P39 avec qualifiers et références
├── bot/
│   └── run.ts           # Orchestrateur principal
└── index.ts             # Point d'entrée CLI
```

## Format des edits Wikidata

Chaque mandat parlementaire est poussé comme un [statement P39](https://www.wikidata.org/wiki/Property:P39) :

```
Item:    Q182764 (Marine Le Pen)
Claim:   P39 = Q3044918 (membre de l'Assemblée nationale française)
         ├── P580 = 2024-07-07 (start time)
         └── P582 = [vide si en cours]
Reference:
         ├── P248 = Q19938912 (Assemblée nationale)
         ├── P854 = https://data.assemblee-nationale.fr/acteurs/deputes-en-exercice
         └── P813 = 2026-02-27 (retrieved)
```

La **réconciliation** (`matchingQualifiers: ['P580']`) évite les doublons : si un claim P39 existe déjà avec la même date de début, il n'est pas recréé.

## CI/CD

Le workflow GitHub Actions (`.github/workflows/sync.yml`) :
- **Déclenchement** : `repository_dispatch` depuis politic-tracker après le sync quotidien, ou `workflow_dispatch` manuel
- **Dry-run par défaut** pour `repository_dispatch`
- **Snapshot** : commité automatiquement après chaque run live

## Approbation communautaire Wikidata

Le bot suit le processus standard [Wikidata:Bots](https://www.wikidata.org/wiki/Wikidata:Bots) :

1. Tests sur [test.wikidata.org](https://test.wikidata.org)
2. Demande sur [Wikidata:Requests for permissions/Bot](https://www.wikidata.org/wiki/Wikidata:Requests_for_permissions/Bot)
3. Test run de 50-250 edits sur Wikidata réel
4. Revue communautaire (~1-2 semaines)
5. Attribution du flag bot

## Évolutions prévues

- [ ] P4100 — Groupes parlementaires
- [ ] P4703 — Identifiants HATVP
- [ ] P102 — Appartenance politique
- [ ] P18 — Photos officielles
- [ ] Détection bidirectionnelle (corrections communautaires Wikidata → Poligraph)

## Licence

[MIT](LICENSE)

## Liens

- [Poligraph](https://poligraph.fr) — Plateforme de transparence politique
- [Issue #212](https://github.com/ironlam/politic-tracker/issues/212) — Issue source
- [wikibase-edit](https://github.com/maxlath/wikibase-edit) — Bibliothèque d'écriture Wikidata
- [Wikidata:Bots](https://www.wikidata.org/wiki/Wikidata:Bots) — Politique des bots
