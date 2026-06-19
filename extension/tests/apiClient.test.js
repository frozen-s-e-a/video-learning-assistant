import { describe, expect, it, vi } from "vitest";
import { analyzeFrame, sendFollowUp } from "../src/services/apiClient.js";

describe("analyzeFrame", () => {
  it("sends bearer token and payload to the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ analysisId: "1" })
    });

    const response = await analyzeFrame({
      backendUrl: "https://example.com",
      accessToken: "token",
      payload: { provider: "fake" },
      fetchImpl: fetchMock
    });

    expect(response).toEqual({ analysisId: "1" });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/analyze-frame",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ Authorization: "Bearer token" })
      })
    );
  });

  it("throws backend JSON error messages", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: { message: "Model is unavailable" } })
    });

    await expect(analyzeFrame({
      backendUrl: "https://example.com",
      accessToken: "token",
      payload: { provider: "fake" },
      fetchImpl: fetchMock
    })).rejects.toThrow("Model is unavailable");
  });

  it("throws a stable error for non-JSON backend failures", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => {
        throw new SyntaxError("Unexpected token");
      }
    });

    await expect(analyzeFrame({
      backendUrl: "https://example.com",
      accessToken: "token",
      payload: { provider: "fake" },
      fetchImpl: fetchMock
    })).rejects.toThrow("Backend request failed");
  });
});

describe("sendFollowUp", () => {
  it("posts follow-up payload to the backend", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ analysisId: "analysis-1", answer: { title: "Follow-up" } })
    });

    const response = await sendFollowUp({
      backendUrl: "https://example.com/",
      accessToken: "token",
      payload: { analysisId: "analysis-1", message: "Why async?" },
      fetchImpl: fetchMock
    });

    expect(response).toEqual({ analysisId: "analysis-1", answer: { title: "Follow-up" } });
    expect(fetchMock).toHaveBeenCalledWith(
      "https://example.com/api/follow-up",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ analysisId: "analysis-1", message: "Why async?" })
      })
    );
  });
});
