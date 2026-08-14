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
		<footer className="relative overflow-hidden bg-background">
			<div className="relative mx-auto flex min-h-[36vh] w-full max-w-4xl flex-col justify-between gap-10 px-4 py-32 text-center sm:flex-row ">
        <div className="flex flex-col gap-2">
          {/*<aside className="flex items-center gap-2">
            <div className="size-6 rounded-full surface-line">
              <img
    						src={'/logo512.png'}
    						alt={DEFAULT_SITE_NAME}
    						className="rounded-[inherit] size-full"
              />
            </div>
            <h3 className="font-medium">{DEFAULT_SITE_NAME}</h3>
          </aside>*/}
					<div className="flex flex-col items-start font-medium gap-8">
						<div className="flex flex-col items-start gap-12 tracking-tight leading-3 max-w-sm">
							<p className="text-left text-balance leading-tight">{DEFAULT_SEO_DESCRIPTION}</p>
							<p>Designed for everyone</p>
						</div>
						{/*<p className="text-gray-bright text-sm tracking-tight leading-6">
							&copy; {currentYear} {DEFAULT_SITE_NAME}
						</p>*/}
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
            <li>
              <a
                href="https://discord.gg/U4NNF9hMms"
								target="_blank"
                rel="noreferrer"
								className="transition-colors hover:text-foreground/70"
              >
                Community
              </a>
            </li>
            <li>
							<Link
								to={'/pricing'}
								className="transition-colors hover:text-foreground/70"
							>
								Pricing
							</Link>
						</li>
					</ul>
        </nav>

      </div>
			<div
				aria-hidden="true"
				className="pointer-events-none absolute inset-x-0 bottom-4 translate-y-1/2 text-center text-[7rem] md:bottom-6 md:text-[10rem] font-bold tracking-wider text-gray-bright/20"
			>
				{DEFAULT_SITE_NAME}
			</div>
		</footer>
	);
}
