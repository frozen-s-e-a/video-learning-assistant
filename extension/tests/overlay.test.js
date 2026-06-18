import { beforeEach, describe, expect, it } from "vitest";
import { startRegionSelection, toSelection } from "../src/ui/overlay.js";

function getOverlay() {
  return document.querySelector("[data-vla-region-overlay]");
}

function getSelectionBox() {
  return document.querySelector("[data-vla-region-box]");
}

function drag(target, from, to) {
  target.dispatchEvent(new MouseEvent("mousedown", {
    bubbles: true,
    clientX: from.x,
    clientY: from.y
  }));
  target.dispatchEvent(new MouseEvent("mousemove", {
    bubbles: true,
    clientX: to.x,
    clientY: to.y
  }));
  target.dispatchEvent(new MouseEvent("mouseup", {
    bubbles: true,
    clientX: to.x,
    clientY: to.y
  }));
}

beforeEach(() => {
  document.body.innerHTML = "";
  document.documentElement.querySelectorAll("[data-vla-region-overlay], [data-vla-region-box]").forEach((node) => {
    node.remove();
  });
});

describe("toSelection", () => {
  it("normalizes drag coordinates into a rounded selection rectangle", () => {
    expect(toSelection(100.2, 80.7, 40.4, 20.1)).toEqual({
      x: 40,
      y: 20,
      width: 60,
      height: 61
    });
  });
});

describe("startRegionSelection", () => {
  it("cleans up overlay DOM and includes viewport metadata after a valid drag", async () => {
    const selectionPromise = startRegionSelection();
    const overlay = getOverlay();

    expect(overlay).not.toBeNull();

    drag(overlay, { x: 10, y: 20 }, { x: 110, y: 80 });

    await expect(selectionPromise).resolves.toMatchObject({
      x: 10,
      y: 20,
      width: 100,
      height: 60,
      devicePixelRatio: window.devicePixelRatio,
      viewportWidth: window.innerWidth,
      viewportHeight: window.innerHeight
    });
    expect(getOverlay()).toBeNull();
    expect(getSelectionBox()).toBeNull();
  });

  it("resolves null and cleans up overlay DOM after a small drag", async () => {
    const selectionPromise = startRegionSelection();
    const overlay = getOverlay();

    drag(overlay, { x: 10, y: 20 }, { x: 14, y: 25 });

    await expect(selectionPromise).resolves.toBeNull();
    expect(getOverlay()).toBeNull();
    expect(getSelectionBox()).toBeNull();
  });

  it("resolves null and cleans up overlay DOM when Escape cancels selection", async () => {
    const selectionPromise = startRegionSelection();

    window.dispatchEvent(new KeyboardEvent("keydown", {
      bubbles: true,
      key: "Escape"
    }));

    await expect(selectionPromise).resolves.toBeNull();
    expect(getOverlay()).toBeNull();
    expect(getSelectionBox()).toBeNull();
  });

  it("returns the active selection promise instead of stacking duplicate overlays", async () => {
    const firstPromise = startRegionSelection();
    const secondPromise = startRegionSelection();

    expect(secondPromise).toBe(firstPromise);
    expect(document.querySelectorAll("[data-vla-region-overlay]")).toHaveLength(1);

    drag(getOverlay(), { x: 10, y: 20 }, { x: 110, y: 80 });

    await expect(firstPromise).resolves.toMatchObject({
      x: 10,
      y: 20,
      width: 100,
      height: 60
    });
  });
});
