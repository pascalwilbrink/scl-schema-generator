import { XsComplexType } from "./complex-type";
import { XsElement } from "./element";
import { XsSimpleType } from "./simple-type";

export type XsSchema = {
  elements: XsElement[];
  complexTypes: XsComplexType[];
  simpleTypes: XsSimpleType[];
};
