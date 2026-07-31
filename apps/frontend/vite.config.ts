import { cloudflare } from "@cloudflare/vite-plugin";
import contentCollections from "@content-collections/vite";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { type Plugin, defineConfig } from "vite";

export function tanstackRouterHMR(): Plugin {
    return {
        name: "tanstack-router-hmr",
        enforce: "post",
        handleHotUpdate(ctx) {
            const invalidatedModules = []

            for (const mod of ctx.server.moduleGraph.idToModuleMap.values()) {
                if (mod.id?.includes("/router.ts")) {
                    invalidatedModules.push(mod)
                }
            }

            return invalidatedModules
        }
    }
}

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
		tanstackRouterHMR(),
		viteReact(),
	],
});

export default config;
