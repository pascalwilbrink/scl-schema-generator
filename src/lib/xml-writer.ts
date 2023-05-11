import { XMLBuilder } from "fast-xml-parser";
import { XsAttribute, XsElement } from "./schema";
import { XsAttributeGroup } from "./schema/attribute-group";
import { XsComplexType } from "./schema/complex-type";
import { XsExtension } from "./schema/extension";
import { XsSchema } from "./schema/schema";
import { XsSimpleType } from "./schema/simple-type";

export interface Node {
  $ref: Element;
  name: string;
  extendsFrom: Node | null;
  abstract: boolean;
  complex: boolean;
}

export interface ElementTree {
  nodes: Map<String, Node>;
}

type Element = XsComplexType | XsSimpleType;

const randomNumberBetween = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

let i = 0;

export interface AttributeSupplier {
  (element: any): string;
}

const DEFAULT_ATTRIBUTE_SUPPLIER: AttributeSupplier = (
  element: any
): string => {
  return "FOO";
};

export interface XMLOptions {
  attributeSuppliers: {
    [selector: string]: AttributeSupplier;
  };
}
export class XMLWriter {
  private _simpleTypes: Map<string, XsSimpleType>;
  private _complexTypes: Map<string, XsComplexType>;
  private _elements: Map<string, XsElement>;
  private _attributeGroups: Map<String, XsAttributeGroup>;

  private _tree: ElementTree;

  constructor(private options?: XMLOptions) {
    this._simpleTypes = new Map<string, XsSimpleType>();
    this._complexTypes = new Map<string, XsComplexType>();
    this._elements = new Map<string, XsElement>();
    this._attributeGroups = new Map<String, XsAttributeGroup>();

    this._tree = {
      nodes: new Map<String, Node>(),
    };
  }

  write(xsd: XsSchema): Promise<any> {
    return new Promise((resolve, reject) => {
      xsd.simpleTypes.forEach((simpleType) => {
        this._simpleTypes.set(simpleType["@name"]!, simpleType);
      });

      xsd.complexTypes.forEach((complexType) => {
        this._complexTypes.set(complexType["@name"]!, complexType);
      });

      xsd.elements.forEach((element) => {
        this._elements.set(element["@name"]!, element);
      });

      const sclElement: XsElement = xsd.elements.find(
        (e) => e["@name"] === "SCL"
      )!;

      Array.from(this._complexTypes.values()).forEach((complexType) => {
        this._tree.nodes.set(complexType["@name"]!, {
          name: complexType["@name"]!,
          $ref: complexType,
          extendsFrom: null,
          abstract: complexType["@abstract"] === "true",
          complex: true,
        });
      });

      Array.from(this._simpleTypes.values()).forEach((simpleType) => {
        this._tree.nodes.set(simpleType["@name"]!, {
          name: simpleType["@name"]!,
          $ref: simpleType,
          extendsFrom: null,
          abstract: false,
          complex: false,
        });
      });

      Array.from(this._complexTypes.values()).forEach((complexType) => {
        const extension: XsExtension | undefined =
          complexType["xs:complexContent"]?.["xs:extension"];
        if (extension) {
          const base: string = extension["@base"];
          const extendsFrom = this._complexTypes.has(base)
            ? this._complexTypes.get(base)!
            : this._simpleTypes.get(base)!;

          if (this._tree.nodes.has(extendsFrom["@name"]!)) {
            const extendsFromNode: Node = this._tree.nodes.get(
              extendsFrom["@name"]!
            )!;
            this._tree.nodes.get(complexType["@name"]!)!.extendsFrom =
              extendsFromNode;
          }
        }
      });

      const builder: XMLBuilder = new XMLBuilder({
        attributeNamePrefix: "@",
        ignoreAttributes: false,
      });

      const xml = {
        "@xmlns": "http://www.iec.ch/61850/2003/SCL",
        SCL: this.createElementFromXsElement(sclElement, "SCL"),
      };

      resolve(builder.build(xml));
    });
  }

  private getNodeTree(node: Node): Node[] {
    const getExtendsFromNode = (node: Node): Node | null => node.extendsFrom;

    let parentNode: Node | null = node;

    const nodeTree: Node[] = [];

    nodeTree.push(node);

    while (parentNode?.extendsFrom != null) {
      parentNode = getExtendsFromNode(parentNode);
      if (parentNode) {
        nodeTree.push(parentNode);
      }
    }

    return nodeTree.reverse();
  }

