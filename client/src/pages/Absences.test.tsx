import React from "react";
import { describe, it, expect } from "vitest";
import Absences from "./Absences";

describe("Absences", () => {
  it("component should be importable", () => {
    expect(Absences).toBeDefined();
    expect(typeof Absences).toBe("function");
  });
});
