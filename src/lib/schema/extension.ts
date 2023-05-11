import { XsAttribute } from "./attribute";
import { XsAttributeGroup } from "./attribute-group";
import { XsSequence } from "./sequence";

export interface XsExtension {
  "@base": string;
  "xs:attribute"?: XsAttribute[];
  "xs:attributeGroup"?: XsAttributeGroup[];
  "xs:sequence"?: XsSequence;
}
