import { Link } from "@tanstack/react-router";
import { DEFAULT_SEO_DESCRIPTION, DEFAULT_SITE_NAME } from "@/lib/seo/metadata";
import { collectRoutes, type StaticRoute } from "@/lib/site/routes";
import { routeTree } from "@/routeTree.gen";

export function Footer() {
	const currentYear = new Date().getFullYear();
	const footerRoutes = collectRoutes(routeTree as StaticRoute, "footer").sort(
		(a, b) => a.order - b.order,
	);

	return (
		<footer className="bg-background">
			<div className="mx-auto flex min-h-[24vh] w-full max-w-5xl flex-col justify-between gap-10 px-5 py-32 text-center sm:flex-row sm:px-8 sm:py-16">
				<div className="flex flex-col gap-12">
					{/*<img
						src={DEFAULT_APP_LOGO}
						alt={DEFAULT_SITE_NAME}
						className="size-10 rounded-2xl object-contain sm:size-12"
					/>*/}
					<div className="flex flex-col items-start text-sm font-medium gap-3">
						<div className="flex flex-col items-start tracking-tight leading-3">
							<p className="max-w-md leading-6">{DEFAULT_SEO_DESCRIPTION}</p>
							<p>Designed for everyone.</p>
						</div>
						<p className="">
							&copy; {currentYear} {DEFAULT_SITE_NAME}
						</p>
					</div>
				</div>

				<nav aria-label="Footer">
					<ul className="flex flex-col items-start gap-1 text-sm font-medium sm:flex-col">
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
			</div>
		</footer>
	);
}
