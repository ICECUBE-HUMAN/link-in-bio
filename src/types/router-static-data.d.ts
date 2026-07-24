import "@tanstack/react-router";

declare module "@tanstack/react-router" {
	interface StaticDataRouteOption {
		header?: {
			label: string;
			order?: number;
		};
		footer?: {
			label: string;
			order?: number;
		};
	}
}
