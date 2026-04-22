import { run } from "../main";

// Mock @actions/core
jest.mock("@actions/core", () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warning: jest.fn(),
  setFailed: jest.fn(),
  getInput: jest.fn(),
  getBooleanInput: jest.fn(),
  setOutput: jest.fn(),
  addPath: jest.fn(),
}));

// Mock @actions/tool-cache
jest.mock("@actions/tool-cache", () => ({
  find: jest.fn(),
  downloadTool: jest.fn(),
  extractZip: jest.fn(),
  cacheDir: jest.fn(),
}));

// Mock @actions/exec
jest.mock("@actions/exec", () => ({
  exec: jest.fn(),
}));

// Mock fs
jest.mock("fs", () => ({
  chmodSync: jest.fn(),
}));

const tc = jest.requireMock(
  "@actions/tool-cache",
) as typeof import("@actions/tool-cache");
const mockFind = tc.find as jest.Mock;
const mockDownloadTool = tc.downloadTool as jest.Mock;
const mockExtractZip = tc.extractZip as jest.Mock;
const mockCacheDir = tc.cacheDir as jest.Mock;

const exec = jest.requireMock("@actions/exec") as typeof import("@actions/exec");
const mockExec = exec.exec as jest.Mock;

describe("run - cache behavior", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const core = require("@actions/core");

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(process, "platform", {
      value: "linux",
      configurable: true,
    });
    Object.defineProperty(process, "arch", {
      value: "x64",
      configurable: true,
    });
  });

  it("skips tool cache for latest (non-semver)", async () => {
    mockDownloadTool.mockResolvedValue("/download/path");
    mockExtractZip.mockResolvedValue("/extracted/path");
    core.getInput.mockImplementation((name: string) => {
      if (name === "version") return "latest";
      return "";
    });

    await run();

    expect(mockFind).not.toHaveBeenCalled();
    expect(mockCacheDir).not.toHaveBeenCalled();
    expect(mockDownloadTool).toHaveBeenCalledWith(
      "https://github.com/CosineAI/cli2/releases/download/latest/cos-linux-amd64-glibc2.35.zip",
    );
    expect(core.addPath).toHaveBeenCalledWith("/extracted/path");
    expect(mockExec).not.toHaveBeenCalled();
  });

  it("skips tool cache for nightly (non-semver)", async () => {
    mockDownloadTool.mockResolvedValue("/download/path");
    mockExtractZip.mockResolvedValue("/extracted/path");
    core.getInput.mockImplementation((name: string) => {
      if (name === "version") return "nightly";
      return "";
    });

    await run();

    expect(mockFind).not.toHaveBeenCalled();
    expect(mockCacheDir).not.toHaveBeenCalled();
    expect(mockDownloadTool).toHaveBeenCalledWith(
      "https://github.com/CosineAI/cli2/releases/download/nightly/cos-linux-amd64-glibc2.35.zip",
    );
    expect(core.addPath).toHaveBeenCalledWith("/extracted/path");
    expect(mockExec).not.toHaveBeenCalled();
  });

  it("uses tool cache for semver version (cache hit)", async () => {
    mockFind.mockReturnValue("/cached/path");
    core.getInput.mockImplementation((name: string) => {
      if (name === "version") return "v1.0.0";
      return "";
    });

    await run();

    expect(mockFind).toHaveBeenCalledWith("cos", "v1.0.0", "linux-x64");
    expect(mockDownloadTool).not.toHaveBeenCalled();
    expect(mockCacheDir).not.toHaveBeenCalled();
    expect(core.addPath).toHaveBeenCalledWith("/cached/path");
    expect(mockExec).not.toHaveBeenCalled();
  });

  it("uses tool cache for semver version (cache miss)", async () => {
    mockFind.mockReturnValue("");
    mockDownloadTool.mockResolvedValue("/download/path");
    mockExtractZip.mockResolvedValue("/extracted/path");
    mockCacheDir.mockResolvedValue("/cached/path");
    core.getInput.mockImplementation((name: string) => {
      if (name === "version") return "v1.0.0";
      return "";
    });

    await run();

    expect(mockFind).toHaveBeenCalledWith("cos", "v1.0.0", "linux-x64");
    expect(mockCacheDir).toHaveBeenCalledWith(
      "/extracted/path",
      "cos",
      "v1.0.0",
      "linux-x64",
    );
    expect(core.addPath).toHaveBeenCalledWith("/cached/path");
    expect(mockExec).not.toHaveBeenCalled();
  });

  it("downloads from correct URL with explicit version", async () => {
    mockFind.mockReturnValue("");
    mockDownloadTool.mockResolvedValue("/download/path");
    mockExtractZip.mockResolvedValue("/extracted/path");
    mockCacheDir.mockResolvedValue("/cached/path");
    core.getInput.mockImplementation((name: string) => {
      if (name === "version") return "v1.2.3";
      return "";
    });

    await run();

    expect(mockDownloadTool).toHaveBeenCalledWith(
      "https://github.com/CosineAI/cli2/releases/download/v1.2.3/cos-linux-amd64-glibc2.35.zip",
    );
  });

  it("downloads from correct URL with latest version", async () => {
    mockDownloadTool.mockResolvedValue("/download/path");
    mockExtractZip.mockResolvedValue("/extracted/path");
    core.getInput.mockImplementation((name: string) => {
      if (name === "version") return "latest";
      return "";
    });

    await run();

    expect(mockDownloadTool).toHaveBeenCalledWith(
      "https://github.com/CosineAI/cli2/releases/download/latest/cos-linux-amd64-glibc2.35.zip",
    );
  });

  it("downloads from correct URL with nightly version", async () => {
    mockDownloadTool.mockResolvedValue("/download/path");
    mockExtractZip.mockResolvedValue("/extracted/path");
    core.getInput.mockImplementation((name: string) => {
      if (name === "version") return "nightly";
      return "";
    });

    await run();

    expect(mockDownloadTool).toHaveBeenCalledWith(
      "https://github.com/CosineAI/cli2/releases/download/nightly/cos-linux-amd64-glibc2.35.zip",
    );
  });
});

