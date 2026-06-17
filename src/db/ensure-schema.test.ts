import { describe, expect, it } from "vitest";

import { worldVersion } from "./ensure-schema";

describe("world reset version", () => {
  it("starts the balanced 100-level world from scratch", () => {
    expect(worldVersion).toBe("balanced-pairs-100-v1");
  });
});
