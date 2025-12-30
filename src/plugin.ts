/**
 * Fumadocs MDX plugin for automatic registry generation
 */

import { promises as fs } from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { generateAllDemoBlocks, writeDemoBlocks } from "./generate-blocks.js";
import {
  generateBundleJson,
  generateComponentJsonFiles,
  generateRegistryJson,
  scanComponents,
  writeRegistryFiles,
} from "./generate-registry.js";
import type { ComponentInfo, PluginOptions, ResolvedOptions } from "./types.js";

/**
 * Resolve plugin options with defaults
 */
export function resolveOptions(options: PluginOptions): ResolvedOptions {
  return {
    baseUrl: options.baseUrl,
    registry: {
      name: options.registry?.name ?? "components",
      homepage: options.registry?.homepage ?? "",
    },
    componentsDir: options.componentsDir ?? "src/registry",
    componentsDirs: options.componentsDirs ?? [
      { name: "ui", type: "ui" },
      { name: "lib", type: "lib" },
    ],
    docsDirs: options.docsDirs ?? ["content/docs/components"],
    outputDir: options.outputDir ?? "public/r",
    shadcnComponents: options.shadcnComponents ?? {},
  };
}

/**
 * Build registry - standalone function that can be called from CLI or programmatically
 */
export async function buildRegistry(options: PluginOptions): Promise<void> {
  const resolved = resolveOptions(options);
  const outputDir = path.resolve(process.cwd(), resolved.outputDir);

  console.log(pc.cyan("[fumadocs-registry]"), "Scanning components...");

  // Scan components
  const components = await scanComponents(resolved);
  console.log(
    pc.cyan("[fumadocs-registry]"),
    `Found ${pc.green(components.length.toString())} components`,
  );

  // Scan MDX files for previews and descriptions
  await scanMdxFiles(components, resolved);

  // Ensure output directory exists
  await fs.mkdir(outputDir, { recursive: true });

  // Generate and write registry files
  const registry = await generateRegistryJson(components, resolved);
  const componentFiles = await generateComponentJsonFiles(components, resolved);
  const bundle = await generateBundleJson(components, resolved);

  await writeRegistryFiles(registry, componentFiles, bundle, resolved);

  // Generate and write demo blocks
  const blocks = await generateAllDemoBlocks(components, resolved);
  await writeDemoBlocks(blocks, resolved);

  const totalFiles = 1 + componentFiles.size + 1 + blocks.size;

  console.log(
    pc.cyan("[fumadocs-registry]"),
    `Generated ${pc.green(totalFiles.toString())} files in ${pc.dim(resolved.outputDir)}`,
  );
}

/**
 * Scan MDX files for ComponentPreview and frontmatter
 */
async function scanMdxFiles(
  components: ComponentInfo[],
  options: ResolvedOptions,
): Promise<void> {
  const docsDirs = options.docsDirs.map((d) => path.resolve(process.cwd(), d));

  for (const dir of docsDirs) {
    try {
      const files = await fs.readdir(dir);

      for (const file of files) {
        if (!file.endsWith(".mdx")) continue;

        const filePath = path.join(dir, file);
        const content = await fs.readFile(filePath, "utf-8");
        const componentName = file.replace(".mdx", "");

        const component = components.find((c) => c.name === componentName);
        if (!component) continue;

        // Extract frontmatter description
        const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---/);
        if (frontmatterMatch) {
          const frontmatter = frontmatterMatch[1];
          const descMatch = frontmatter.match(/description:\s*(.+)/);
          if (descMatch) {
            component.description = descMatch[1]
              .trim()
              .replace(/^["']|["']$/g, "");
          }
        }

        // Extract ComponentPreview instances
        const previewRegex = /<ComponentPreview[^>]*>/g;

        for (const match of content.matchAll(previewRegex)) {
          const tag = match[0];

          const compMatch = tag.match(/component=["']([^"']+)["']/);
          const exampleMatch = tag.match(/example=["']([^"']+)["']/);

          if (!compMatch || compMatch[1] !== componentName || !exampleMatch)
            continue;

          const startPos = (match.index ?? 0) + tag.length;
          const closingTag = "</ComponentPreview>";
          const endPos = content.indexOf(closingTag, startPos);

          if (endPos === -1) continue;

          const code = content.slice(startPos, endPos).trim();
          if (!code) continue;

          component.previews.push({
            component: componentName,
            example: exampleMatch[1],
            code,
            sourcePath: filePath,
          });
        }
      }
    } catch {
      // Directory doesn't exist
    }
  }
}

export default buildRegistry;
