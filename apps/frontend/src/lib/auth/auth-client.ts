import { creemClient } from "@creem_io/better-auth/client";
import { createAuthClient } from "better-auth/client";
import {
	inferAdditionalFields,
	magicLinkClient,
} from "better-auth/client/plugins";
import { getApiBaseUrl } from "@/lib/site/api-base-url";

export const authClient = createAuthClient({
	baseURL: getApiBaseUrl(),
	basePath: "/auth",
	fetchOptions: {
		credentials: "include",
	},
	plugins: [
		magicLinkClient(),
		creemClient(),
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
