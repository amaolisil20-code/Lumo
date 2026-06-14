import React from "react";
import { describe, it, expect } from "vitest";
import Attendants from "./Attendants";

describe("Attendants", () => {
  it("component should be importable", () => {
    expect(Attendants).toBeDefined();
    expect(typeof Attendants).toBe("function");
  });
});
