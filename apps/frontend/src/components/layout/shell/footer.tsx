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
			<div className="mx-auto flex min-h-[36vh] w-full max-w-4xl flex-col justify-between gap-10 px-4 py-32 text-center sm:flex-row ">
        <div className="flex flex-col gap-2">
          <aside className="flex items-center gap-2">
            <div className="size-6 rounded-full surface-line">
              <img
    						src={'/logo512.png'}
    						alt={DEFAULT_SITE_NAME}
    						className="rounded-[inherit] size-full"
              />
            </div>
            <h3 className="font-medium">{DEFAULT_SITE_NAME}</h3>
          </aside>
					<div className="flex flex-col items-start font-medium gap-8">
						<div className="flex flex-col items-start tracking-tight leading-3">
							<p className="max-w-md leading-6">{DEFAULT_SEO_DESCRIPTION}</p>
							<p>Designed for everyone</p>
						</div>
						<p className="text-gray-bright text-sm tracking-tight leading-6">
							&copy; {currentYear} {DEFAULT_SITE_NAME}
						</p>
					</div>
				</div>

				<nav aria-label="Footer">
					<ul className="flex flex-col items-start gap-1 text-base font-medium sm:flex-col">
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
