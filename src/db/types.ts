export type PoligraphMandateType =
  | "DEPUTE"
  | "SENATEUR"
  | "PREMIER_MINISTRE"
  | "MINISTRE"
  | "SECRETAIRE_ETAT"
  | "MINISTRE_DELEGUE";

export interface PoligraphMandate {
  id: string;
  type: PoligraphMandateType;
  isCurrent: boolean;
  startDate: Date | null;
  endDate: Date | null;
  institution: string | null;
  politicianId: string;
  politicianFirstName: string;
  politicianLastName: string;
  wikidataId: string | null;
  parliamentaryGroupWikidataId: string | null;
}
