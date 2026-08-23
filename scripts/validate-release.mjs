import assert from "node:assert/strict";
import { lstat, readFile, readdir, realpath } from "node:fs/promises";
import { basename, dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PUBLIC_REPOSITORY = "https://github.com/Oqoqo-Inc/agent-plugin";
const PLUGIN_NAME = "oqoqo";
const MARKETPLACE_NAME = "oqoqo";
const PRODUCTION_MCP_URL = "https://mcp.oqoqo.ai/mcp";
const DOCS_MCP_URL = "https://docs.oqoqo.ai/mcp";
const SKILL_NAMES = [
  "product-eval-authoring",
  "product-eval-setup",
  "product-eval-tasks",
];
const SKILL_ROOTS = [
  "skills",
  "plugins/oqoqo/skills",
  "distributions/openai/plugins/oqoqo/skills",
  "distributions/claude-code/plugins/oqoqo/skills",
];
const REQUIRED_FILES = [
  ".agents/plugins/marketplace.json",
  ".claude-plugin/marketplace.json",
  ".cursor-plugin/marketplace.json",
  ".github/plugin/marketplace.json",
  "distributions/claude-code/plugins/oqoqo/.claude-plugin/plugin.json",
  "distributions/claude-code/plugins/oqoqo/.mcp.json",
  "distributions/openai/plugins/oqoqo/.codex-plugin/plugin.json",
  "distributions/openai/plugins/oqoqo/.mcp.json",
  "distributions/openai/plugins/oqoqo/assets/oqoqo-logo.png",
  "LICENSE",
  "plugins/oqoqo/assets/oqoqo-logo.png",
  "plugins/oqoqo/mcp.json",
  "plugins/oqoqo/openai-submission.json",
  "plugins/oqoqo/plugin.json",
  "README.md",
  "scripts/validate-release.mjs",
  ...SKILL_NAMES.flatMap((skillName) =>
    SKILL_ROOTS.map((skillRoot) => `${skillRoot}/${skillName}/SKILL.md`),
  ),
];
const ALLOWED_TOP_LEVEL = new Set([
  ".agents",
  ".claude-plugin",
  ".cursor-plugin",
  ".github",
  "distributions",
  "LICENSE",
  "plugins",
  "README.md",
  "scripts",
  "skills",
]);

export async function validateRelease(rootPath) {
  const root = await realpath(resolve(rootPath));
  assert.ok(
    (await lstat(root)).isDirectory(),
    "Release root must be a directory",
  );

  const topLevel = await readdir(root);
  for (const entry of topLevel) {
    assert.ok(
      ALLOWED_TOP_LEVEL.has(entry),
      `Unexpected top-level release path: ${entry}`,
    );
  }

  const paths = await walk(root);
  for (const path of paths) {
    const stat = await lstat(path);
    assert.equal(
      stat.isSymbolicLink(),
      false,
      `Release contains a symbolic link: ${relative(root, path)}`,
    );
  }
  for (const path of REQUIRED_FILES) {
    assert.ok(
      paths.includes(resolve(root, path)),
      `Release is missing ${path}`,
    );
  }
  const releaseFiles = [];
  for (const path of paths) {
    if ((await lstat(path)).isFile()) releaseFiles.push(relative(root, path));
  }
  assert.deepEqual(
    releaseFiles.sort(),
    [...REQUIRED_FILES].sort(),
    "Release contains an unexpected or missing file",
  );

  await assertOnlyPlugin(root, "plugins");
  await assertOnlyPlugin(root, "distributions/openai/plugins");
  await assertOnlyPlugin(root, "distributions/claude-code/plugins");

  const portableManifest = await json(
    resolve(root, "plugins/oqoqo/plugin.json"),
  );
  const openAiManifest = await json(
    resolve(
      root,
      "distributions/openai/plugins/oqoqo/.codex-plugin/plugin.json",
    ),
  );
  const claudeManifest = await json(
    resolve(
      root,
      "distributions/claude-code/plugins/oqoqo/.claude-plugin/plugin.json",
    ),
  );
  for (const [label, manifest] of [
    ["portable", portableManifest],
    ["OpenAI", openAiManifest],
    ["Claude", claudeManifest],
  ]) {
    assert.equal(manifest.name, PLUGIN_NAME, `${label} manifest name drifted`);
    assert.equal(
      manifest.repository,
      PUBLIC_REPOSITORY,
      `${label} repository drifted`,
    );
    assert.match(
      manifest.version ?? "",
      /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.-]+)?$/,
      `${label} version is invalid`,
    );
  }
  assert.equal(
    openAiManifest.version,
    portableManifest.version,
    "OpenAI version drifted",
  );
  assert.equal(
    claudeManifest.version,
    portableManifest.version,
    "Claude version drifted",
  );

  await validateMcp(resolve(root, "plugins/oqoqo/mcp.json"), "streamable-http");
  await validateMcp(
    resolve(root, "distributions/openai/plugins/oqoqo/.mcp.json"),
    "http",
  );
  await validateMcp(
    resolve(root, "distributions/claude-code/plugins/oqoqo/.mcp.json"),
    "http",
  );

  await validateOpenAiMarketplace(root);
  await validateClaudeMarketplace(root, portableManifest.version);
  await validatePortableMarketplace(
    root,
    ".cursor-plugin/marketplace.json",
    portableManifest.version,
  );
  await validatePortableMarketplace(
    root,
    ".github/plugin/marketplace.json",
    portableManifest.version,
  );
  await validateSkills(root);

  for (const path of paths) {
    if (!(await lstat(path)).isFile() || !isTextPath(path)) continue;
    if (relative(root, path) === "scripts/validate-release.mjs") continue;
    const contents = await readFile(path, "utf8");
    assert.doesNotMatch(
      contents,
      /oqoqo-staging/i,
      `${relative(root, path)} exposes staging`,
    );
    assert.doesNotMatch(
      contents,
      /staging\.mcp\.oqoqo\.ai/i,
      `${relative(root, path)} exposes the staging endpoint`,
    );
    assert.doesNotMatch(
      contents,
      /Oqoqo-Inc\/oqo-bench/i,
      `${relative(root, path)} exposes the private source repository`,
    );
  }

  console.log(
    `Validated public Oqoqo plugin release ${portableManifest.version}.`,
  );
}

