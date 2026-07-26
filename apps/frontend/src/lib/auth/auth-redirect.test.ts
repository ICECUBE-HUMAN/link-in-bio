import { describe, expect, it } from "vitest";
import { sanitizeAuthRedirect } from "./auth-redirect";

describe("sanitizeAuthRedirect", () => {
	it("keeps safe internal paths", () => {
		expect(sanitizeAuthRedirect("/dashboard")).toBe("/dashboard");
		expect(sanitizeAuthRedirect("/dashboard?tab=billing")).toBe(
			"/dashboard?tab=billing",
		);
	});

	it("falls back for invalid targets", () => {
		expect(sanitizeAuthRedirect(undefined)).toBe("/dashboard");
		expect(sanitizeAuthRedirect("https://evil.com")).toBe("/dashboard");
		expect(sanitizeAuthRedirect("//evil.com")).toBe("/dashboard");
	});
});
