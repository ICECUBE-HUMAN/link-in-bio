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
	role: page.role,
	createdAt:
		page.createdAt.toISOString(),
	updatedAt:
		page.updatedAt.toISOString(),
});
