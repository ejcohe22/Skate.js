import { describe, it, expect } from "vitest";

import "../src/main";
import { initApp } from "../src/app";

describe("Three.js scene App", () => {
  it("can initialize without errors", () => {
    expect(() => initApp()).not.toThrow();
  });
});
