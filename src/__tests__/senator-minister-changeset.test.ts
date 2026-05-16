import { describe, expect, it } from "vitest";
import { computeChangeset } from "../diff/compute.js";
import { emptySnapshot } from "../diff/snapshot.js";
import { MANDATE_TYPE_TO_QID } from "../config/wikidata.js";
import type { PoligraphMandate } from "../db/types.js";

function makeMandate(overrides: Partial<PoligraphMandate>): PoligraphMandate {
  return {
    id: "m-test",
    type: "DEPUTE",
    isCurrent: true,
    startDate: new Date("2024-07-07"),
    endDate: null,
    institution: null,
    politicianId: "pol-1",
    politicianFirstName: "Jean",
    politicianLastName: "Dupont",
    wikidataId: "Q123456",
    parliamentaryGroupWikidataId: null,
    ...overrides,
  };
}

describe("senator + minister changeset", () => {
  it("produces an addClaim for an active senator with believable dates", () => {
    const senator = makeMandate({
      id: "m-senator",
      type: "SENATEUR",
      startDate: new Date("2023-10-01"),
      politicianLastName: "Retailleau",
      wikidataId: "Q3055816",
    });

    const changeset = computeChangeset([senator], emptySnapshot());
    expect(changeset.adds).toHaveLength(1);
    expect(changeset.adds[0].value).toBe(MANDATE_TYPE_TO_QID.SENATEUR);
    expect(changeset.adds[0].qualifiers.P580).toBe("2023-10-01");
  });

  it("produces an addClaim for an active minister", () => {
    const minister = makeMandate({
      id: "m-minister",
      type: "MINISTRE",
      startDate: new Date("2024-09-21"),
      politicianLastName: "Barnier",
      wikidataId: "Q207935",
    });

    const changeset = computeChangeset([minister], emptySnapshot());
    expect(changeset.adds).toHaveLength(1);
    expect(changeset.adds[0].value).toBe(MANDATE_TYPE_TO_QID.MINISTRE);
    expect(changeset.adds[0].qualifiers.P580).toBe("2024-09-21");
  });

  it("produces an addClaim for the Premier ministre", () => {
    const pm = makeMandate({
      id: "m-pm",
      type: "PREMIER_MINISTRE",
      startDate: new Date("2025-09-09"),
      politicianLastName: "Lecornu",
      wikidataId: "Q3122270",
    });

    const changeset = computeChangeset([pm], emptySnapshot());
    expect(changeset.adds).toHaveLength(1);
    expect(changeset.adds[0].value).toBe(MANDATE_TYPE_TO_QID.PREMIER_MINISTRE);
  });

  it("skips mandate types that are not mapped in MANDATE_TYPE_TO_QID", () => {
    const unsupported = makeMandate({
      id: "m-unsupported",
      // Cast through unknown because the type union is restricted to supported
      // government and parliamentary types. A municipal councillor would not
      // pass through the SQL reader, but we want to guarantee a runtime guard.
      type: "CONSEILLER_MUNICIPAL" as unknown as PoligraphMandate["type"],
      politicianLastName: "Local",
      wikidataId: "Q999999",
    });

    const changeset = computeChangeset([unsupported], emptySnapshot());
    expect(changeset.adds).toHaveLength(0);
    expect(changeset.updates).toHaveLength(0);
  });
});
