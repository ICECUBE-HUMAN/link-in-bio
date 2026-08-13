/**
 * Custom options for Better Auth
 *
 * Docs: https://www.better-auth.com/docs/reference/options
 */

import { creem } from "@creem_io/better-auth";
import type { BetterAuthOptions } from "better-auth/minimal";
import { magicLink } from "better-auth/plugins/magic-link";
import type { AppBindings } from "types/type";
import {
	sendDeleteAccountVerificationEmail,
	sendMagicLinkEmail,
} from "./email";

type Options = {
	backgroundTaskHandler?: (
		promise: Promise<unknown>,
	) => void;
};

export const betterAuthOptions = (
	env: AppBindings,
	{ backgroundTaskHandler }: Options,
) => {
	const frontendHostname = new URL(
		env.FRONTEND_URL,
	).hostname;
	const isLocalFrontend = [
		"localhost",
		"127.0.0.1",
	].includes(frontendHostname);

	return {
		/**
		 * The name of the application.
		 */
		appName: "Sinabro",
		/**
		 * Base path for Better Auth.
		 * @default "/api/auth"
		 */
		basePath: "/auth",

		// .... More options
		user: {
			deleteUser: {
				enabled: true,
				sendDeleteAccountVerification:
					({ user, url }) =>
						sendDeleteAccountVerificationEmail(
							env,
							{
								email: user.email,
								url,
							},
						),
			},
			additionalFields: {
				role: {
					type: "string",
					required: true,
					input: false,
					defaultValue: "user",
				},
				primaryPageId: {
					type: "string",
					required: false,
					input: false,
				},
			},
		},
		account: {
			storeStateStrategy: "cookie",
			accountLinking: {
				enabled: true,
				trustedProviders: [
					"google",
					"twitter",
					"email-password",
				],
			},
		},
		emailAndPassword: {
			enabled: true,
		},
		plugins: [
			magicLink({
				expiresIn: 5 * 60,
				sendMagicLink: ({
					email,
					url,
				}) => {
					const task =
						sendMagicLinkEmail(env, {
							email,
							url,
						});
					if (backgroundTaskHandler) {
						backgroundTaskHandler(task);
						return;
					}
					return task;
				},
			}),
			creem({
				apiKey: env.CREEM_API_KEY,
				webhookSecret:
					env.CREEM_WEBHOOK_SECRET,
				testMode:
					env.CREEM_TEST_MODE ===
					"true",
				defaultSuccessUrl:
					env.CREEM_SUCCESS_URL,
				persistSubscriptions: true,
			}),
		],
		socialProviders: {
			google: {
				clientId: env.GOOGLE_CLIENT_ID,
				clientSecret:
					env.GOOGLE_CLIENT_SECRET,
			},
			twitter: {
				clientId: env.TWITTER_CLIENT_ID,
				clientSecret:
					env.TWITTER_CLIENT_SECRET,
				scope: ["users.email"],
			},
		},
		advanced: {
			backgroundTasks: {
				handler: backgroundTaskHandler,
			},
			crossSubDomainCookies: {
				enabled: !isLocalFrontend,
				domain: frontendHostname,
			},
		},
	} as BetterAuthOptions;
};
