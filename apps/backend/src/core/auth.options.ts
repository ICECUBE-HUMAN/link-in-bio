/**
 * Custom options for Better Auth
 *
 * Docs: https://www.better-auth.com/docs/reference/options
 */

import type { BetterAuthOptions } from "better-auth/minimal";
import { magicLink } from "better-auth/plugins/magic-link";
import { Resend } from "resend";
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

async function sendMagicLinkEmail(
	env: AppBindings,
	{
		email,
		url,
	}: { email: string; url: string },
) {
	if (!env.RESEND_API_KEY) {
		throw new Error(
			"RESEND_API_KEY is required to send magic links.",
		);
	}

	const resend = new Resend(
		env.RESEND_API_KEY,
	);
	const { error } =
		await resend.emails.send({
			from: env.RESEND_FROM_EMAIL,
			to: email,
			subject: "Sign in to Sinabro",
			html: `
			<div style="font-family: sans-serif; line-height: 1.5; max-width: 480px;">
				<h1>Sign in to Sinabro</h1>
				<p>Use the button below to sign in. This link expires in 5 minutes.</p>
				<p>
					<a href="${url}" style="display: inline-block; padding: 12px 18px; border-radius: 8px; background: #111827; color: #ffffff; text-decoration: none;">
						Continue to Sinabro
					</a>
				</p>
				<p>If you did not request this email, you can safely ignore it.</p>
			</div>
		`,
		});

	if (error)
		throw new Error(
			`Resend failed: ${error.message}`,
		);
}
