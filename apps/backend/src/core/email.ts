import { Resend } from "resend";
import type { AppBindings } from "types/type";

type EmailLink = {
	email: string;
	url: string;
};

type VerificationOTP = {
	email: string;
	otp: string;
	type:
		| "sign-in"
		| "email-verification"
		| "forget-password"
		| "change-email";
};

export async function sendVerificationOTPEmail(
	env: AppBindings,
	{ email, otp, type }: VerificationOTP,
) {
	const resend = createResendClient(
		env,
		"verification OTPs",
	);
	const title =
		type === "sign-in"
			? "Sign in to Sinabro"
			: "Your Sinabro verification code";
	const { error } =
		await resend.emails.send({
			from: env.RESEND_FROM_EMAIL,
			to: email,
			subject: title,
			html: `
			<div style="font-family: sans-serif; line-height: 1.5; max-width: 480px;">
				<h1>${title}</h1>
				<p>Your one-time code is:</p>
				<p style="font-size: 32px; font-weight: 700; letter-spacing: 0.3em;">${otp}</p>
				<p>This code expires in 5 minutes.</p>
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
