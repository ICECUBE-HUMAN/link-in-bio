"use client";

import { Link } from "@tanstack/react-router";
import { MenuIcon, XIcon } from "lucide-react";
import { motion } from "motion/react";
import { useState } from "react";
import { JoinForFreeButton } from "@/components/auth/header-auth-actions";
import { DEFAULT_APP_LOGO, DEFAULT_SITE_NAME } from "@/lib/seo/metadata";
import { cn } from "@/lib/shared/utils";
import { routeTree } from "@/routeTree.gen";
import { activeHeaderVariant, headerVariants } from "./header.config";

type HeaderRoute = {
	fullPath?: string;
	children?: Record<string, HeaderRoute>;
	options?: {
		staticData?: {
			header?: {
				label: string;
				order?: number;
			};
		};
	};
};

function normalizeTo(fullPath: string) {
	return fullPath === "/" ? fullPath : fullPath.replace(/\/$/, "");
}

function collectHeaderRoutes(
	route: HeaderRoute,
): Array<{ to: string; label: string; order: number }> {
	const current = route.options?.staticData?.header;
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
		collectHeaderRoutes,
	);

	return [...items, ...children];
}

export default function Header() {
	const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
	const headerRoutes = collectHeaderRoutes(routeTree as HeaderRoute).sort(
		(a, b) => a.order - b.order,
	);
	const headerVariant = headerVariants[activeHeaderVariant];

	return (
		<header className={cn(headerVariant.headerClass)}>
			<nav
				aria-label="Primary"
				className={cn(
					headerVariant.navClass,
					"rounded-full bg-secondary/60 backdrop-blur-sm",
				)}
			>
				<div className="flex items-center justify-between gap-4 px-1 py-2 lg:px-0 lg:py-0">
					<Link
						to="/"
						className="shrink-0 overflow-hidden rounded-full"
						aria-label={DEFAULT_SITE_NAME}
					>
						<img
							src={DEFAULT_APP_LOGO}
							alt={DEFAULT_SITE_NAME}
							className="size-10 object-contain md:size-10 lg:size-10"
						/>
					</Link>

					<button
						type="button"
						className="inline-flex size-10 items-center justify-center rounded-xl text-foreground lg:hidden"
						aria-label={isMobileMenuOpen ? "Close menu" : "Open menu"}
						aria-expanded={isMobileMenuOpen}
						aria-controls="header-mobile-menu"
						onClick={() => setIsMobileMenuOpen((open) => !open)}
					>
						{isMobileMenuOpen ? (
							<XIcon className="size-5" />
						) : (
							<MenuIcon className="size-5" />
						)}
					</button>
				</div>

				<motion.div
					id="header-mobile-menu"
					initial={false}
					animate={{
						height: isMobileMenuOpen ? "auto" : 0,
						opacity: isMobileMenuOpen ? 1 : 0,
					}}
					transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
					className={cn(
						"overflow-hidden lg:hidden",
						!isMobileMenuOpen && "pointer-events-none",
					)}
				>
					<div className="flex flex-col gap-4 px-2 pt-4">
						<ul className="flex flex-col gap-4">
							{headerRoutes.map((route) => (
								<li key={route.to}>
									<Link
										to={route.to}
										className="block text-lg text-foreground/80 transition-colors hover:text-foreground"
										onClick={() => setIsMobileMenuOpen(false)}
									>
										{route.label}
									</Link>
								</li>
							))}
						</ul>

						<div className="mt-5 py-3">
							<JoinForFreeButton className="h-12 w-full justify-center px-5" />
						</div>
					</div>
				</motion.div>

				<div className="hidden items-center justify-between gap-6 lg:flex">
					<ul className="flex items-center gap-5 text-sm font-medium">
						{headerRoutes.map((route) => (
							<li key={route.to}>
								<Link
									to={route.to}
									className="text-foreground/80 text-sm transition-colors hover:text-foreground"
								>
									{route.label}
								</Link>
							</li>
						))}
					</ul>
					<JoinForFreeButton className="h-10 rounded-full px-4 text-sm" />
				</div>
			</nav>
		</header>
	);
}
