import { createAuthClient } from "better-auth/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { getApiBaseUrl } from "@/lib/site/api-base-url";

export const authClient = createAuthClient({
	baseURL: getApiBaseUrl(),
	basePath: "/auth",
	fetchOptions: {
		credentials: "include",
	},
	plugins: [
		inferAdditionalFields({
			user: {
				role: {
					type: "string",
				},
				primaryPageId: {
					type: "string",
				},
			},
		}),
	],
});

export const { signIn, signUp, signOut, useSession } = authClient;
