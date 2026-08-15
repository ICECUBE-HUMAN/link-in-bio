import { creemClient } from "@creem_io/better-auth/client";
import { createCreemAuthClient } from "@creem_io/better-auth/create-creem-auth-client";
import {
	emailOTPClient,
	inferAdditionalFields,
} from "better-auth/client/plugins";
import { getApiBaseUrl } from "@/lib/site/api-base-url";

export const authClient = createCreemAuthClient({
	baseURL: getApiBaseUrl(),
	basePath: "/auth",
	fetchOptions: {
		credentials: "include",
	},
	plugins: [
		emailOTPClient(),
		creemClient(),
		inferAdditionalFields({
			user: {
				role: {
					type: "string",
				},
				primaryPageId: {
					type: "string",
				},
				creemCustomerId: {
					type: "string",
				},
			},
		}),
	],
});

export const { signIn, signUp, signOut, useSession } = authClient;
