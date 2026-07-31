import {
	describe,
	expect,
	it,
} from "bun:test";
import {
	createItemMediaKey,
	createProfileImageKey,
	getItemMediaUrl,
	isItemMediaKey,
	isProfileImageKey,
	MAX_ITEM_MEDIA_SIZE,
	sanitizeMediaFilename,
	validateItemMediaUpload,
} from "@core/r2";

describe("profile image R2 boundaries", () => {
	it("scopes profile images to the owner and page", () => {
		const key = createProfileImageKey(
			"user_1",
			"page_1",
			"image/png",
		);
		expect(key).toMatch(
			/^users\/user_1\/page_1\/profile\/[a-f0-9-]+\.png$/,
		);
		expect(key && isProfileImageKey(key)).toBe(true);
		expect(
			isProfileImageKey("users/profile/legacy.png"),
		).toBe(false);
	});
});

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
				pageId: "page_1",
				filename: "profile photo.png",
			}),
		).toBe(
			"users/user_1/page_1/profile-photo.png",
		);
		expect(
			isItemMediaKey(
				"users/other/page_1/file.png",
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
				"users/user_1/page_1/file name.png",
			),
		).toBe(
			"https://cdn.example.com/users/user_1/page_1/file%20name.png",
		);
	});
});
