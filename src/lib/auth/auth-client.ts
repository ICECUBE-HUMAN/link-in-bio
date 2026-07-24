import { creemClient } from "@creem_io/better-auth/client";
import { createCreemAuthClient } from "@creem_io/better-auth/create-creem-auth-client";
import { getApiBaseUrl } from "@/lib/site/api-base-url";

export const authClient = createCreemAuthClient({
	baseURL: getApiBaseUrl(),
	basePath: "/auth",
	fetchOptions: {
		credentials: "include",
	},
	plugins: [creemClient()],
});

export const { signIn, signUp, signOut, useSession } = authClient;
