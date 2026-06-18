import { GenericVideoAdapter } from "./generic.js";

export class BilibiliAdapter extends GenericVideoAdapter {
  detect() {
    return (
      this.window.location.protocol === "https:" &&
      this.window.location.hostname === "www.bilibili.com" &&
      this.window.location.pathname.startsWith("/video/") &&
      Boolean(this.getVideoElement())
    );
  }

  getVideoContext() {
    const base = super.getVideoContext();
    const title =
      this.document.querySelector("h1.video-title")?.textContent?.trim() ||
      this.document.querySelector(".video-title")?.textContent?.trim() ||
      base.title;
    return { ...base, site: "bilibili", title };
  }

  getCurrentSubtitle() {
    const current =
      this.document.querySelector(".bpx-player-subtitle-current-text")?.textContent?.trim() ||
      this.document.querySelector(".bilibili-player-video-subtitle")?.textContent?.trim() ||
      null;
    return { current, nearby: current ? [current] : [] };
  }
}