  private getNodeTreeElements(node: Node): Element[] {
    const nodeTree: Node[] = this.getNodeTree(node);

    return nodeTree.flatMap((nodeTreeElement) => {
      const elements: XsElement[] = [];
      const complexType: XsComplexType = nodeTreeElement.$ref;

      if (
        complexType["xs:complexContent"]?.["xs:extension"]?.["xs:sequence"]?.[
          "xs:element"
        ]
      ) {
        const sequenceElements: XsElement[] = Array.isArray(
          complexType["xs:complexContent"]["xs:extension"]["xs:sequence"][
            "xs:element"
          ]
        )
          ? complexType["xs:complexContent"]["xs:extension"]["xs:sequence"][
              "xs:element"
            ]
          : [
              complexType["xs:complexContent"]["xs:extension"]["xs:sequence"][
                "xs:element"
              ],
            ];

        Array.from(sequenceElements || []).forEach((element) => {
          elements.push(element);
        });
      }

      Array.from(
        (nodeTreeElement.$ref as XsComplexType)["xs:sequence"]?.[
          "xs:element"
        ] || []
      ).forEach((element) => {
        elements.push(element);
      });

      return elements;
    });
  }

  private getNodeTreeAttributes(node: Node): XsAttribute[] {
    const nodeTree: Node[] = this.getNodeTree(node);

    return nodeTree.flatMap((nodeTreeElement) => {
      const attributes: XsAttribute[] = [];
      const complexType: XsComplexType = nodeTreeElement.$ref;

      if (
        complexType["xs:complexContent"]?.["xs:extension"]?.["xs:attribute"]
      ) {
        const elementAttributes: XsAttribute[] = Array.isArray(
          complexType["xs:complexContent"]["xs:extension"]["xs:attribute"]
        )
          ? complexType["xs:complexContent"]["xs:extension"]["xs:attribute"]
          : [complexType["xs:complexContent"]["xs:extension"]["xs:attribute"]];

        Array.from(elementAttributes || []).forEach((attribute) =>
          attributes.push(attribute)
        );
      }

      if (complexType["xs:attribute"]) {
        (Array.isArray(complexType["xs:attribute"])
          ? complexType["xs:attribute"]
          : [complexType["xs:attribute"]] || []
        ).forEach((attribute) => attributes.push(attribute));
      }

      const attributeGroups: XsAttribute[] = Array.from(
        (nodeTreeElement.$ref as XsComplexType)["xs:complexContent"]?.[
          "xs:extension"
        ]?.["xs:attributeGroup"] || []
      ).flatMap((attributeGroup) => {
        return (
          this._attributeGroups.get(attributeGroup["@ref"]!)?.[
            "xs:attribute"
          ] || []
        );
      });

      return [...attributes, ...attributeGroups];
    });
  }

  private createElementFromXsElement(
    xsElement: XsElement,
    selector: string
  ): any {
    i++;

    if (i > 1500) {
      return;
    }

    const complexType: XsComplexType =
      xsElement["xs:complexType"] ||
      (xsElement["@ref"]
        ? this._complexTypes.get(
            this._elements.get(xsElement["@ref"])?.["@type"]!
          )
        : this._complexTypes.get(xsElement["@type"]!)!)!;

    const baseName: string | undefined =
      complexType["xs:complexContent"]?.["xs:extension"]?.["@base"];

    const baseNode =
      this._tree.nodes.get(complexType["@name"]!) ||
      this._tree.nodes.get(baseName!);

    const childElements: XsElement[] = baseNode
      ? this.getNodeTreeElements(baseNode!).concat(
          complexType["xs:complexContent"]?.["xs:extension"]?.["xs:sequence"]?.[
            "xs:element"
          ] || []
        )
      : [];

    const element: any = {};

    this.addAttributesToElement(element, baseNode!, `${selector}`);

    childElements.forEach((childElement) => {
      if (childElement["@type"]) {
        const node: Node | undefined = this._tree.nodes.get(
          childElement["@type"]!
        );
        if (node) {
          const child: any = this.createElementFromXsElement(
            childElement,
            `${selector}.${childElement["@name"]}`
          );
          if (child) {
            this.addAttributesToElement(
              child,
              node,
              `${selector}.${childElement["@name"]}`
            );

            element[childElement["@name"]!] = child;
          }
        }
      } else if (childElement["@ref"]) {
        const child: any = this.createElementFromXsElement(
          childElement,
          `${selector}.${childElement["@ref"]}`
        );

        if (child) {
          element[childElement["@ref"]] = child;
        }
      }
    });

    return element;
  }

  private addAttributesToElement(
    element: any,
    node: Node,
    selector: string
  ): any {
    const attributes: XsAttribute[] = this.getNodeTreeAttributes(node);
    if (i < 10) {
      // console.log(node);
    }

    if (node.name === "tHeader") {
      console.log(node);
    }

    attributes.forEach((attribute) => {
      const attributeSelector: string = `${selector}#${attribute["@name"]}`;

      const attributeSupplier: AttributeSupplier =
        this.options?.attributeSuppliers[attributeSelector] ||
        DEFAULT_ATTRIBUTE_SUPPLIER;

      element[`@${attribute["@name"]!}`] =
        attribute["@fixed"] ||
        attribute["@default"] ||
        attributeSupplier(element);
    });

    return element;
  }
}
