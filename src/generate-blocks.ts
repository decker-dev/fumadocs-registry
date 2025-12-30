/**
 * Generate demo block JSON files for v0/shadcn
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import { detectShadcnInCode } from "./extract-dependencies.js";
import type {
  ComponentInfo,
  ComponentPreviewData,
  RegistryItem,
  ResolvedOptions,
} from "./types.js";

const SHADCN_IMPORTS: Record<string, string> = {
  Label: "label",
  Button: "button",
  Input: "input",
  Badge: "badge",
  Progress: "progress",
};

/**
 * Generate a demo page file content
 */
export function generateDemoPage(
  component: ComponentInfo,
  exampleCode: string,
  additionalImports?: ComponentInfo[],
): string {
  const shadcnImports: string[] = [];
  for (const [compName, fileName] of Object.entries(SHADCN_IMPORTS)) {
    if (exampleCode.includes(`<${compName}`)) {
      shadcnImports.push(
        `import { ${compName} } from "@/components/ui/${fileName}";`,
      );
    }
  }

  let importStatement: string;
  if (component.exports.length > 0) {
    importStatement = `import {\n  ${component.exports.join(",\n  ")},\n} from "@/components/ui/${component.name}";`;
  } else {
    const defaultName = kebabToPascal(component.name);
    importStatement = `import { ${defaultName} } from "@/components/ui/${component.name}";`;
  }

  const additionalImportStatements: string[] = [];
  if (additionalImports) {
    for (const addComp of additionalImports) {
      if (addComp.name !== component.name && addComp.exports.length > 0) {
        const usedExports = addComp.exports.filter((exp) =>
          exampleCode.includes(`<${exp}`),
        );
        if (usedExports.length > 0) {
          additionalImportStatements.push(
            `import {\n  ${usedExports.join(",\n  ")},\n} from "@/components/ui/${addComp.name}";`,
          );
        }
      }
    }
  }

  const allImports = [
    ...shadcnImports,
    importStatement,
    ...additionalImportStatements,
  ].join("\n");

  return `${allImports}

export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-8">
      ${exampleCode}
    </div>
  );
}
`;
}

/**
 * Generate demo block JSON for a single preview
 *
 * Blocks use registryDependencies to let the CLI install components,
 * rather than bundling everything in files array
 */
export async function generateDemoBlock(
  component: ComponentInfo,
  preview: ComponentPreviewData,
  allComponents: ComponentInfo[],
  options: ResolvedOptions,
): Promise<RegistryItem> {
  const componentContent = await fs.readFile(
    path.resolve(process.cwd(), component.sourcePath),
    "utf-8",
  );

  const additionalComponents = allComponents.filter(
    (c) =>
      c.name !== component.name &&
      component.registryDependencies.some(
        (dep) => dep.includes(c.name) || dep === c.name,
      ),
  );

  const demoContent = generateDemoPage(
    component,
    preview.code,
    additionalComponents,
  );

  const files = [
    {
      path: `registry/${options.registry.name}/${component.name}/page.tsx`,
      content: demoContent,
      type: "registry:page" as const,
      target: `app/${component.name}/page.tsx`,
    },
    {
      path: `registry/${options.registry.name}/${component.name}/${component.name}.tsx`,
      content: componentContent,
      type: "registry:component" as const,
      target: `components/ui/${component.name}.tsx`,
    },
  ];

  for (const addComp of additionalComponents) {
    const addContent = await fs.readFile(
      path.resolve(process.cwd(), addComp.sourcePath),
      "utf-8",
    );
    files.push({
      path: `registry/${options.registry.name}/${component.name}/${addComp.name}.tsx`,
      content: addContent,
      type: "registry:component" as const,
      target: `components/ui/${addComp.name}.tsx`,
    });
  }

  const shadcnInExample = detectShadcnInCode(preview.code);

  // For blocks, include the component's own registry URL so CLI can install it with all its bundled deps
  const componentRegistryUrl = `${options.baseUrl}/${component.name}.json`;

  const allRegistryDeps = [
    componentRegistryUrl,
    ...component.registryDependencies.filter(
      (dep) => !dep.includes(options.baseUrl),
    ),
    ...shadcnInExample,
  ].filter((dep, index, self) => self.indexOf(dep) === index); // unique

  return {
    $schema: "https://ui.shadcn.com/schema/registry-item.json",
    name: `${component.name}-demo-${preview.example}`,
    type: "registry:block",
    description: component.description || `${component.title} demo`,
    dependencies: component.dependencies,
    registryDependencies:
      allRegistryDeps.length > 0 ? allRegistryDeps : undefined,
    files,
    meta: {
      iframeHeight: "600px",
    },
  };
}

/**
 * Generate all demo blocks for all components
 */
export async function generateAllDemoBlocks(
  components: ComponentInfo[],
  options: ResolvedOptions,
): Promise<Map<string, RegistryItem>> {
  const blocks = new Map<string, RegistryItem>();

  for (const component of components) {
    for (const preview of component.previews) {
      const block = await generateDemoBlock(
        component,
        preview,
        components,
        options,
      );
      blocks.set(`${component.name}-demo-${preview.example}.json`, block);
    }
  }

  return blocks;
}

/**
 * Write demo block files to output directory
 */
export async function writeDemoBlocks(
  blocks: Map<string, RegistryItem>,
  options: ResolvedOptions,
): Promise<void> {
  const outputDir = path.resolve(process.cwd(), options.outputDir);

  await fs.mkdir(outputDir, { recursive: true });

  for (const [filename, block] of blocks) {
    await fs.writeFile(
      path.join(outputDir, filename),
      JSON.stringify(block, null, 2),
    );
  }
}

function kebabToPascal(str: string): string {
  return str
    .split("-")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join("");
}
