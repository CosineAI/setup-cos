import { isNightly, resolveVersion } from "../main";

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
