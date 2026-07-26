import { createAuth } from "./src/core/auth";

// ponytail: Better Auth CLI runs this file directly, so keep enough env fallbacks here for schema generation.
export const auth = createAuth({
	AUTH_EMAIL_FROM:
		process.env.AUTH_EMAIL_FROM,
	BETTER_AUTH_SECRET:
		process.env.BETTER_AUTH_SECRET ??
		"development-secret-development-secret",
	BETTER_AUTH_URL:
		process.env.BETTER_AUTH_URL ??
		"http://localhost:8787",
	CREEM_API_KEY:
		process.env.CREEM_API_KEY ??
		"creem_test_placeholder",
	CREEM_WEBHOOK_SECRET:
		process.env.CREEM_WEBHOOK_SECRET,
	DATABASE_URL:
		process.env.DATABASE_URL ??
		"postgres://postgres:postgres@127.0.0.1:5432/postgres",
	FRONTEND_URL:
		process.env.FRONTEND_URL ??
		"http://localhost:3000",
	GITHUB_CLIENT_ID:
		process.env.GITHUB_CLIENT_ID,
	GITHUB_CLIENT_SECRET:
		process.env.GITHUB_CLIENT_SECRET,
	GOOGLE_CLIENT_ID:
		process.env.GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET:
		process.env.GOOGLE_CLIENT_SECRET,
	RESEND_API_KEY:
		process.env.RESEND_API_KEY,
});

export default auth;
