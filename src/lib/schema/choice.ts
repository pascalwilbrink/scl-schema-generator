import { XsElement } from "./element";
import { XsSequence } from "./sequence";

export type XsChoice =
  | {
      xsElement: XsElement[];
    }
  | {
      xsSequence: XsSequence[];
    };
