import { createFileRoute } from "@tanstack/react-router";
import { Footer } from "@/components/layout/shell/footer";

export const Route = createFileRoute("/terms")({
	staticData: {
		footer: {
			label: "Terms",
			order: 40,
		},
	},
	component: Footer,
});
