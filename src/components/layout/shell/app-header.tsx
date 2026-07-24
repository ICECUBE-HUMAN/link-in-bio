import { Link } from "@tanstack/react-router";
import { AccountButton } from "@/components/auth/header-auth-actions";
import { DEFAULT_APP_LOGO, DEFAULT_SITE_NAME } from "@/lib/seo/metadata";

export default function AppHeader() {
	return (
		<header className="fixed inset-x-0 top-0 z-50 bg-background/60 backdrop-blur-sm">
			<nav
				aria-label="Global"
				className="mx-auto flex h-18 w-full max-w-3xl items-center justify-between px-5 py-4"
			>
				<Link
					to="/"
					className="flex items-center gap-3"
					aria-label={DEFAULT_SITE_NAME}
				>
					<img
						src={DEFAULT_APP_LOGO}
						alt={DEFAULT_SITE_NAME}
						className="size-9 rounded-md object-contain"
					/>
				</Link>
				<AccountButton />
			</nav>
		</header>
	);
}
