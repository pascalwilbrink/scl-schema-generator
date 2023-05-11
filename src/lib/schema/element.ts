import { XsComplexType } from "./complex-type";
import { XsKey } from "./key";
import { XsUnique } from "./unique";

export type XsElement = {
  "@name"?: string;
  "@ref"?: string;
  "@type"?: string;
  "@maxOccurs"?: number | "unbounded";
  "@minOccurs"?: number;
  "@form"?: string;
  "xs:unique"?: XsUnique[];
  "xs:key"?: XsKey[];
  "xs:complexType"?: XsComplexType;
};
