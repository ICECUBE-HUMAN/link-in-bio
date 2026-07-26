type StaticRouteData = {
	label: string;
	order?: number;
};

export type StaticRouteKey = "header" | "footer";

export type StaticRoute = {
	fullPath?: string;
	children?: Record<string, StaticRoute>;
	options?: {
		staticData?: Partial<Record<StaticRouteKey, StaticRouteData>>;
	};
};

export type StaticRouteItem = {
	to: string;
	label: string;
	order: number;
};

export function normalizeTo(fullPath: string) {
	return fullPath === "/" ? fullPath : fullPath.replace(/\/$/, "");
}

export function collectRoutes(
	route: StaticRoute,
	key: StaticRouteKey,
): StaticRouteItem[] {
	const current = route.options?.staticData?.[key];
	const items =
		current && route.fullPath
			? [
					{
						to: normalizeTo(route.fullPath),
						label: current.label,
						order: current.order ?? 0,
					},
				]
			: [];

	const children = Object.values(route.children ?? {}).flatMap((child) =>
		collectRoutes(child, key),
	);

	return [...items, ...children];
}
