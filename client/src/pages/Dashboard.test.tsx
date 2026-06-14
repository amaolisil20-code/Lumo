import React from "react";
import { describe, it, expect } from "vitest";
import Dashboard from "./Dashboard";

describe("Dashboard", () => {
  it("component should be importable", () => {
    expect(Dashboard).toBeDefined();
    expect(typeof Dashboard).toBe("function");
  });
});
