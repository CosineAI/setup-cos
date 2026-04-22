import * as core from "@actions/core";
import * as tc from "@actions/tool-cache";
import * as exec from "@actions/exec";
import * as path from "path";
import * as fs from "fs";
import * as os from "os";
import * as semver from "semver";

const GITHUB_OWNER = "CosineAI";
const GITHUB_REPO = "cli2";
const TOOL_NAME = "cos";

function isSemver(version: string): boolean {
  return semver.valid(version) !== null;
}

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

async function maybeRunCos(cosBinaryPath: string): Promise<void> {
  const mode = core.getInput("mode");
  if (!mode) {
    return;
  }

  const prompt = core.getInput("prompt");
  if (!prompt) {
    core.setFailed("'prompt' input is required when 'mode' is set");
    return;
  }

  const args = ["start", "--mode", mode, "--prompt", prompt];

  const reasoning = core.getInput("reasoning");
  if (reasoning) {
    args.push("--reasoning", reasoning);
  }

  const model = core.getInput("model");
  if (model) {
    args.push("--model", model);
  }

  const cwd = core.getInput("cwd");
  if (cwd) {
    args.push("--cwd", cwd);
  }

  const origin = core.getInput("origin");
  if (origin) {
    args.push("--origin", origin);
  }

  if (core.getBooleanInput("auto-accept")) {
    args.push("--auto-accept");
  }

  if (core.getBooleanInput("disable-discovery")) {
    args.push("--disable-discovery");
  }

  if (core.getBooleanInput("disable-intermediate-updates")) {
    args.push("--disable-intermediate-updates");
  }

  core.info(`Running: ${cosBinaryPath} ${args.join(" ")}`);

  const execOptions: exec.ExecOptions = {};
  if (cwd) {
    execOptions.cwd = cwd;
  }

  await exec.exec(cosBinaryPath, args, execOptions);
}

export async function run(): Promise<void> {
  try {
    const versionInput = core.getInput("version") || "latest";

    core.debug(`Input version: ${versionInput}`);

    const resolvedVersion = versionInput;
    core.info(`Resolved version: ${resolvedVersion}`);

    const platformArch = getPlatformArch();

    if (!isSemver(resolvedVersion)) {
      core.info(
        `Version "${resolvedVersion}" is not a semver — skipping tool cache`,
      );
      const assetName = getAssetName();
      const downloadUrl = getDownloadUrl(resolvedVersion, assetName);
      const downloadPath = await tc.downloadTool(downloadUrl);
      const extractDir = path.join(os.tmpdir(), `cos-extract-${Date.now()}`);
      const extractedPath = await tc.extractZip(downloadPath, extractDir);
      const cosBinaryPath = path.join(extractedPath, TOOL_NAME);
      fs.chmodSync(cosBinaryPath, 0o755);
      core.addPath(extractedPath);
      core.setOutput("version", resolvedVersion);
      core.setOutput("path", cosBinaryPath);
      await maybeRunCos(cosBinaryPath);
      core.info("Setup Cosine CLI completed successfully.");
      return;
    }

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
    await maybeRunCos(cosBinaryPath);

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
