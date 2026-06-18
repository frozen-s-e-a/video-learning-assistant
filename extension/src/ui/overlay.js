let activeSelectionPromise = null;

export function startRegionSelection() {
  if (activeSelectionPromise) return activeSelectionPromise;

  activeSelectionPromise = new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.dataset.vlaRegionOverlay = "true";
    overlay.style.cssText = [
      "position: fixed",
      "inset: 0",
      "z-index: 2147483647",
      "cursor: crosshair",
      "background: rgba(15, 23, 42, .16)"
    ].join(";");

    const box = document.createElement("div");
    box.dataset.vlaRegionBox = "true";
    box.style.cssText = [
      "position: fixed",
      "border: 2px solid #2563eb",
      "background: rgba(37, 99, 235, .12)",
      "display: none"
    ].join(";");

    document.documentElement.append(overlay, box);

    let startX = 0;
    let startY = 0;
    let isDragging = false;
    let isFinished = false;

    function finish(selection) {
      if (isFinished) return;
      isFinished = true;
      overlay.removeEventListener("mousedown", handleMouseDown);
      overlay.removeEventListener("mousemove", handleMouseMove);
      overlay.removeEventListener("mouseup", handleMouseUp);
      overlay.removeEventListener("contextmenu", handleCancelEvent);
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("pagehide", handleCancelEvent);
      window.removeEventListener("blur", handleCancelEvent);
      overlay.remove();
      box.remove();
      activeSelectionPromise = null;
      resolve(selection);
    }

    function handleMouseDown(event) {
      event.preventDefault();
      startX = event.clientX;
      startY = event.clientY;
      isDragging = true;
      box.style.display = "block";
      updateBox(box, startX, startY, startX, startY);
    }

    function handleMouseMove(event) {
      if (!isDragging) return;
      updateBox(box, startX, startY, event.clientX, event.clientY);
    }

    function handleMouseUp(event) {
      if (!isDragging) return;
      isDragging = false;
      const selection = toSelection(startX, startY, event.clientX, event.clientY);
      finish(selection.width > 8 && selection.height > 8 ? withViewportMetadata(selection) : null);
    }

    function handleKeyDown(event) {
      if (event.key === "Escape") finish(null);
    }

    function handleCancelEvent(event) {
      event.preventDefault?.();
      finish(null);
    }

    overlay.addEventListener("mousedown", handleMouseDown);
    overlay.addEventListener("mousemove", handleMouseMove);
    overlay.addEventListener("mouseup", handleMouseUp);
    overlay.addEventListener("contextmenu", handleCancelEvent);
    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("pagehide", handleCancelEvent);
    window.addEventListener("blur", handleCancelEvent);
  });

  return activeSelectionPromise;
}

function updateBox(box, x1, y1, x2, y2) {
  const selection = toSelection(x1, y1, x2, y2);
  box.style.left = `${selection.x}px`;
  box.style.top = `${selection.y}px`;
  box.style.width = `${selection.width}px`;
  box.style.height = `${selection.height}px`;
}

export function toSelection(x1, y1, x2, y2) {
  return {
    x: Math.round(Math.min(x1, x2)),
    y: Math.round(Math.min(y1, y2)),
    width: Math.round(Math.abs(x2 - x1)),
    height: Math.round(Math.abs(y2 - y1))
  };
}

export function withViewportMetadata(selection, win = window) {
  return {
    ...selection,
    devicePixelRatio: win.devicePixelRatio,
    viewportWidth: win.innerWidth,
    viewportHeight: win.innerHeight
  };
}
