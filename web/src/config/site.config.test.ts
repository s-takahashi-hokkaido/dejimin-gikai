import { describe, expect, it } from "vitest";

import { siteConfig } from "./site.config";

describe("siteConfig", () => {
  it("siteNameParts をつなげると siteName になる", () => {
    expect(siteConfig.siteNameParts.join("")).toBe(siteConfig.siteName);
  });
});
