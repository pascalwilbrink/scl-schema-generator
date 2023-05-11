import { XsAttribute } from "./attribute";

export interface XsAttributeGroup {
  "@ref"?: string;
  "xs:attribute"?: XsAttribute[];
}
