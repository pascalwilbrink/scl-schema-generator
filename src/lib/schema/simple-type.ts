import { XsRestriction } from "./restriction";
import { XsUnion } from "./union";

export interface XsSimpleType {
  "@name"?: string;
  "xs:restriction"?: XsRestriction;
  "xs:union"?: XsUnion;
}
