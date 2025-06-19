import {
  existsSync,
  symlinkSync,
  unlinkSync,
  lstatSync,
  readdirSync,
  statSync,
} from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const target = join(__dirname, "..", ".env");

const rootDirs = ["apps", "packages"];

function getSubdirectories(basePath) {
  const fullBase = join(__dirname, "..", basePath);
  if (!existsSync(fullBase)) return [];

  return readdirSync(fullBase)
    .map((name) => join(fullBase, name))
    .filter((path) => statSync(path).isDirectory());
}

function createSymlink(linkPath) {
  try {
    if (existsSync(linkPath)) {
      const stat = lstatSync(linkPath);
      if (stat.isSymbolicLink()) {
        return;
      } else {
        console.warn(
          `[!] File exists but is not a symlink, removing: ${linkPath}`
        );
        unlinkSync(linkPath);
      }
    }

    symlinkSync(target, linkPath);
    console.log(`[+] Symlink created: ${linkPath} → ${target}`);
  } catch (err) {
    if (err instanceof Error) {
      console.error(
        `[✘] Failed to create symlink at ${linkPath}:`,
        err.message
      );
    } else {
      console.error(`[✘] Unknown error creating symlink at ${linkPath}:`, err);
    }
  }
}

function linkEnvToAllDirs() {
  for (const base of rootDirs) {
    const dirs = getSubdirectories(base);
    for (const dir of dirs) {
      const linkPath = join(dir, ".env");
      createSymlink(linkPath);
    }
  }
}

linkEnvToAllDirs();
