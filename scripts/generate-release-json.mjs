import fs from "node:fs";
import path from "node:path";
import process from "node:process";

const rootDir = path.resolve(new URL("..", import.meta.url).pathname);
const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));

const product = "DF_VRPlayer";
const displayName = "DFVRプレイヤー";
const version = packageJson.version;
const tag = `v${version}`;
const releaseDate = process.env.RELEASE_DATE || new Date().toISOString().slice(0, 10);
const dmgName = `DF VR Player-${version}-arm64.dmg`;
const githubReleaseUrl = `https://github.com/datafarmjp/df-vr-player/releases/tag/${tag}`;
const githubAssetDmgName = dmgName.replaceAll(" ", ".");
const downloadUrl = `https://github.com/datafarmjp/df-vr-player/releases/download/${tag}/${githubAssetDmgName}`;
const fallbackChange = "初回公開用のリリース情報を追加しました。";

const extractChanges = () => {
  const changelogPath = path.join(rootDir, "CHANGELOG.md");
  if (!fs.existsSync(changelogPath)) {
    return [fallbackChange];
  }

  const lines = fs.readFileSync(changelogPath, "utf8").split(/\r?\n/);
  const heading = `## ${version}`;
  const startIndex = lines.findIndex((line) => line.startsWith(heading));
  if (startIndex < 0) {
    return [fallbackChange];
  }

  const changes = [];
  for (const line of lines.slice(startIndex + 1)) {
    if (line.startsWith("## ")) {
      break;
    }
    if (line.startsWith("- ")) {
      changes.push(line.slice(2).trim());
    }
  }

  return changes.length > 0 ? changes : [fallbackChange];
};

const changes = extractChanges();
const releaseJson = {
  product,
  display_name: displayName,
  version,
  tag,
  date: releaseDate,
  title: `${displayName} ${tag}`,
  github_release_url: githubReleaseUrl,
  download_url: downloadUrl,
  changes,
  body_markdown: changes.map((change) => `- ${change}`).join("\n")
};

const outputDir = path.join(rootDir, "release", product);
fs.mkdirSync(outputDir, { recursive: true });

for (const fileName of ["latest.json", `${tag}.json`]) {
  const outputPath = path.join(outputDir, fileName);
  fs.writeFileSync(outputPath, `${JSON.stringify(releaseJson, null, 2)}\n`);
  JSON.parse(fs.readFileSync(outputPath, "utf8"));
  console.log(outputPath);
}
