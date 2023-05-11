import { XsField } from "./field";
import { XsSelector } from "./selector";

export interface XsKey {
  "xs:selector"?: XsSelector;
  "xs:field"?: XsField[];
  "@name"?: string;
}
