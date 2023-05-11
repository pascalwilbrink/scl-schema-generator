import fs from "fs";
import path from "path";

import xmlFormat from "xml-formatter";

import { XsdParser, XsdReader } from "./lib";
import { XMLWriter } from "./lib/xml-writer";

const reader: XsdReader = new XsdReader();
const parser: XsdParser = new XsdParser();
const writer: XMLWriter = new XMLWriter({
  attributeSuppliers: {
    "SCL.Private#type": (element: any): string => {
      return "PRIVATE_TYPE";
    },
  },
});

reader
  .readFromUrl(
    "https://raw.githubusercontent.com/pascalwilbrink/scl-schema-viewer/main/src/assets/schemas/2007B4.xsd"
  )
  .then((data) => parser.parse(data))
  .then((res) => writer.write(res))
  .then((xml) => {
    fs.writeFileSync(
      path.join(
        __dirname,
        "../",
        "__GENERATED__",
        `${new Date().getTime()}__generated.scl`
      ),
      xmlFormat(xml),
      {
        encoding: "utf-8",
      }
    );
  })
  .catch((err) => console.error(err));
