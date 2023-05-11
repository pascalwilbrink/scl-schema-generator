import { XMLBuilder } from "fast-xml-parser";
import { XsAttribute, XsElement } from "./schema";
import { XsAttributeGroup } from "./schema/attribute-group";
import { XsComplexContent } from "./schema/complex-content";
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

type Element = XsComplexType;

const randomNumberBetween = (min: number, max: number): number => {
  return Math.floor(Math.random() * (max - min + 1) + min);
};

export class XMLWriter {
  private _simpleTypes: Map<string, XsSimpleType>;
  private _complexTypes: Map<string, XsComplexType>;
  private _elements: Map<string, XsElement>;
  private _attributeGroups: Map<String, XsAttributeGroup>;

  private _tree: ElementTree;

  constructor() {
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

      const xml: any = {};

      const element = this.createElement(sclElement, xsd);
      element["@xmlns"] = "http://www.iec.ch/61850/2003/SCL";

      xml[`${sclElement["@name"]}`] = element;
      const result = builder.build(xml);

      resolve(result);
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
      return Array.from(
        nodeTreeElement.$ref["xs:sequence"]?.["xs:element"] || []
      );
    });
  }

  private getNodeTreeAttributes(node: Node): XsAttribute[] {
    const nodeTree: Node[] = this.getNodeTree(node);

    const attributes: XsAttribute[] = nodeTree.flatMap((nodeTreeElement) => {
      const attributes: XsAttribute[] = Array.from(
        nodeTreeElement.$ref["xs:complexContent"]?.["xs:extension"]?.[
          "xs:attribute"
        ] || []
      );

      const attributeGroups: XsAttribute[] = Array.from(
        nodeTreeElement.$ref["xs:complexContent"]?.["xs:extension"]?.[
          "xs:attributeGroup"
        ] || []
      ).flatMap((attributeGroup) => {
        return (
          this._attributeGroups.get(attributeGroup["@ref"]!)?.[
            "xs:attribute"
          ] || []
        );
      });

      return [...attributes, ...attributeGroups];
    });

    return attributes;
  }

  private createElementFromComplexContent(
    node: Node,
    complexContent: XsComplexContent,
    schema: XsSchema
  ): any {
    const element: any = {};

    if (!complexContent) {
      return element;
    }

    const extension: XsExtension | undefined = complexContent["xs:extension"];
    if (!extension) {
      return element;
    }

    const elements: XsElement[] = this.getNodeTreeElements(node!).concat(
      extension["xs:sequence"]?.["xs:element"] || []
    );

    const attributes: XsAttribute[] = (
      extension["xs:attribute"]
        ? Array.isArray(extension["xs:attribute"])
          ? extension["xs:attribute"]
          : [extension["xs:attribute"]]
        : []
    ).concat(this.getNodeTreeAttributes(node!));

    attributes.forEach((attribute) => {
      const createAttribute = () => {
        element[`@${attribute["@name"]}`] = attribute["@fixed"]
          ? attribute["@fixed"]
          : attribute["@default"]
          ? attribute["@default"]
          : "FOO";
      };

      if (attribute["@use"] === "required") {
        createAttribute();
      } else if (attribute["@use"] === "optional") {
        if (randomNumberBetween(0, 1) === 1) {
          createAttribute();
        }
      }
    });

    elements.forEach((e) => {
      const min: number = e["@minOccurs"] || 0;
      const max: number = Number(e["@maxOccurs"]) || 2;

      for (let i = 0; i < randomNumberBetween(min, max); i++) {
        const child = this.createChild(e, schema);

        if (child && Object.keys(element).includes(child.name)) {
          element[child.name].push(child.element);
        } else {
          if (child) {
            element[child.name] = [child.element];
          }
        }
      }
    });

    return element;
  }

  private createChild(
    element: XsElement,
    schema: XsSchema
  ): { name: string; element: any } | undefined {
    if (element["@ref"]) {
      const xsElement: XsElement | undefined = this._elements.get(
        element["@ref"]!
      );

      return {
        name: element["@ref"],
        element: this.createElement(xsElement!, schema),
      };
    }
    if (element["@type"]) {
      const type: string = element["@type"].includes(":")
        ? element["@type"].split(":")[1]!
        : element["@type"]!;

      const xsComplexType: XsComplexType | undefined =
        this._complexTypes.get(type);

      return {
        name: element["@name"]!,
        element: this.createElementFromComplexContent(
          this._tree.nodes.get(type)!,
          xsComplexType?.["xs:complexContent"]!,
          schema
        ),
      };
    }
    return undefined;
  }

  private createElement(xsElement: XsElement, schema: XsSchema): any {
    if (!xsElement) {
      return {};
    }

    const complexType = xsElement["@type"]
      ? this._complexTypes.get(xsElement["@type"])
      : xsElement["xs:complexType"];

    const complexContent = complexType?.["xs:complexContent"];

    if (complexContent) {
      const node: Node = this._tree.nodes.get(
        complexContent["xs:extension"]?.["@base"]!
      )!;
      return this.createElementFromComplexContent(node, complexContent, schema);
    }

    return {};
  }
}
