export function startRegionSelection() {
  return new Promise((resolve) => {
    const overlay = document.createElement("div");
    overlay.style.cssText = [
      "position: fixed",
      "inset: 0",
      "z-index: 2147483647",
      "cursor: crosshair",
      "background: rgba(15, 23, 42, .16)"
    ].join(";");

    const box = document.createElement("div");
    box.style.cssText = [
      "position: fixed",
      "border: 2px solid #2563eb",
      "background: rgba(37, 99, 235, .12)",
      "display: none"
    ].join(";");

    document.documentElement.append(overlay, box);

    let startX = 0;
    let startY = 0;

    overlay.addEventListener("mousedown", (event) => {
      startX = event.clientX;
      startY = event.clientY;
      box.style.display = "block";
      updateBox(box, startX, startY, startX, startY);
    });

    overlay.addEventListener("mousemove", (event) => {
      if (box.style.display !== "block") return;
      updateBox(box, startX, startY, event.clientX, event.clientY);
    });

    overlay.addEventListener("mouseup", (event) => {
      const selection = toSelection(startX, startY, event.clientX, event.clientY);
      overlay.remove();
      box.remove();
      resolve(selection.width > 8 && selection.height > 8 ? selection : null);
    });
  });
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
