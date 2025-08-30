import { vi } from "vitest";

vi.mock("three", async (importOriginal) => {
  // grab the real three module
  const actual = await importOriginal<typeof import("three")>();

  return {
    ...actual,
    WebGLRenderer: class {
      domElement = document.createElement("canvas");
      setSize() {}
      render() {}
    },
  };
});
