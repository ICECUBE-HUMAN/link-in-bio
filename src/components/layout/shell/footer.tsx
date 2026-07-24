import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/shared/utils";
import {
	DEFAULT_APP_LOGO,
	DEFAULT_SEO_DESCRIPTION,
	DEFAULT_SITE_NAME,
} from "@/lib/seo/metadata";
import { routeTree } from "@/routeTree.gen";

type FooterRoute = {
	fullPath?: string;
	children?: Record<string, FooterRoute>;
	options?: {
		staticData?: {
			footer?: {
				label: string;
				order?: number;
			};
		};
	};
};

function normalizeTo(fullPath: string) {
	return fullPath === "/" ? fullPath : fullPath.replace(/\/$/, "");
}

function collectFooterRoutes(
	route: FooterRoute,
): Array<{ to: string; label: string; order: number }> {
	const current = route.options?.staticData?.footer;
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

	const children = Object.values(route.children ?? {}).flatMap(
		collectFooterRoutes,
	);

	return [...items, ...children];
}

export type FooterVariant = "default" | "reveal" | "rounded" | "centered";

type FooterProps = {
	variant?: FooterVariant;
};

export function Footer({ variant = "centered" }: FooterProps) {
	const currentYear = new Date().getFullYear();
	const footerRoutes = collectFooterRoutes(routeTree as FooterRoute).sort(
		(a, b) => a.order - b.order,
	);
	const isDark = variant === "reveal" || variant === "rounded";

	if (variant === "centered") {
		return (
			<footer className="bg-background">
				<div className="mx-auto flex min-h-[36vh] w-full max-w-5xl flex-col items-center justify-center gap-20 px-5 py-14 text-center sm:min-h-[42vh] sm:px-8 sm:py-16">
					<div className="flex flex-col items-center gap-12">
						<img
							src={DEFAULT_APP_LOGO}
							alt={DEFAULT_SITE_NAME}
							className="size-10 rounded-2xl object-contain sm:size-12"
						/>
						<div className="space-y-2">
							<p className="max-w-md text-sm leading-6 text-gray-bright font-light">
								{DEFAULT_SEO_DESCRIPTION}
							</p>
						</div>
					</div>

					<nav aria-label="Footer">
						<ul className="flex flex-col items-center justify-center gap-8 text-sm font-light text-gray-bright sm:flex-row">
							{footerRoutes.map((route) => (
								<li key={route.to}>
									<Link
										to={route.to}
										className="transition-colors hover:text-foreground/70"
									>
										{route.label}
									</Link>
								</li>
							))}
						</ul>
					</nav>

					<p className="text-sm text-gray-bright font-medium">
						&copy; {currentYear} {DEFAULT_SITE_NAME}
					</p>
				</div>
			</footer>
		);
	}

	return (
		<footer
			className={cn(
				variant === "default" && "bg-background min-h-[30vh]",
				variant === "reveal" &&
					"fixed inset-x-0 bottom-0 z-0 bg-foreground text-background",
				variant === "rounded" && "bg-transparent px-4 pb-4 sm:px-6 lg:px-8",
			)}
		>
			<div
				className={cn(
					"mx-auto flex h-full w-full max-w-7xl flex-col justify-between gap-12 px-5 sm:px-8 lg:gap-6 lg:px-10",
					(variant === "default" || variant === "rounded") &&
						"min-h-[42vh] py-12 sm:min-h-[48vh]",
					variant === "reveal" && "min-h-[42vh] pb-8 pt-12 sm:min-h-[48vh] sm:pt-24",
					variant === "rounded" &&
						"rounded-[2rem] bg-foreground text-background",
				)}
			>
				<div className="flex flex-col justify-between gap-12 sm:flex-row">
					<div className="space-y-2">
						<p className="font-medium text-3xl tracking-tight">
							{DEFAULT_SITE_NAME}
						</p>
						<p
							className={cn(
								"max-w-xs text-sm leading-7 font-light",
								isDark ? "text-background/60" : "text-gray-bright",
							)}
						>
							{DEFAULT_SEO_DESCRIPTION}
						</p>
					</div>

					<nav aria-label="Footer">
						<ul
							className={cn(
								"flex flex-col gap-x-5 gap-y-2 text-base",
								variant === "reveal" && "sm:grid sm:grid-cols-2 sm:gap-x-8",
							)}
						>
							{footerRoutes.map((route) => (
								<li key={route.to}>
									<Link
										to={route.to}
										className={cn(
											"font-medium transition-colors",
											isDark
												? "text-background/88 hover:text-background"
												: "hover:text-foreground/70",
										)}
									>
										{route.label}
									</Link>
								</li>
							))}
						</ul>
					</nav>
				</div>

				<p
					className={cn(
						"text-base font-medium",
						isDark ? "text-background/45" : "text-gray-bright",
					)}
				>
					&copy; {currentYear}
				</p>
			</div>
		</footer>
	);
}
