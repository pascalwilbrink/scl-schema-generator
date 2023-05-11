import { XsElement } from "./schema";
import { XsComplexType } from "./schema/complex-type";
import { XsSchema } from "./schema/schema";
import { XsSimpleType } from "./schema/simple-type";
import { XMLParser } from "fast-xml-parser";

export class XsdParser {
  parse(input: string): Promise<XsSchema> {
    return new Promise((resolve, reject) => {
      const dom = new XMLParser({
        attributeNamePrefix: "@",
        ignoreAttributes: false,
      }).parse(input);

      const schema = dom["xs:schema"];

      const simpleTypes = schema["xs:simpleType"] as XsSimpleType[];

      const complexTypes = schema["xs:complexType"] as XsComplexType[];

      const elements = schema["xs:element"] as XsElement[];

      return resolve({
        elements: elements,
        complexTypes: complexTypes,
        simpleTypes: simpleTypes,
      });
    });
  }
}
