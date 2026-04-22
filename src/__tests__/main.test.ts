import { isNightly, resolveVersion, resolveLatestVersion, run } from "../main";

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

// Mock @actions/http-client
const mockGetJson = jest.fn();
jest.mock("@actions/http-client", () => ({
  HttpClient: jest.fn().mockImplementation(() => ({
    getJson: mockGetJson,
  })),
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

describe("isNightly", () => {
  it("returns true for nightly versions", () => {
    expect(isNightly("nightly")).toBe(true);
    expect(isNightly("nightly-2024-01-01")).toBe(true);
    expect(isNightly("NIGHTLY")).toBe(true);
  });

  it("returns false for non-nightly versions", () => {
    expect(isNightly("latest")).toBe(false);
    expect(isNightly("v1.0.0")).toBe(false);
    expect(isNightly("")).toBe(false);
  });
});

describe("resolveVersion", () => {
  beforeEach(() => {
    mockGetJson.mockClear();
  });

  it("returns non-nightly versions unchanged", async () => {
    expect(await resolveVersion("latest", "https://api.cosine.sh")).toBe(
      "latest",
    );
    expect(await resolveVersion("v1.0.0", "https://api.cosine.sh")).toBe(
      "v1.0.0",
    );
    expect(mockGetJson).not.toHaveBeenCalled();
  });

  it("resolves nightly version via API", async () => {
    mockGetJson.mockResolvedValue({
      result: { version: "v1.2.3-nightly.abc123" },
      statusCode: 200,
    });

    const result = await resolveVersion("nightly", "https://api.cosine.sh");

    expect(result).toBe("v1.2.3-nightly.abc123");
    expect(mockGetJson).toHaveBeenCalledWith(
      "https://api.cosine.sh/v1/cli/version?tag=nightly",
    );
  });

  it("resolves specific nightly tag via API", async () => {
    mockGetJson.mockResolvedValue({
      result: { version: "v2.0.0-nightly.20240101" },
      statusCode: 200,
    });

    const result = await resolveVersion(
      "nightly-2024-01-01",
      "https://api.example.com",
    );

    expect(result).toBe("v2.0.0-nightly.20240101");
    expect(mockGetJson).toHaveBeenCalledWith(
      "https://api.example.com/v1/cli/version?tag=nightly-2024-01-01",
    );
  });

  it("falls back to latest when API returns empty result", async () => {
    mockGetJson.mockResolvedValue({
      result: null,
      statusCode: 200,
    });

    const result = await resolveVersion("nightly", "https://api.cosine.sh");

    expect(result).toBe("latest");
  });

  it("falls back to latest when API request fails", async () => {
    mockGetJson.mockRejectedValue(new Error("Network timeout"));

    const result = await resolveVersion("nightly", "https://api.cosine.sh");

    expect(result).toBe("latest");
  });

  it("falls back to latest when result has no version field", async () => {
    mockGetJson.mockResolvedValue({
      result: {},
      statusCode: 200,
    });

    const result = await resolveVersion("nightly", "https://api.cosine.sh");

    expect(result).toBe("latest");
  });
});

describe("resolveLatestVersion", () => {
  beforeEach(() => {
    mockGetJson.mockClear();
  });

  it("resolves latest version from API", async () => {
    mockGetJson.mockResolvedValue({
      result: { latest: "v1.0.0" },
      statusCode: 200,
    });

    const result = await resolveLatestVersion("https://api.cosine.sh");

    expect(result).toBe("v1.0.0");
    expect(mockGetJson).toHaveBeenCalledWith(
      "https://api.cosine.sh/cli/latest?version=latest&os=linux&arch=amd64",
    );
  });

  it("falls back to latest when API request fails", async () => {
    mockGetJson.mockRejectedValue(new Error("Network timeout"));

    const result = await resolveLatestVersion("https://api.cosine.sh");

    expect(result).toBe("latest");
    expect(mockGetJson).toHaveBeenCalledWith(
      "https://api.cosine.sh/cli/latest?version=latest&os=linux&arch=amd64",
    );
  });

  it("falls back to latest when API returns empty result", async () => {
    mockGetJson.mockResolvedValue({
      result: null,
      statusCode: 200,
    });

    const result = await resolveLatestVersion("https://api.cosine.sh");

    expect(result).toBe("latest");
  });
});

// Import run separately to avoid hoisting issues with the mocks
// We'll import it here and test it with mocks already in place
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

  it("calls tc.find with resolved tag when version is latest and cache hits", async () => {
    mockGetJson.mockResolvedValue({
      result: { latest: "v1.2.3" },
      statusCode: 200,
    });
    mockFind.mockReturnValue("/cached/path");
    core.getInput.mockImplementation((name: string) => {
      if (name === "version") return "latest";
      if (name === "api-base-url") return "https://api.cosine.sh";
      return "";
    });

    await run();

    expect(mockFind).toHaveBeenCalledWith("cos", "v1.2.3", "linux-x64");
  });

  it("calls tc.find with resolved tag when version is latest and cache misses", async () => {
    mockGetJson.mockResolvedValue({
      result: { latest: "v1.2.3" },
      statusCode: 200,
    });
    mockFind.mockReturnValue("");
    mockDownloadTool.mockResolvedValue("/download/path");
    mockExtractZip.mockResolvedValue("/extracted/path");
    mockCacheDir.mockResolvedValue("/cached/path");
    core.getInput.mockImplementation((name: string) => {
      if (name === "version") return "latest";
      if (name === "api-base-url") return "https://api.cosine.sh";
      return "";
    });

    await run();

    expect(mockFind).toHaveBeenCalledWith("cos", "v1.2.3", "linux-x64");
    expect(mockCacheDir).toHaveBeenCalledWith(
      "/extracted/path",
      "cos",
      "v1.2.3",
      "linux-x64",
    );
  });

  it("falls back to latest and calls tc.find with latest when API fails", async () => {
    mockGetJson.mockRejectedValue(new Error("Network timeout"));
    mockFind.mockReturnValue("");
    mockDownloadTool.mockResolvedValue("/download/path");
    mockExtractZip.mockResolvedValue("/extracted/path");
    mockCacheDir.mockResolvedValue("/cached/path");
    core.getInput.mockImplementation((name: string) => {
      if (name === "version") return "latest";
      if (name === "api-base-url") return "https://api.cosine.sh";
      return "";
    });

    await run();

    expect(mockFind).toHaveBeenCalledWith("cos", "latest", "linux-x64");
  });

  it("calls tc.find with specific tag when version is explicit", async () => {
    mockFind.mockReturnValue("/cached/path");
    core.getInput.mockImplementation((name: string) => {
      if (name === "version") return "v1.0.0";
      if (name === "api-base-url") return "https://api.cosine.sh";
      return "";
    });

    await run();

    expect(mockFind).toHaveBeenCalledWith("cos", "v1.0.0", "linux-x64");
    expect(mockGetJson).not.toHaveBeenCalled();
  });

  it("calls tc.find with resolved nightly version when version is nightly", async () => {
    mockGetJson
      .mockResolvedValueOnce({
        result: { version: "v1.2.3-nightly.abc123" },
        statusCode: 200,
      })
      .mockResolvedValueOnce({
        result: { tag_name: "v1.2.3-nightly.abc123" },
        statusCode: 200,
      });
    mockFind.mockReturnValue("/cached/path");
    core.getInput.mockImplementation((name: string) => {
      if (name === "version") return "nightly";
      if (name === "api-base-url") return "https://api.cosine.sh";
      return "";
    });

    await run();

    expect(mockFind).toHaveBeenCalledWith(
      "cos",
      "v1.2.3-nightly.abc123",
      "linux-x64",
    );
  });
});
