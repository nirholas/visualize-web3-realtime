import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import type { ProjectOptions } from "./prompts.js";
import {
  copyDir,
  replacePlaceholders,
  toValidPackageName,
  initGit as initGitRepo,
  detectPackageManager,
  getInstallCommand,
  getRunCommand,
} from "./utils.js";
import pc from "picocolors";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function getTemplatesDir(): string {
  // In built output, templates are at ../templates relative to dist/
  const fromDist = path.resolve(__dirname, "..", "templates");
  if (fs.existsSync(fromDist)) return fromDist;
  // Fallback for dev
  return path.resolve(__dirname, "..", "templates");
}

export function scaffold(options: ProjectOptions): void {
  const { projectName, template, framework, includeExampleData, initGit } =
    options;
  const targetDir = path.resolve(process.cwd(), projectName);

  if (fs.existsSync(targetDir)) {
    const entries = fs.readdirSync(targetDir);
    if (entries.length > 0) {
      console.error(
        pc.red(`\n  Error: Directory "${projectName}" is not empty.\n`)
      );
      process.exit(1);
    }
  }

  const templatesDir = getTemplatesDir();
  const templateDir = path.join(templatesDir, template);

  if (!fs.existsSync(templateDir)) {
    console.error(pc.red(`\n  Error: Template "${template}" not found.\n`));
    process.exit(1);
  }

  // Copy template files
  copyDir(templateDir, targetDir);

  // Replace placeholders
  const packageName = toValidPackageName(projectName);
  replacePlaceholders(targetDir, {
    PROJECT_NAME: projectName,
    PACKAGE_NAME: packageName,
    PACKAGE_VERSION: "0.1.0",
    FRAMEWORK: framework,
  });

  // Remove example data if not requested
  if (!includeExampleData) {
    const dataFile = path.join(targetDir, "src", "data.json");
    if (fs.existsSync(dataFile)) {
      fs.unlinkSync(dataFile);
    }
    const dataTs = path.join(targetDir, "src", "sample-data.ts");
    if (fs.existsSync(dataTs)) {
      fs.unlinkSync(dataTs);
    }
  }

  // Initialize git
  if (initGit) {
    initGitRepo(targetDir);
  }

  // Print success message
  const pm = detectPackageManager();
  const installCmd = getInstallCommand(pm);
  const devCmd = getRunCommand(pm, "dev");

  console.log();
  console.log(pc.green(`  ✔ Created ${pc.bold(projectName)}`));
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
  console.log(pc.dim("  → Edit src/App.tsx to customize"));
  console.log(pc.dim("  → Read the docs: https://swarming.dev/docs"));
  console.log(pc.dim("  → Join Discord: https://discord.gg/swarming"));
  console.log();
  console.log(
    pc.yellow("  ⭐ Star us on GitHub: https://github.com/swarming-vis/swarming")
  );
  console.log();
}
