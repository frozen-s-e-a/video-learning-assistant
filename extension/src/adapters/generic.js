export class GenericVideoAdapter {
  constructor(doc = document, win = window) {
    this.document = doc;
    this.window = win;
  }

  detect() {
    return Boolean(this.getVideoElement());
  }

  getVideoElement() {
    const videos = [...this.document.querySelectorAll("video")].filter(
      (video) => video.offsetWidth > 0 && video.offsetHeight > 0,
    );
    return videos.sort(
      (a, b) => b.offsetWidth * b.offsetHeight - a.offsetWidth * a.offsetHeight,
    )[0] ?? null;
  }

  getVideoContext() {
    const video = this.getVideoElement();
    return {
      site: "generic",
      title: this.document.title || "Untitled video",
      url: this.window.location.href,
      timeSeconds: video ? video.currentTime : null,
    };
  }

  getCurrentSubtitle() {
    return { current: null, nearby: [] };
  }

  onPause(callback) {
    const video = this.getVideoElement();
    if (video) video.addEventListener("pause", callback);
  }

  onPlay(callback) {
    const video = this.getVideoElement();
    if (video) video.addEventListener("play", callback);
  }
}
