import { Resend } from "resend";
import type { AppBindings } from "types/type";

type EmailLink = {
	email: string;
	url: string;
};

export async function sendMagicLinkEmail(
	env: AppBindings,
	{ email, url }: EmailLink,
) {
	const resend = createResendClient(
		env,
		"magic links",
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

	throwIfResendFailed(error);
}

export async function sendDeleteAccountVerificationEmail(
	env: AppBindings,
	{ email, url }: EmailLink,
) {
	const resend = createResendClient(
		env,
		"account deletion verification emails",
	);
	const { error } =
		await resend.emails.send({
			from: env.RESEND_FROM_EMAIL,
			to: email,
			subject:
				"Confirm your Sinabro account deletion",
			text: [
				"We received a request to delete your Sinabro account.",
				"",
				`Confirm the deletion here: ${url}`,
				"",
				"This link can only be used once. If you did not request this, you can safely ignore this email.",
			].join("\n"),
			html: `
			<div style="font-family: sans-serif; line-height: 1.5; max-width: 480px;">
				<h1>Confirm account deletion</h1>
				<p>We received a request to permanently delete your Sinabro account and page.</p>
				<p>
					<a href="${url}" style="display: inline-block; padding: 12px 18px; border-radius: 8px; background: #b91c1c; color: #ffffff; text-decoration: none;">
						Delete my account
					</a>
				</p>
				<p>This link can only be used once. If you did not request this, you can safely ignore this email.</p>
			</div>
		`,
		});

	throwIfResendFailed(error);
}

function createResendClient(
	env: AppBindings,
	flow: string,
) {
	if (!env.RESEND_API_KEY) {
		throw new Error(
			`RESEND_API_KEY is required to send ${flow}.`,
		);
	}

	return new Resend(env.RESEND_API_KEY);
}

function throwIfResendFailed(
	error: { message: string } | null,
) {
	if (error) {
		throw new Error(
			`Resend failed: ${error.message}`,
		);
	}
}
