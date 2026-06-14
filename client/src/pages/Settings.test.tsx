import React from "react";
import { describe, it, expect } from "vitest";
import Settings from "./Settings";

describe("Settings", () => {
  it("component should be importable", () => {
    expect(Settings).toBeDefined();
    expect(typeof Settings).toBe("function");
  });
});
