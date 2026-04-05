import * as p from "@clack/prompts";
import pc from "picocolors";
import {
  runPrompts,
  resolveTemplate,
  resolveFramework,
  type ProjectOptions,
} from "./prompts.js";
import { scaffold } from "./scaffold.js";

async function main() {
  p.intro(pc.bgCyan(pc.black(" create-swarming-app ")));

  const args = process.argv.slice(2);
  const flags = parseFlags(args);
  const positional = args.filter((a) => !a.startsWith("--"));

  let options: ProjectOptions | null;

  if (flags.template && positional[0]) {
    // Direct mode: npx create-swarming-app my-viz --template websocket --framework next
    const template = resolveTemplate(flags.template);
    if (!template) {
      p.cancel(`Unknown template: "${flags.template}"`);
      process.exit(1);
    }
    const framework = flags.framework
      ? resolveFramework(flags.framework)
      : "vite";
    if (!framework) {
      p.cancel(`Unknown framework: "${flags.framework}"`);
      process.exit(1);
    }

    options = {
      projectName: positional[0],
      template,
      framework,
      includeExampleData: flags["no-example-data"] !== "true",
      initGit: flags["no-git"] !== "true",
    };
  } else {
    // Interactive mode
    options = await runPrompts(positional[0]);
  }

  if (!options) {
    p.cancel("Operation cancelled.");
    process.exit(0);
  }

  const s = p.spinner();
  s.start("Scaffolding project...");

  try {
    scaffold(options);
    s.stop("Project scaffolded!");
  } catch (err) {
    s.stop("Failed to scaffold project.");
    console.error(err);
    process.exit(1);
  }
}

function parseFlags(args: string[]): Record<string, string> {
  const flags: Record<string, string> = {};
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      const next = args[i + 1];
      if (next && !next.startsWith("--")) {
        flags[key] = next;
        i++;
      } else {
        flags[key] = "true";
      }
    }
  }
  return flags;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
