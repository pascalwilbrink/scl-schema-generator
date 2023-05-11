import { XsAny } from "./any";
import { XsElement } from "./element";

export interface XsSequence {
  "xs:element"?: XsElement[];
  "xs:any"?: XsAny;
}