describe("run - cos execution", () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const core = require("@actions/core");

  beforeEach(() => {
    jest.clearAllMocks();
    Object.defineProperty(process, "platform", {
      value: "linux",
      configurable: true,
    });
    Object.defineProperty(process, "arch", {
      value: "x64",
      configurable: true,
    });
    mockDownloadTool.mockResolvedValue("/download/path");
    mockExtractZip.mockResolvedValue("/extracted/path");
  });

  it("fails when mode is set but prompt is missing", async () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === "version") return "latest";
      if (name === "mode") return "auto";
      return "";
    });

    await run();

    expect(core.setFailed).toHaveBeenCalledWith(
      "prompt input is required when mode is set",
    );
    expect(mockExec).not.toHaveBeenCalled();
  });

  it("runs cos start with mode and prompt", async () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === "version") return "latest";
      if (name === "mode") return "auto";
      if (name === "prompt") return "Fix the bugs";
      return "";
    });

    await run();

    expect(mockExec).toHaveBeenCalledWith(
      "/extracted/path/cos",
      ["start", "--mode", "auto", "--prompt", "Fix the bugs"],
      {},
    );
  });

  it("passes optional string inputs to cos start", async () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === "version") return "latest";
      if (name === "mode") return "plan";
      if (name === "prompt") return "Refactor code";
      if (name === "reasoning") return "high";
      if (name === "model") return "gemini-3.1-pro";
      if (name === "cwd") return "/workspace";
      if (name === "origin") return "custom-origin";
      return "";
    });

    await run();

    expect(mockExec).toHaveBeenCalledWith(
      "/extracted/path/cos",
      [
        "start",
        "--mode",
        "plan",
        "--prompt",
        "Refactor code",
        "--reasoning",
        "high",
        "--model",
        "gemini-3.1-pro",
        "--cwd",
        "/workspace",
        "--origin",
        "custom-origin",
      ],
      { cwd: "/workspace" },
    );
  });

  it("does not pass boolean flags when they are false", async () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === "version") return "latest";
      if (name === "mode") return "auto";
      if (name === "prompt") return "Test prompt";
      return "";
    });
    core.getBooleanInput.mockReturnValue(false);

    await run();

    expect(mockExec).toHaveBeenCalledWith(
      "/extracted/path/cos",
      ["start", "--mode", "auto", "--prompt", "Test prompt"],
      {},
    );
    expect(core.getBooleanInput).toHaveBeenCalledWith("auto-accept");
    expect(core.getBooleanInput).toHaveBeenCalledWith("disable-discovery");
    expect(core.getBooleanInput).toHaveBeenCalledWith(
      "disable-intermediate-updates",
    );
  });

  it("passes boolean flags when they are true", async () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === "version") return "latest";
      if (name === "mode") return "auto";
      if (name === "prompt") return "Test prompt";
      return "";
    });
    core.getBooleanInput.mockImplementation((name: string) => {
      if (
        name === "auto-accept" ||
        name === "disable-discovery" ||
        name === "disable-intermediate-updates"
      ) {
        return true;
      }
      return false;
    });

    await run();

    expect(mockExec).toHaveBeenCalledWith(
      "/extracted/path/cos",
      [
        "start",
        "--mode",
        "auto",
        "--prompt",
        "Test prompt",
        "--auto-accept",
        "--disable-discovery",
        "--disable-intermediate-updates",
      ],
      {},
    );
  });

  it("passes cwd to exec options when set", async () => {
    core.getInput.mockImplementation((name: string) => {
      if (name === "version") return "latest";
      if (name === "mode") return "auto";
      if (name === "prompt") return "Test prompt";
      if (name === "cwd") return "/custom/dir";
      return "";
    });

    await run();

    expect(mockExec).toHaveBeenCalledWith(
      "/extracted/path/cos",
      ["start", "--mode", "auto", "--prompt", "Test prompt", "--cwd", "/custom/dir"],
      { cwd: "/custom/dir" },
    );
  });

  it("does not run cos when mode is not set (semver cache hit)", async () => {
    mockFind.mockReturnValue("/cached/path");
    core.getInput.mockImplementation((name: string) => {
      if (name === "version") return "v1.0.0";
      return "";
    });

    await run();

    expect(mockExec).not.toHaveBeenCalled();
  });
});
