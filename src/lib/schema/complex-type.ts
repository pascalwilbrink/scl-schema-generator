import { XsAnyAttribute } from "./any-attribute";
import { XsAttribute } from "./attribute";
import { XsComplexContent } from "./complex-content";
import { XsSequence } from "./sequence";

export interface XsComplexType {
  "@name"?: string;
  "@abstract"?: string;
  "xs:sequence"?: XsSequence;
  "xs:anyAttribute"?: XsAnyAttribute;
  "xs:complexContent"?: XsComplexContent;
  "xs:attribute"?: XsAttribute;
}
