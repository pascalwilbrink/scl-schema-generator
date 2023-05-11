export interface XsAttribute {
  "@name": string;
  "@type": string;
  "@use"?: "optional" | "prohibited" | "required";
  "@default"?: string;
  "@fixed"?: string;
}
