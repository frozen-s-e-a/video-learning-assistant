import { BilibiliAdapter } from "./bilibili.js";
import { GenericVideoAdapter } from "./generic.js";
import { YouTubeAdapter } from "./youtube.js";

export function selectAdapterName(url) {
  const parsed = new URL(url);
  if (
    parsed.protocol === "https:" &&
    parsed.hostname === "www.bilibili.com" &&
    parsed.pathname.startsWith("/video/")
  ) {
    return "bilibili";
  }
  if (
    parsed.protocol === "https:" &&
    parsed.hostname === "www.youtube.com" &&
    parsed.pathname === "/watch"
  ) {
    return "youtube";
  }
  return "generic";
}

export function createAdapter(doc = document, win = window) {
  const name = selectAdapterName(win.location.href);
  if (name === "bilibili") return new BilibiliAdapter(doc, win);
  if (name === "youtube") return new YouTubeAdapter(doc, win);
  return new GenericVideoAdapter(doc, win);
}
