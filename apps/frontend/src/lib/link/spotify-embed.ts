const SPOTIFY_HOST_PATTERN = /(^|\.)spotify\.com$/i;
const SPOTIFY_ID_PATTERN = /^[A-Za-z0-9]{22}$/;
const SPOTIFY_IFRAME_API_SRC = "https://open.spotify.com/embed/iframe-api/v1";

type SpotifyPlayableResource = "playlist" | "track";

type SpotifyPlaybackEvent = {
	data: {
		isPaused: boolean;
		position: number;
		duration: number;
	};
};

export type SpotifyPlaybackSnapshot = {
	isPlaying: boolean;
	url: string | null;
};

export type SpotifyEmbedController = {
	loadEntity: (spotifyUriOrUrl: string) => void;
	play: () => void;
	pause: () => void;
	addListener: (
		event: "playback_started" | "playback_update",
		listener: (event: SpotifyPlaybackEvent) => void,
	) => void;
	destroy: () => void;
};

export type SpotifyIframeApi = {
	createController: (
		element: HTMLElement,
		options: {
			url: string;
			width: number;
			height: number;
		},
		callback: (controller: SpotifyEmbedController) => void,
	) => void;
};

declare global {
	interface Window {
		onSpotifyIframeApiReady?: (api: SpotifyIframeApi) => void;
	}
}

let spotifyIframeApiPromise: Promise<SpotifyIframeApi> | undefined;
let spotifyEmbedControllerPromise: Promise<SpotifyEmbedController> | undefined;
let spotifyEmbedController: SpotifyEmbedController | undefined;
let spotifyPlaybackSnapshot: SpotifyPlaybackSnapshot = {
	isPlaying: false,
	url: null,
};
let spotifyPlaybackRequestId = 0;
const spotifyPlaybackListeners = new Set<() => void>();

function setSpotifyPlaybackSnapshot(next: SpotifyPlaybackSnapshot): void {
	spotifyPlaybackSnapshot = next;
	for (const listener of spotifyPlaybackListeners) listener();
}

function watchSpotifyPlayback(controller: SpotifyEmbedController): void {
	controller.addListener("playback_started", () => {
		setSpotifyPlaybackSnapshot({
			...spotifyPlaybackSnapshot,
			isPlaying: true,
		});
	});
	controller.addListener("playback_update", ({ data }) => {
		const hasFinished =
			data.duration > 0 && data.position >= data.duration - 250;
		if (data.isPaused || hasFinished) {
			setSpotifyPlaybackSnapshot({ isPlaying: false, url: null });
			return;
		}
		setSpotifyPlaybackSnapshot({
			...spotifyPlaybackSnapshot,
			isPlaying: true,
		});
	});
}

function getSpotifyResource(
	value: string,
): { type: SpotifyPlayableResource; id: string } | undefined {
	try {
		const url = new URL(value);
		if (!SPOTIFY_HOST_PATTERN.test(url.hostname)) return undefined;

		const segments = url.pathname
			.split("/")
			.map((segment) => {
				try {
					return decodeURIComponent(segment);
				} catch {
					return segment;
				}
			})
			.filter(Boolean);

		for (const type of ["playlist", "track"] as const) {
			const typeIndex = segments.lastIndexOf(type);
			const id = typeIndex >= 0 ? segments[typeIndex + 1] : undefined;
			if (id && SPOTIFY_ID_PATTERN.test(id)) return { type, id };
		}
	} catch {
		return undefined;
	}

	return undefined;
}

export function getSpotifyPlayableUrl(value: string): string | undefined {
	const resource = getSpotifyResource(value);
	return resource
		? `https://open.spotify.com/${resource.type}/${resource.id}`
		: undefined;
}

export function loadSpotifyIframeApi(): Promise<SpotifyIframeApi> {
	if (spotifyIframeApiPromise) return spotifyIframeApiPromise;

	spotifyIframeApiPromise = new Promise((resolve, reject) => {
		const previousReadyHandler = window.onSpotifyIframeApiReady;
		window.onSpotifyIframeApiReady = (api) => {
			previousReadyHandler?.(api);
			resolve(api);
		};

		const script = document.createElement("script");
		script.src = SPOTIFY_IFRAME_API_SRC;
		script.async = true;
		script.onerror = () => reject(new Error("Spotify Embed failed to load."));
		document.body.appendChild(script);
	});

	return spotifyIframeApiPromise;
}

function getSpotifyEmbedController(
	playableUrl: string,
): Promise<SpotifyEmbedController> {
	if (spotifyEmbedController) return Promise.resolve(spotifyEmbedController);
	if (spotifyEmbedControllerPromise) return spotifyEmbedControllerPromise;

	if (typeof document === "undefined") {
		return Promise.reject(new Error("Spotify Embed requires a browser."));
	}

	spotifyEmbedControllerPromise = loadSpotifyIframeApi().then(
		(api) =>
			new Promise<SpotifyEmbedController>((resolve) => {
				const wrapper = document.createElement("div");
				wrapper.setAttribute("aria-hidden", "true");
				Object.assign(wrapper.style, {
					position: "fixed",
					left: "-9999px",
					top: "0",
					width: "1px",
					height: "1px",
					overflow: "hidden",
					pointerEvents: "none",
				});
				const host = document.createElement("div");
				wrapper.appendChild(host);
				document.body.appendChild(wrapper);

				api.createController(
					host,
					{ url: playableUrl, width: 456, height: 152 },
					(controller) => {
						spotifyEmbedController = controller;
						watchSpotifyPlayback(controller);
						resolve(controller);
					},
				);
			}),
	);

	return spotifyEmbedControllerPromise;
}

export function prepareSpotifyEmbed(value: string): void {
	const playableUrl = getSpotifyPlayableUrl(value);
	if (!playableUrl) return;
	void getSpotifyEmbedController(playableUrl).catch(() => undefined);
}

export function subscribeToSpotifyPlayback(listener: () => void): () => void {
	spotifyPlaybackListeners.add(listener);
	return () => spotifyPlaybackListeners.delete(listener);
}

export function getSpotifyPlaybackSnapshot(): SpotifyPlaybackSnapshot {
	return spotifyPlaybackSnapshot;
}

export function stopSpotify(): void {
	spotifyPlaybackRequestId += 1;
	spotifyEmbedController?.pause();
	setSpotifyPlaybackSnapshot({ isPlaying: false, url: null });
}

export function playSpotify(value: string): void {
	const playableUrl = getSpotifyPlayableUrl(value);
	if (!playableUrl) return;
	const requestId = ++spotifyPlaybackRequestId;

	const play = (controller: SpotifyEmbedController) => {
		controller.loadEntity(playableUrl);
		controller.play();
	};
	setSpotifyPlaybackSnapshot({ isPlaying: true, url: playableUrl });

	if (spotifyEmbedController) {
		play(spotifyEmbedController);
		return;
	}

	void getSpotifyEmbedController(playableUrl)
		.then((controller) => {
			if (
				requestId !== spotifyPlaybackRequestId ||
				!spotifyPlaybackSnapshot.isPlaying ||
				spotifyPlaybackSnapshot.url !== playableUrl
			) {
				return;
			}
			play(controller);
		})
		.catch(() => {
			setSpotifyPlaybackSnapshot({ isPlaying: false, url: null });
		});
}
