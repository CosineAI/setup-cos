import { run } from "../main";

// Mock @actions/core
jest.mock("@actions/core", () => ({
  info: jest.fn(),
  debug: jest.fn(),
  warning: jest.fn(),
  setFailed: jest.fn(),
  getInput: jest.fn(),
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

  it("skips tool cache for 'latest' (non-semver)", async () => {
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
  });

  it("skips tool cache for 'nightly' (non-semver)", async () => {
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

  it("downloads from correct URL with 'latest' version", async () => {
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

  it("downloads from correct URL with 'nightly' version", async () => {
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
