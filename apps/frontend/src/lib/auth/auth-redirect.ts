export function sanitizeAuthRedirect(value: unknown) {
	if (typeof value !== "string") {
		return "/dashboard";
	}

	if (!value.startsWith("/") || value.startsWith("//")) {
		return "/dashboard";
	}

	return value;
}
