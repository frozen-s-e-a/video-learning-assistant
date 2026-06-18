import { GenericVideoAdapter } from "./generic.js";

export class YouTubeAdapter extends GenericVideoAdapter {
  detect() {
    return (
      this.window.location.hostname.includes("youtube.com") &&
      this.window.location.pathname === "/watch" &&
      Boolean(this.getVideoElement())
    );
  }

  getVideoContext() {
    const base = super.getVideoContext();
    const title =
      this.document.querySelector("h1 yt-formatted-string")?.textContent?.trim() ||
      this.document.querySelector("h1")?.textContent?.trim() ||
      base.title;
    return { ...base, site: "youtube", title };
  }

  getCurrentSubtitle() {
    const captions = [...this.document.querySelectorAll(".ytp-caption-segment")]
      .map((node) => node.textContent.trim())
      .filter(Boolean);
    return { current: captions.at(-1) ?? null, nearby: captions };
  }
}
