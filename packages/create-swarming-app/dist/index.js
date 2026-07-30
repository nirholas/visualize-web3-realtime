#!/usr/bin/env node

// src/index.ts
import * as p2 from "@clack/prompts";
import pc2 from "picocolors";

// src/prompts.ts
import * as p from "@clack/prompts";

// src/utils.ts
import { execSync } from "child_process";
import fs from "fs";
import path from "path";
function detectPackageManager() {
  const userAgent = process.env.npm_config_user_agent ?? "";
  if (userAgent.startsWith("yarn")) return "yarn";
  if (userAgent.startsWith("pnpm")) return "pnpm";
  if (userAgent.startsWith("bun")) return "bun";
  return "npm";
}
function getInstallCommand(pm) {
  return pm === "yarn" ? "yarn" : `${pm} install`;
}
function getRunCommand(pm, script) {
  if (pm === "npm") return `npm run ${script}`;
  if (pm === "yarn") return `yarn ${script}`;
  if (pm === "pnpm") return `pnpm ${script}`;
  return `bun run ${script}`;
}
function isValidPackageName(name) {
  return /^(?:@[a-z0-9-*~][a-z0-9-*._~]*\/)?[a-z0-9-~][a-z0-9-._~]*$/.test(name);
}
function toValidPackageName(name) {
  return name.trim().toLowerCase().replace(/\s+/g, "-").replace(/^[._]/, "").replace(/[^a-z0-9-~]+/g, "-");
}
function initGit(projectDir) {
  try {
    execSync("git init", { cwd: projectDir, stdio: "ignore" });
    execSync("git add -A", { cwd: projectDir, stdio: "ignore" });
    execSync('git commit -m "Initial commit from create-swarming-app"', {
      cwd: projectDir,
      stdio: "ignore"
    });
    return true;
  } catch {
    return false;
  }
}
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}
function replacePlaceholders(dir, replacements) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      replacePlaceholders(fullPath, replacements);
    } else {
      let content = fs.readFileSync(fullPath, "utf-8");
      let changed = false;
      for (const [key, value] of Object.entries(replacements)) {
        const placeholder = `{{${key}}}`;
        if (content.includes(placeholder)) {
          content = content.replaceAll(placeholder, value);
          changed = true;
        }
      }
      if (changed) {
        fs.writeFileSync(fullPath, content);
      }
    }
  }
}

// src/prompts.ts
async function runPrompts(defaultName) {
  const project = await p.group(
    {
      projectName: () => p.text({
        message: "Project name:",
        placeholder: defaultName ?? "my-visualization",
        defaultValue: defaultName ?? "my-visualization",
        validate(value) {
          if (!value.trim()) return "Project name is required.";
          const pkgName = toValidPackageName(value);
          if (!isValidPackageName(pkgName))
            return `"${value}" is not a valid package name.`;
        }
      }),
      template: () => p.select({
        message: "Template:",
        options: [
          {
            value: "static",
            label: "Static data",
            hint: "fastest start"
          },
          {
            value: "websocket",
            label: "WebSocket stream"
          },
          {
            value: "blockchain-solana",
            label: "Blockchain (Solana)"
          },
          {
            value: "blockchain-evm",
            label: "Blockchain (Ethereum/Base)"
          },
          {
            value: "kubernetes",
            label: "Kubernetes monitoring"
          }
        ]
      }),
      framework: () => p.select({
        message: "Framework:",
        options: [
          { value: "next", label: "Next.js" },
          { value: "vite", label: "Vite + React" },
          { value: "vanilla", label: "Vanilla (CDN script tag)" }
        ]
      }),
      includeExampleData: () => p.confirm({
        message: "Include example data?",
        initialValue: true
      }),
      initGit: () => p.confirm({
        message: "Initialize git?",
        initialValue: true
      })
    },
    {
      onCancel() {
        p.cancel("Operation cancelled.");
        process.exit(0);
      }
    }
  );
  return project;
}
var TEMPLATE_ALIASES = {
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
  k8s: "kubernetes"
};
var FRAMEWORK_ALIASES = {
  next: "next",
  nextjs: "next",
  vite: "vite",
  vanilla: "vanilla",
  cdn: "vanilla"
};
function resolveTemplate(input) {
  return TEMPLATE_ALIASES[input.toLowerCase()];
}
function resolveFramework(input) {
  return FRAMEWORK_ALIASES[input.toLowerCase()];
}

