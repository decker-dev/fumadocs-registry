/**
 * Remark plugin that extracts JSX children from <ComponentPreview>
 * and injects them as the `code` prop at build time
 */
import type { Root } from "mdast";
import type { MdxJsxAttribute, MdxJsxFlowElement } from "mdast-util-mdx-jsx";
import type { Transformer } from "unified";
import { visit } from "unist-util-visit";
import type { VFile } from "vfile";
import type { VFileData } from "./types.js";

function isComponentPreview(node: unknown): node is MdxJsxFlowElement {
  return (
    typeof node === "object" &&
    node !== null &&
    "type" in node &&
    (node.type === "mdxJsxFlowElement" || node.type === "mdxJsxTextElement") &&
    "name" in node &&
    node.name === "ComponentPreview"
  );
}

function hasCodeProp(node: MdxJsxFlowElement): boolean {
  return (node.attributes || []).some(
    (attr) =>
      attr.type === "mdxJsxAttribute" &&
      attr.name === "code" &&
      attr.value !== null &&
      attr.value !== undefined,
  );
}

function getAttributeValue(
  node: MdxJsxFlowElement,
  attrName: string,
): string | null {
  const attr = (node.attributes || []).find(
    (a) => a.type === "mdxJsxAttribute" && a.name === attrName,
  );

  if (!attr || attr.type !== "mdxJsxAttribute") return null;
  if (typeof attr.value === "string") return attr.value;
  return null;
}

function getChildrenSource(
  node: MdxJsxFlowElement,
  fileContent: string,
): string | null {
  if (!node.children || node.children.length === 0) return null;

  const firstChild = node.children[0];
  const lastChild = node.children[node.children.length - 1];

  if (!firstChild?.position?.start || !lastChild?.position?.end) return null;

  const startOffset = firstChild.position.start.offset;
  const endOffset = lastChild.position.end.offset;

  if (startOffset === undefined || endOffset === undefined) return null;

  return fileContent.slice(startOffset, endOffset).trim();
}

export interface RemarkComponentPreviewOptions {
  /**
   * Whether to collect preview data for registry generation
   * @default true
   */
  collectPreviews?: boolean;
}

/**
 * Remark plugin for ComponentPreview
 * - Injects `code` prop with children source
 * - Collects preview metadata in vfile.data.componentPreviews
 */
export function remarkComponentPreview(
  options: RemarkComponentPreviewOptions = {},
): Transformer<Root, Root> {
  const { collectPreviews = true } = options;

  return (tree: Root, file: VFile) => {
    const fileContent = file.value as string;
    if (!fileContent) return;

    if (collectPreviews) {
      const data = file.data as VFileData;
      data.componentPreviews = [];
    }

    visit(tree, (node) => {
      if (!isComponentPreview(node)) return;

      const childrenSource = getChildrenSource(node, fileContent);
      if (!childrenSource) return;

      // Collect metadata
      if (collectPreviews) {
        const component = getAttributeValue(node, "component");
        const example = getAttributeValue(node, "example");

        if (component && example) {
          const data = file.data as VFileData;
          data.componentPreviews?.push({
            component,
            example,
            code: childrenSource,
            sourcePath: file.path || "",
          });
        }
      }

      // Skip if code prop already exists
      if (hasCodeProp(node)) return;

      // Inject code prop
      node.attributes = node.attributes || [];

      const codeAttr: MdxJsxAttribute = {
        type: "mdxJsxAttribute",
        name: "code",
        value: {
          type: "mdxJsxAttributeValueExpression",
          value: `\`${childrenSource.replace(/\\/g, "\\\\").replace(/`/g, "\\`").replace(/\$\{/g, "\\${")}\``,
          data: {
            estree: {
              type: "Program",
              sourceType: "module",
              body: [
                {
                  type: "ExpressionStatement",
                  expression: {
                    type: "TemplateLiteral",
                    expressions: [],
                    quasis: [
                      {
                        type: "TemplateElement",
                        value: {
                          raw: childrenSource
                            .replace(/\\/g, "\\\\")
                            .replace(/`/g, "\\`")
                            .replace(/\$\{/g, "\\${"),
                          cooked: childrenSource,
                        },
                        tail: true,
                      },
                    ],
                  },
                },
              ],
            },
          },
        },
      };

      node.attributes.push(codeAttr);
    });
  };
}

export default remarkComponentPreview;
