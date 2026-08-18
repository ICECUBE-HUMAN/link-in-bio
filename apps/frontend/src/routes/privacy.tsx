import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "@/components/layout/shell/footer";

export const Route = createFileRoute("/privacy")({
	staticData: {
		footer: {
			label: "Privacy",
			order: 30,
		},
	},
	component: Footer,
});
