import { cloudflare } from "@cloudflare/vite-plugin";
import contentCollections from "@content-collections/vite";
import tailwindcss from "@tailwindcss/vite";
import { devtools } from "@tanstack/devtools-vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";

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

const config = defineConfig({
	resolve: { tsconfigPaths: true },
	plugins: [
		contentCollections(),
		devtools(),
		cloudflare({ viteEnvironment: { name: "ssr" } }),
		tailwindcss(),
		tanstackStart({
			prerender: {
				enabled: true,
				crawlLinks: true,
			},
		}),
		tanstackRouterHMR(),
		viteReact(),
	],
});

export default config;
