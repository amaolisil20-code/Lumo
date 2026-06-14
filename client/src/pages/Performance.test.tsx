import React from "react";
import { describe, it, expect } from "vitest";
import Performance from "./Performance";

describe("Performance", () => {
  it("component should be importable", () => {
    expect(Performance).toBeDefined();
    expect(typeof Performance).toBe("function");
  });
});
