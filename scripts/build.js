import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "..");
const srcDir = path.join(rootDir, "src");
const distDir = path.join(rootDir, "dist");

const ensureDir = (dir) => {
  fs.mkdirSync(dir, { recursive: true });
};

const copyDir = (from, to) => {
  ensureDir(to);
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const srcPath = path.join(from, entry.name);
    const destPath = path.join(to, entry.name);
    if (entry.isDirectory()) {
      copyDir(srcPath, destPath);
    } else if (entry.isFile()) {
      fs.copyFileSync(srcPath, destPath);
    }
  }
};

const readJson = (filePath) => {
  if (!fs.existsSync(filePath)) return null;
  try {
    const raw = fs.readFileSync(filePath, "utf-8");
    const text = raw.replace(/^\uFEFF/, "");
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const mergeConfigWithEnv = (config) => {
  const merged = structuredClone(config);
  const env = process.env;

  if (env.NAV_TITLE) merged.site.title = env.NAV_TITLE;
  if (env.NAV_DESCRIPTION) merged.site.description = env.NAV_DESCRIPTION;
  if (env.NAV_THEME) merged.site.theme = env.NAV_THEME;
  if (env.NAV_BG_IMAGE) merged.site.backgroundImage = env.NAV_BG_IMAGE;
  if (env.NAV_GLASS_OPACITY) merged.site.glassOpacity = Number(env.NAV_GLASS_OPACITY);

  if (env.NAV_SEARCH_ENGINES_JSON) {
    merged.searchEngines = JSON.parse(env.NAV_SEARCH_ENGINES_JSON);
  }
  if (env.NAV_GROUPS_JSON) {
    merged.groups = JSON.parse(env.NAV_GROUPS_JSON);
  }

  merged.generatedAt = new Date().toISOString();
  return merged;
};

const build = () => {
  ensureDir(distDir);
  copyDir(srcDir, distDir);

  const configPath = path.join(srcDir, "config.json");
  const config = readJson(configPath) ?? {};

  const baseConfig = {
    site: {
      title: "个人导航",
      description: "简约现代导航站",
      theme: "auto",
      backgroundImage: "",
      glassOpacity: 0.62
    },
    searchEngines: [],
    groups: [],
    ...config
  };

  const finalConfig = mergeConfigWithEnv(baseConfig);
  const configJs = `window.__NAV_CONFIG__ = ${JSON.stringify(finalConfig, null, 2)};`;
  fs.writeFileSync(path.join(distDir, "config.js"), configJs, "utf-8");
};

build();