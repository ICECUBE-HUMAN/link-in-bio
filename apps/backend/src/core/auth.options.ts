/**
 * Custom options for Better Auth
 *
 * Docs: https://www.better-auth.com/docs/reference/options
 */

import type { BetterAuthOptions } from "better-auth/minimal";
import type { AppBindings } from "types/type";

type Options = {
	backgroundTaskHandler?: (
		promise: Promise<unknown>,
	) => void;
};

export const betterAuthOptions = (
	env: AppBindings,
	{ backgroundTaskHandler }: Options,
) => {
	return {
		/**
		 * The name of the application.
		 */
		appName: "YOUR_APP_NAME",
		/**
		 * Base path for Better Auth.
		 * @default "/api/auth"
		 */
		basePath: "/auth",

		// .... More options
		user: {
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
					"email-password",
				],
			},
		},
		emailAndPassword: {
			enabled: true,
		},
		socialProviders: {
			google: {
				clientId: env.GOOGLE_CLIENT_ID,
				clientSecret:
					env.GOOGLE_CLIENT_SECRET,
			},
		},
		advanced: {
			backgroundTasks: {
				handler: backgroundTaskHandler,
			},
			// crossSubDomainCookies: {
			//   enabled: true,
			//   domain: 'YOUR_APP_DOMAIN'
			// }
		},
	} as BetterAuthOptions;
};
