import { cloudflare } from "@cloudflare/vite-plugin";
import contentCollections from "@content-collections/vite";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig } from "vite";

const appUrl =
	process.env.VITE_APP_URL?.replace(/\/+$/, "") || "http://localhost:3000";

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		contentCollections(),
		devtools(),
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		tailwindcss(),
		tanstackStart({
			prerender: {
				crawlLinks: true,
			},
			sitemap: {
				enabled: true,
				host: appUrl,
			},
		}),
		viteReact(),
	],
});

export default config;
