import { initWasm, Resvg } from "@resvg/resvg-wasm";
import resvgWasm from "@resvg/resvg-wasm/index_bg.wasm?module";
import { createFileRoute } from "@tanstack/react-router";
import satori, { init as initSatori } from "satori/standalone";
import yogaWasm from "satori/yoga.wasm?module";
import { getPageByHandle } from "@/lib/api/pages.functions";
import { getProfileImageUrl } from "@/lib/api/profile-image-api";

const WIDTH = 1200;
const HEIGHT = 630;
let resvgReady: Promise<void> | undefined;
let satoriReady: Promise<void> | undefined;

function toBase64(data: ArrayBuffer) {
	const bytes = new Uint8Array(data);
	let binary = "";
	for (let index = 0; index < bytes.length; index += 0x8000) {
		binary += String.fromCharCode(...bytes.subarray(index, index + 0x8000));
	}
	return btoa(binary);
}

async function ensureResvg() {
	if (!resvgReady) {
		resvgReady = initWasm(resvgWasm).catch((error) => {
			resvgReady = undefined;
			throw error;
		});
	}
	await resvgReady;
}

async function ensureSatori() {
	if (!satoriReady) {
		satoriReady = initSatori(yogaWasm).catch((error) => {
			satoriReady = undefined;
			throw error;
		});
	}
	await satoriReady;
}

function createImageTree({
	logoData,
	pageImageData,
	pageName,
}: {
	logoData: string;
	pageImageData: string;
	pageName?: string;
}) {
	return (
		<div
			style={{
				display: "flex",
				position: "relative",
				width: WIDTH,
				height: HEIGHT,
				backgroundColor: "#ffffff",
				color: "#171717",
				fontFamily: "Inter",
			}}
		>
			<div
				style={{
					display: "flex",
					alignItems: "center",
					gap: 10,
					position: "absolute",
					top: 64,
					left: 72,
				}}
			>
				<img src={logoData} alt="Grabbin" width={44} height={44} />
				<span style={{ fontSize: 34, fontWeight: 700 }}>Grabbin</span>
			</div>

			{pageName ? (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						alignItems: "center",
						justifyContent: "center",
						gap: 24,
						position: "absolute",
						top: 0,
						right: 0,
						bottom: 0,
						left: 0,
					}}
				>
					<img
						src={pageImageData}
						alt=""
						width={180}
						height={180}
						style={{ borderRadius: 90, objectFit: "cover" }}
					/>
					<span style={{ fontSize: 48, fontWeight: 700 }}>{pageName}</span>
				</div>
			) : (
				<div
					style={{
						display: "flex",
						flexDirection: "column",
						gap: 2,
						position: "absolute",
						bottom: 64,
						left: 72,
					}}
				>
					<span
						style={{
							fontSize: 60,
							fontWeight: 700,
							textShadow:
								"0 0 36px rgba(255, 255, 255, 0.95), 0 0 72px rgba(255, 255, 255, 0.75)",
						}}
					>
						A cleaner, more beautiful
					</span>
					<span
						style={{
							fontSize: 60,
							fontWeight: 700,
							textShadow:
								"0 0 36px rgba(255, 255, 255, 0.95), 0 0 72px rgba(255, 255, 255, 0.75)",
						}}
					>
						Link in Bio
					</span>
				</div>
			)}
		</div>
	);
}

export const Route = createFileRoute("/og.png")({
	server: {
		handlers: {
			GET: async ({ request }) => {
				const requestUrl = new URL(request.url, "http://localhost");
				const handle = requestUrl.searchParams.get("handle")?.trim();
				const [
					regularFontResponse,
					boldFontResponse,
					logoResponse,
					pageResult,
				] = await Promise.all([
					fetch(new URL("/fonts/Inter-Regular.ttf", requestUrl)),
					fetch(new URL("/fonts/Inter-Bold.ttf", requestUrl)),
					fetch(new URL("/logo512.png", requestUrl)),
					handle ? getPageByHandle({ data: { handle } }) : null,
				]);

				if (
					!regularFontResponse.ok ||
					!boldFontResponse.ok ||
					!logoResponse.ok
				) {
					return new Response("OG image assets unavailable.", { status: 500 });
				}

				const [regularFontData, boldFontData, logoData] = await Promise.all([
					regularFontResponse.arrayBuffer(),
					boldFontResponse.arrayBuffer(),
					logoResponse.arrayBuffer(),
				]);
				const logoDataUrl = `data:image/png;base64,${toBase64(logoData)}`;
				const page = pageResult?.page;
				const pageName = page?.name?.trim() || handle?.replaceAll("/", "");
				let pageImageDataUrl = logoDataUrl;

				const pageImageUrl = page
					? getProfileImageUrl(page.image, page.updatedAt)
					: null;
				if (pageImageUrl) {
					const pageImageResponse = await fetch(pageImageUrl);
					if (pageImageResponse.ok) {
						pageImageDataUrl = `data:${pageImageResponse.headers.get("content-type") ?? "image/png"};base64,${toBase64(await pageImageResponse.arrayBuffer())}`;
					}
				}

				await ensureSatori();
				const svg = await satori(
					createImageTree({
						logoData: logoDataUrl,
						pageImageData: pageImageDataUrl,
						pageName,
					}),
					{
						width: WIDTH,
						height: HEIGHT,
						fonts: [
							{
								name: "Inter",
								data: regularFontData,
								weight: 400,
							},
							{
								name: "Inter",
								data: boldFontData,
								weight: 700,
							},
						],
					},
				);

				await ensureResvg();
				const renderedImage = new Resvg(svg).render();
				try {
					return new Response(renderedImage.asPng(), {
						headers: {
							"Cache-Control": "public, max-age=300",
							"Content-Type": "image/png",
						},
					});
				} finally {
					renderedImage.free();
				}
			},
		},
	},
});
