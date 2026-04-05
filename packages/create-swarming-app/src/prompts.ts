import * as p from "@clack/prompts";
import { isValidPackageName, toValidPackageName } from "./utils.js";

export type Template =
  | "static"
  | "websocket"
  | "blockchain-solana"
  | "blockchain-evm"
  | "kubernetes";

export type Framework = "next" | "vite" | "vanilla";

export interface ProjectOptions {
  projectName: string;
  template: Template;
  framework: Framework;
  includeExampleData: boolean;
  initGit: boolean;
}

export async function runPrompts(
  defaultName?: string
): Promise<ProjectOptions | null> {
  const project = await p.group(
    {
      projectName: () =>
        p.text({
          message: "Project name:",
          placeholder: defaultName ?? "my-visualization",
          defaultValue: defaultName ?? "my-visualization",
          validate(value) {
            if (!value.trim()) return "Project name is required.";
            const pkgName = toValidPackageName(value);
            if (!isValidPackageName(pkgName))
              return `"${value}" is not a valid package name.`;
          },
        }),
      template: () =>
        p.select({
          message: "Template:",
          options: [
            {
              value: "static" as const,
              label: "Static data",
              hint: "fastest start",
            },
            {
              value: "websocket" as const,
              label: "WebSocket stream",
            },
            {
              value: "blockchain-solana" as const,
              label: "Blockchain (Solana)",
            },
            {
              value: "blockchain-evm" as const,
              label: "Blockchain (Ethereum/Base)",
            },
            {
              value: "kubernetes" as const,
              label: "Kubernetes monitoring",
            },
          ],
        }),
      framework: () =>
        p.select({
          message: "Framework:",
          options: [
            { value: "next" as const, label: "Next.js" },
            { value: "vite" as const, label: "Vite + React" },
            { value: "vanilla" as const, label: "Vanilla (CDN script tag)" },
          ],
        }),
      includeExampleData: () =>
        p.confirm({
          message: "Include example data?",
          initialValue: true,
        }),
      initGit: () =>
        p.confirm({
          message: "Initialize git?",
          initialValue: true,
        }),
    },
    {
      onCancel() {
        p.cancel("Operation cancelled.");
        process.exit(0);
      },
    }
  );

  return project as ProjectOptions;
}

const TEMPLATE_ALIASES: Record<string, Template> = {
  static: "static",
  websocket: "websocket",
  ws: "websocket",
  solana: "blockchain-solana",
  "blockchain-solana": "blockchain-solana",
  evm: "blockchain-evm",
  ethereum: "blockchain-evm",
  base: "blockchain-evm",
  "blockchain-evm": "blockchain-evm",
  kubernetes: "kubernetes",
  k8s: "kubernetes",
};

const FRAMEWORK_ALIASES: Record<string, Framework> = {
  next: "next",
  nextjs: "next",
  vite: "vite",
  vanilla: "vanilla",
  cdn: "vanilla",
};

export function resolveTemplate(input: string): Template | undefined {
  return TEMPLATE_ALIASES[input.toLowerCase()];
}

export function resolveFramework(input: string): Framework | undefined {
  return FRAMEWORK_ALIASES[input.toLowerCase()];
}
