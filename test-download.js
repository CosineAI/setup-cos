const tc = require("@actions/tool-cache");
const path = require("path");
const fs = require("fs");
const os = require("os");

async function test() {
  const assetName = "cos-darwin-arm64.zip";
  const version = "latest";
  const downloadUrl = `https://github.com/CosineAI/cli2/releases/download/${version}/${assetName}`;
  console.log("Downloading", downloadUrl);
  const downloadPath = await tc.downloadTool(downloadUrl);
  console.log("Downloaded to:", downloadPath);
  const extractDir = path.join(os.tmpdir(), "cos-extract-test");
  const extractedPath = await tc.extractZip(downloadPath, extractDir);
  console.log("Extracted to:", extractedPath);
  const cosBinaryPath = path.join(extractedPath, "cos");
  console.log("Binary path:", cosBinaryPath);
  if (fs.existsSync(cosBinaryPath)) {
    console.log("Binary EXISTS");
    fs.chmodSync(cosBinaryPath, 0o755);
    console.log("chmod applied");
    const stats = fs.statSync(cosBinaryPath);
    console.log("Is executable?", !!(stats.mode & 0o111));
    const { execSync } = require("child_process");
    try {
      const versionOutput = execSync(cosBinaryPath + " --version", { encoding: "utf8" });
      console.log("Version output:", versionOutput.trim());
    } catch (e) {
      console.log("Error running binary:", e.message);
    }
  } else {
    console.log("Binary NOT found at", cosBinaryPath);
    console.log("Files in extract dir:");
    console.log(fs.readdirSync(extractedPath));
  }
}
test().catch(e => { console.error(e); process.exit(1); });
