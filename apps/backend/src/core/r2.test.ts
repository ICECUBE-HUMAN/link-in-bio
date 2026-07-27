import {
	describe,
	expect,
	it,
} from "bun:test";
import {
	createItemMediaKey,
	getItemMediaUrl,
	isItemMediaKey,
	MAX_ITEM_MEDIA_SIZE,
	sanitizeMediaFilename,
	validateItemMediaUpload,
} from "@core/r2";

describe("item media R2 boundaries", () => {
	it("rejects traversal and keeps the key within the owner item prefix", () => {
		expect(
			sanitizeMediaFilename(
				"../secret.png",
			),
		).toBeNull();
		expect(
			createItemMediaKey({
				userId: "user_1",
				itemId: "item_1",
				filename: "profile photo.png",
			}),
		).toBe(
			"users/user_1/bento/item_1/profile-photo.png",
		);
		expect(
			isItemMediaKey(
				"users/other/bento/item_1/file.png",
			),
		).toBe(true);
		expect(
			isItemMediaKey(
				"users/user_1/../private/file.png",
			),
		).toBe(false);
	});

	it("enforces media MIME and size limits", () => {
		expect(
			validateItemMediaUpload({
				contentType: "image/png",
				size: 1,
			}),
		).toBe(true);
		expect(
			validateItemMediaUpload({
				contentType: "text/html",
				size: 1,
			}),
		).toBe(false);
		expect(
			validateItemMediaUpload({
				contentType: "video/mp4",
				size: MAX_ITEM_MEDIA_SIZE + 1,
			}),
		).toBe(false);
	});

	it("maps valid object keys to the configured public URL", () => {
		expect(
			getItemMediaUrl(
				"https://cdn.example.com/",
				"users/user_1/bento/item_1/file name.png",
			),
		).toBe(
			"https://cdn.example.com/users/user_1/bento/item_1/file%20name.png",
		);
	});
});
