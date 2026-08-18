import { Link } from "@tanstack/react-router";
import { DEFAULT_SEO_DESCRIPTION, DEFAULT_SITE_NAME } from "@/lib/seo/metadata";
import { collectRoutes, type StaticRoute } from "@/lib/site/routes";
import { routeTree } from "@/routeTree.gen";

export function Footer() {
	const footerRoutes = collectRoutes(routeTree as StaticRoute, "footer").sort(
		(a, b) => a.order - b.order,
	);

	return (
		<footer className="relative overflow-hidden bg-background">
			<div className="relative mx-auto flex min-h-[36vh] w-full max-w-4xl flex-col justify-between gap-8 px-4 py-24 text-center items-center text-gray-bright">
				<div className="flex flex-col gap-6 items-center justify-center">
					<aside className="flex items-center gap-2">
						<div className="size-16 rounded-full">
							<img
								src={"/favicon.svg"}
								alt={DEFAULT_SITE_NAME}
								className="rounded-[inherit] size-full"
							/>
						</div>
						<h3 className="font-semibold text-3xl text-primary">{DEFAULT_SITE_NAME}</h3>
					</aside>
					<div className="flex flex-col items-center font-medium gap-1 text-lg">
						<p>
							Designed for everyone
            </p>
            <p>
              Built by{" "}
							<a
								href={"https://x.com/kinwooky"}
								target="_blank"
								rel="noreferrer"
								className="underline"
							>
								wooky
							</a>
            </p>
					</div>
					<div className="flex justify-center text-lg font-medium">
						<p></p>
					</div>
				</div>

				<nav aria-label="Footer">
					<ul className="flex flex-col items-center gap-5 text-lg font-medium sm:flex-row">
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
								to={"/pricing"}
								className="transition-colors hover:text-foreground/70"
							>
								Pricing
							</Link>
						</li>
					</ul>
				</nav>
			</div>
		</footer>
	);
}
