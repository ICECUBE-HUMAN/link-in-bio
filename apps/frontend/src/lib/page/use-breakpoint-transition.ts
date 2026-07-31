import { useLayoutEffect, useRef, useState } from "react";
import type { Breakpoint } from "@/lib/grid/types";

type BreakpointTransition = "idle" | "exit" | "frame" | "enter";

type UseBreakpointTransitionOptions = {
	previewBreakpoint: Breakpoint;
	setPreviewBreakpoint: (breakpoint: Breakpoint) => void;
	shouldReduceMotion: boolean | null;
	flushPendingChanges: () => Promise<unknown>;
};

function getDuration(name: string, fallback: number) {
	const value = getComputedStyle(document.documentElement)
		.getPropertyValue(name)
		.trim();
	const milliseconds = value.endsWith("ms")
		? Number.parseFloat(value)
		: value.endsWith("s")
			? Number.parseFloat(value) * 1000
			: Number.parseFloat(value);
	return Number.isFinite(milliseconds) ? milliseconds + 50 : fallback;
}

export function useBreakpointTransition({
	previewBreakpoint,
	setPreviewBreakpoint,
	shouldReduceMotion,
	flushPendingChanges,
}: UseBreakpointTransitionOptions) {
	const [transition, setTransition] = useState<BreakpointTransition>("idle");
	const pendingBreakpoint = useRef<Breakpoint | null>(null);
	const isTransitioning = useRef(false);
	const timerRef = useRef<number | null>(null);

	useLayoutEffect(() => {
		return () => {
			if (timerRef.current !== null) window.clearTimeout(timerRef.current);
		};
	}, []);

	async function changeBreakpoint(nextBreakpoint: Breakpoint) {
		if (
			nextBreakpoint === previewBreakpoint ||
			transition !== "idle" ||
			isTransitioning.current
		)
			return;

		if (shouldReduceMotion) {
			await flushPendingChanges();
			setPreviewBreakpoint(nextBreakpoint);
			return;
		}

		isTransitioning.current = true;
		pendingBreakpoint.current = nextBreakpoint;

		try {
			await flushPendingChanges();
			setTransition("exit");
			const transitionDuration = getDuration("--breakpoint-fade-dur", 550);
			const frameDuration = getDuration("--breakpoint-frame-dur", 400);

			timerRef.current = window.setTimeout(() => {
				const breakpointToApply = pendingBreakpoint.current;
				if (!breakpointToApply) return;

				pendingBreakpoint.current = null;
				setPreviewBreakpoint(breakpointToApply);
				setTransition("frame");
				timerRef.current = window.setTimeout(() => {
					setTransition("enter");
					timerRef.current = window.setTimeout(() => {
						timerRef.current = null;
						isTransitioning.current = false;
						setTransition("idle");
					}, transitionDuration);
				}, frameDuration);
			}, transitionDuration);
		} catch (error) {
			if (timerRef.current !== null) {
				window.clearTimeout(timerRef.current);
				timerRef.current = null;
			}
			pendingBreakpoint.current = null;
			isTransitioning.current = false;
			setTransition("idle");
			throw error;
		}
	}

	return { breakpointTransition: transition, changeBreakpoint };
}
