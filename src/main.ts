import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";

const GITHUB_OWNER = "CosineAI";
const GITHUB_REPO = "cli2";
const TOOL_NAME = "cos";

function getAssetName(): string {
  const platform = process.platform;
  const arch = process.arch;

  core.info(`Detected platform: ${platform}, arch: ${arch}`);

  if (platform === "linux" && arch === "x64") {
    return "cos-linux-amd64-glibc2.35.zip";
  }

  if (platform === "linux" && arch === "arm64") {
    return "cos-linux-arm64.zip";
  }

  if (platform === "darwin" && arch === "arm64") {
    return "cos-darwin-arm64.zip";
  }

  if (platform === "darwin" && arch === "x64") {
    throw new Error(
      "macOS x64 is not supported. Use macOS arm64 (Apple Silicon) runners.",
    );
  }

  throw new Error(`Unsupported platform/arch combination: ${platform}/${arch}`);
}

function getDownloadUrl(version: string, assetName: string): string {
  return `https://github.com/${GITHUB_OWNER}/${GITHUB_REPO}/releases/download/${version}/${assetName}`;
}

function getPlatformArch(): string {
  return `${process.platform}-${process.arch}`;
}

export async function run(): Promise<void> {
  try {
    const versionInput = core.getInput("version") || "latest";

    core.debug(`Input version: ${versionInput}`);

    const resolvedVersion = versionInput;
    core.info(`Resolved version: ${resolvedVersion}`);

    const platformArch = getPlatformArch();
    let cachedPath = tc.find(TOOL_NAME, resolvedVersion, platformArch);

    if (cachedPath) {
      core.info(
        `Found ${TOOL_NAME} ${resolvedVersion} in tool cache at ${cachedPath}`,
      );
    } else {
      const assetName = getAssetName();
      core.info(`Asset name: ${assetName}`);

      const downloadUrl = getDownloadUrl(resolvedVersion, assetName);
      core.info(`Download URL: ${downloadUrl}`);

      core.info(`Downloading ${assetName}...`);
      const downloadPath = await tc.downloadTool(downloadUrl);
      core.debug(`Downloaded to: ${downloadPath}`);

      const extractDir = path.join(os.tmpdir(), `cos-extract-${Date.now()}`);
      core.info(`Extracting archive...`);
      const extractedPath = await tc.extractZip(downloadPath, extractDir);
      core.debug(`Extracted to: ${extractedPath}`);

      const binDir = extractedPath;
      core.debug(`Binary directory: ${binDir}`);

      core.info(`Caching tool...`);
      cachedPath = await tc.cacheDir(
        binDir,
        TOOL_NAME,
        resolvedVersion,
        platformArch,
      );
      core.debug(`Cached at: ${cachedPath}`);
    }

    const cosBinaryPath = path.join(cachedPath, TOOL_NAME);
    fs.chmodSync(cosBinaryPath, 0o755);

    core.info(`Adding ${cachedPath} to PATH`);
    core.addPath(cachedPath);

    core.info(`Cosine CLI installed at: ${cosBinaryPath}`);

    core.setOutput("version", resolvedVersion);
    core.setOutput("path", cosBinaryPath);

    core.info("Setup Cosine CLI completed successfully.");
  } catch (error) {
    if (error instanceof Error) {
      core.setFailed(error.message);
    } else {
      core.setFailed(String(error));
    }
  }
}

if (require.main === module) {
  run();
}
