import { XsField } from "./field";
import { XsSelector } from "./selector";

export interface XsUnique {
  "xs:selector"?: XsSelector;
  "xs:field"?: XsField[];
  "@name"?: string;
}
