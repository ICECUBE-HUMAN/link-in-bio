import { isAnnouncementEnabled } from "./announcement.config";

export const headerVariants = {
	fixed: {
		headerClass: isAnnouncementEnabled
			? "fixed inset-x-4 top-18 z-50 lg:inset-x-0 lg:top-18"
			: "fixed inset-x-4 top-4 z-50 lg:inset-x-0 lg:top-8",
		navClass:
			"mx-auto flex w-full max-w-xl flex-col gap-0 px-2 py-0 lg:py-2 lg:flex-row lg:items-center lg:justify-between lg:gap-6",
	},
	static: {
		headerClass: "w-full",
		navClass:
			"mx-auto flex w-full max-w-2xl flex-col gap-0 px-2 py-2 lg:flex-row lg:items-center lg:justify-between lg:gap-6",
	},
} as const;

export const activeHeaderVariant = "fixed" as const;
