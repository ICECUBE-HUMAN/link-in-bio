import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import Confetti from "react-confetti";
import { Check, CheckCircle } from "reicon-react";
import { Button } from "@/components/ui/button";
import { env } from "@/env";

function SuccessCheck() {
	return (
		<span
			className="t-success-check text-green-500"
			data-state="in"
			aria-hidden="true"
		>
			<CheckCircle weight="Filled" className="size-8" />
		</span>
	);
}

export function PageCreationSuccess({ handle }: { handle: string }) {
	const [showConfetti, setShowConfetti] = useState(false);
	const [viewport, setViewport] = useState({ width: 0, height: 0 });
	const [copyState, setCopyState] = useState<"idle" | "copied" | "error">(
		"idle",
	);
	const copyResetRef = useRef<number | null>(null);

	useEffect(() => {
		const updateViewport = () =>
			setViewport({ width: window.innerWidth, height: window.innerHeight });
		updateViewport();
		window.addEventListener("resize", updateViewport);
		return () => window.removeEventListener("resize", updateViewport);
	}, []);

	useEffect(() => {
		setShowConfetti(true);
		const timeoutId = window.setTimeout(() => setShowConfetti(false), 4000);
		return () => window.clearTimeout(timeoutId);
	}, []);

	useEffect(
		() => () => {
			if (copyResetRef.current !== null)
				window.clearTimeout(copyResetRef.current);
		},
		[],
	);

	async function copyPageUrl() {
		try {
			await navigator.clipboard.writeText(`${env.VITE_APP_DOMAIN}/${handle}`);
			setCopyState("copied");
		} catch {
			setCopyState("error");
		}
		if (copyResetRef.current !== null)
			window.clearTimeout(copyResetRef.current);
		copyResetRef.current = window.setTimeout(() => {
			setCopyState("idle");
			copyResetRef.current = null;
		}, 1400);
	}

	return (
		<>
			{showConfetti && viewport.width > 0 ? (
				<Confetti
					className="pointer-events-none fixed inset-0 z-50"
					style={{ position: "fixed" }}
					width={viewport.width}
					height={viewport.height}
					numberOfPieces={180}
					recycle={false}
					run
					gravity={0.35}
					initialVelocityX={{ min: -2, max: 2 }}
					initialVelocityY={{ min: 4, max: 10 }}
					tweenDuration={3500}
					confettiSource={{ x: 0, y: 0, w: viewport.width, h: 0 }}
					onConfettiComplete={() => setShowConfetti(false)}
				/>
			) : null}
			<div className="flex flex-col items-start gap-8" aria-live="polite">
				<div className="flex flex-col items-start gap-2">
					<SuccessCheck />
					<div className="flex flex-col gap-0.5">
						<h1 className="text-xl font-medium">Looking good!</h1>
						<p className="text-sm text-muted-foreground text-balance">
							Now you can customize your profile and share it!
						</p>
					</div>
				</div>
				<div className="flex w-full flex-col gap-1.5">
					<div className="rounded-lg bg-secondary h-12 px-3 pr-1.5 text-base max-w-full flex justify-between items-center">
						<div>
							<span className="text-muted-foreground font-medium">
								{env.VITE_APP_DOMAIN}/
							</span>
							<span className="text-primary font-medium">{handle}</span>
						</div>
						<Button
							type="button"
							variant="outline"
							className="t-copy-button h-9 rounded-lg px-3 border-border/60 shadow-xs text-primary hover:bg-background"
							data-state={copyState}
							onClick={() => void copyPageUrl()}
						>
							<span className="t-copy-feedback" aria-live="polite">
								<span className="t-copy-icon" aria-hidden="true">
									<Check weight="Filled" className="size-4" />
								</span>
								<span className="t-copy-labels">
									<span className="t-copy-label t-copy-label-idle">
										Copy Link
									</span>
									<span className="t-copy-label t-copy-label-copied">
										{copyState === "error" ? "Copy failed" : "Copied"}
									</span>
								</span>
							</span>
						</Button>
					</div>
					<Button
						nativeButton={false}
						variant="default"
						size="lg"
						className="h-12 rounded-lg text-base"
						render={
							<Link to="/$handle" params={{ handle }}>
								Go to profile
							</Link>
						}
					/>
				</div>
			</div>
		</>
	);
}
