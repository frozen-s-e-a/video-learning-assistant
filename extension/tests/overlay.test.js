import { describe, expect, it } from "vitest";
import { toSelection } from "../src/ui/overlay.js";

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
