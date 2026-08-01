import type { pages } from "@db/schema";
import type { PageResponse } from "@sinabro/api";

export const mapPageResponse = (
	page: typeof pages.$inferSelect,
): PageResponse => ({
	id: page.id,
	userId: page.userId,
	handle: page.handle,
	name: page.name,
	bio: page.bio,
	image: page.image,
	imageSource: page.imageSource ?? null,
	imageCrop: page.imageCrop ?? null,
	role: page.role,
	createdAt:
		page.createdAt.toISOString(),
	updatedAt:
		page.updatedAt.toISOString(),
});

export const mapPublicPageResponse = (
	page: typeof pages.$inferSelect,
): PageResponse => ({
	...mapPageResponse(page),
	imageSource: null,
	imageCrop: null,
});
