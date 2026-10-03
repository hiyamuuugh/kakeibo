import { normalize } from "@/lib/normalize";

export interface ImportExclusionLike {
  name: string;
}

export const isImportExcluded = (text: string, exclusions: ImportExclusionLike[]) => {
  const normalizedText = normalize(text);
  return exclusions.some((exclusion) => {
    const name = normalize(exclusion.name);
    return name.length > 0 && normalizedText.includes(name);
  });
};
