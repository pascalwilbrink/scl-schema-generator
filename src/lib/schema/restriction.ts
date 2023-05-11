import { XsEnumeration } from "./enumeration";
import { XsLength } from "./length";
import { XsMaxLength } from "./max-length";
import { XsMinInclusive } from "./min-inclusive";
import { XsMinLength } from "./min-length";
import { XsPattern } from "./pattern";
import { XsUnion } from "./union";

export interface XsRestriction {
  "@base": string;
  "xs:pattern"?: XsPattern;
  "xs:enumeration"?: XsEnumeration[];
  "xs:minInclusive"?: XsMinInclusive;
  "xs:minLength"?: XsMinLength;
  "xs:maxLength"?: XsMaxLength;
  "xs:length"?: XsLength;
}
