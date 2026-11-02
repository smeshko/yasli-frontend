export const receptionKindOrder = ["nursery", "kindergarten", "preschool"] as const;

export type ReceptionKind = (typeof receptionKindOrder)[number];

export const receptionKindLabels: Record<ReceptionKind, string> = {
  nursery: "Ясла",
  kindergarten: "Детска градина",
  preschool: "Подготвителна група",
};

export function labelForReceptionKind(kind: ReceptionKind): string {
  return receptionKindLabels[kind];
}

export const INFANT_GROUP_LABEL = "яслена група";
