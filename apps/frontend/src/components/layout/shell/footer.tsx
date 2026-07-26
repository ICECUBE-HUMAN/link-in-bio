import { Link } from "@tanstack/react-router";
import {
	DEFAULT_APP_LOGO,
	DEFAULT_SEO_DESCRIPTION,
	DEFAULT_SITE_NAME,
} from "@/lib/seo/metadata";
import { collectRoutes, type StaticRoute } from "@/lib/site/routes";
import { routeTree } from "@/routeTree.gen";

export function Footer() {
	const currentYear = new Date().getFullYear();
	const footerRoutes = collectRoutes(routeTree as StaticRoute, "footer").sort(
		(a, b) => a.order - b.order,
	);

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
						<p className="max-w-md text-sm leading-6 font-light text-gray-bright">
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

				<p className="text-sm font-medium text-gray-bright">
					&copy; {currentYear} {DEFAULT_SITE_NAME}
				</p>
			</div>
		</footer>
	);
}