// src/scaffold.ts
import fs2 from "fs";
import path2 from "path";
import { fileURLToPath } from "url";
import pc from "picocolors";
var __dirname = path2.dirname(fileURLToPath(import.meta.url));
function getTemplatesDir() {
  const fromDist = path2.resolve(__dirname, "..", "templates");
  if (fs2.existsSync(fromDist)) return fromDist;
  return path2.resolve(__dirname, "..", "templates");
}
function scaffold(options) {
  const { projectName, template, framework, includeExampleData, initGit: initGit2 } = options;
  const targetDir = path2.resolve(process.cwd(), projectName);
  if (fs2.existsSync(targetDir)) {
    const entries = fs2.readdirSync(targetDir);
    if (entries.length > 0) {
      console.error(
        pc.red(`
  Error: Directory "${projectName}" is not empty.
`)
      );
      process.exit(1);
    }
  }
  const templatesDir = getTemplatesDir();
  const templateDir = path2.join(templatesDir, template);
  if (!fs2.existsSync(templateDir)) {
    console.error(pc.red(`
  Error: Template "${template}" not found.
`));
    process.exit(1);
  }
  copyDir(templateDir, targetDir);
  const packageName = toValidPackageName(projectName);
  replacePlaceholders(targetDir, {
    PROJECT_NAME: projectName,
    PACKAGE_NAME: packageName,
    PACKAGE_VERSION: "0.1.0",
    FRAMEWORK: framework
  });
  if (!includeExampleData) {
    const dataFile = path2.join(targetDir, "src", "data.json");
    if (fs2.existsSync(dataFile)) {
      fs2.unlinkSync(dataFile);
    }
    const dataTs = path2.join(targetDir, "src", "sample-data.ts");
    if (fs2.existsSync(dataTs)) {
      fs2.unlinkSync(dataTs);
    }
  }
  if (initGit2) {
    initGit(targetDir);
  }
  const pm = detectPackageManager();
  const installCmd = getInstallCommand(pm);
  const devCmd = getRunCommand(pm, "dev");
  console.log();
  console.log(pc.green(`  \u2714 Created ${pc.bold(projectName)}`));
  console.log();
  console.log(`  ${pc.cyan("cd")} ${projectName}`);
  console.log(`  ${pc.cyan(installCmd)}`);
  console.log(`  ${pc.cyan(devCmd)}`);
  console.log();
  console.log(
    `  Open ${pc.cyan("http://localhost:3000")} to see your visualization.`
  );
  console.log();
  console.log(pc.dim("  Next steps:"));
  console.log(pc.dim("  \u2192 Edit src/App.tsx to customize"));
  console.log(pc.dim("  \u2192 Read the docs: https://swarming.dev/docs"));
  console.log(pc.dim("  \u2192 Join Discord: https://discord.gg/swarming"));
  console.log();
  console.log(
    pc.yellow("  \u2B50 Star us on GitHub: https://github.com/swarming-vis/swarming")
  );
  console.log();
}

// src/index.ts
async function main() {
  p2.intro(pc2.bgCyan(pc2.black(" create-swarming-app ")));
  const args = process.argv.slice(2);
  const flags = parseFlags(args);
  const positional = args.filter((a) => !a.startsWith("--"));
  let options;
  if (flags.template && positional[0]) {
    const template = resolveTemplate(flags.template);
    if (!template) {
      p2.cancel(`Unknown template: "${flags.template}"`);
      process.exit(1);
    }
    const framework = flags.framework ? resolveFramework(flags.framework) : "vite";
    if (!framework) {
      p2.cancel(`Unknown framework: "${flags.framework}"`);
      process.exit(1);
    }
    options = {
      projectName: positional[0],
      template,
      framework,
      includeExampleData: flags["no-example-data"] !== "true",
      initGit: flags["no-git"] !== "true"
    };
  } else {
    options = await runPrompts(positional[0]);
  }
  if (!options) {
    p2.cancel("Operation cancelled.");
    process.exit(0);
  }
  const s = p2.spinner();
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
function parseFlags(args) {
  const flags = {};
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
