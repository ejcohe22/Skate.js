import { describe, it, expect } from "vitest";

import "../src/Main";
import { initApp } from "../src/App";

describe("Three.js scene App", () => {
  it("can initialize without errors", () => {
    expect(() => initApp()).not.toThrow();
  });
});