async function validateOpenAiMarketplace(root) {
  const marketplace = await json(
    resolve(root, ".agents/plugins/marketplace.json"),
  );
  assert.equal(marketplace.name, MARKETPLACE_NAME);
  assert.equal(marketplace.plugins?.length, 1);
  const [plugin] = marketplace.plugins;
  assert.equal(plugin.name, PLUGIN_NAME);
  assert.equal(plugin.source?.source, "local");
  assert.equal(plugin.source?.path, "./distributions/openai/plugins/oqoqo");
  assert.equal(plugin.policy?.installation, "AVAILABLE");
  assert.equal(plugin.policy?.authentication, "ON_USE");
}

async function validateClaudeMarketplace(root, version) {
  const marketplace = await json(
    resolve(root, ".claude-plugin/marketplace.json"),
  );
  assert.equal(marketplace.name, MARKETPLACE_NAME);
  assert.equal(marketplace.plugins?.length, 1);
  const [plugin] = marketplace.plugins;
  assert.equal(plugin.name, PLUGIN_NAME);
  assert.equal(plugin.version, version);
  assert.equal(plugin.source, "./distributions/claude-code/plugins/oqoqo");
  assert.equal(plugin.repository, PUBLIC_REPOSITORY);
}

async function validatePortableMarketplace(root, path, version) {
  const marketplace = await json(resolve(root, path));
  assert.equal(marketplace.name, MARKETPLACE_NAME);
  assert.equal(marketplace.plugins?.length, 1);
  const [plugin] = marketplace.plugins;
  assert.equal(plugin.name, PLUGIN_NAME);
  assert.equal(plugin.version, version);
  assert.equal(plugin.source, "./plugins/oqoqo");
}

async function validateMcp(path, expectedType) {
  const document = await json(path);
  assert.deepEqual(Object.keys(document.mcpServers ?? {}), [
    PLUGIN_NAME,
    "oqoqo-product-docs",
  ]);
  assert.deepEqual(document.mcpServers[PLUGIN_NAME], {
    type: expectedType,
    url: PRODUCTION_MCP_URL,
  });
  assert.deepEqual(document.mcpServers["oqoqo-product-docs"], {
    type: expectedType,
    url: DOCS_MCP_URL,
  });
}

async function validateSkills(root) {
  for (const skillName of SKILL_NAMES) {
    const contents = await Promise.all(
      SKILL_ROOTS.map((skillRoot) =>
        readFile(resolve(root, skillRoot, skillName, "SKILL.md"), "utf8"),
      ),
    );
    assert.match(
      contents[0],
      new RegExp(`^---\\nname: ${skillName}\\ndescription: \\S`),
      `${skillName} has invalid frontmatter`,
    );
    assert.ok(
      contents.every((content) => content === contents[0]),
      `${skillName} drifted between public packages`,
    );
  }
}

async function assertOnlyPlugin(root, relativePath) {
  assert.deepEqual(
    await readdir(resolve(root, relativePath)),
    [PLUGIN_NAME],
    `${relativePath} must contain only the production plugin`,
  );
}

function isTextPath(path) {
  return (
    [".json", ".md", ".mjs", ".yml"].some((extension) =>
      path.endsWith(extension),
    ) || basename(path) === "LICENSE"
  );
}

async function walk(root) {
  const paths = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const path = resolve(root, entry.name);
    paths.push(path);
    if (entry.isDirectory()) paths.push(...(await walk(path)));
  }
  return paths;
}

async function json(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

const invokedPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (fileURLToPath(import.meta.url) === invokedPath) {
  await validateRelease(process.argv[2] ?? resolve(dirname(invokedPath), ".."));
}
