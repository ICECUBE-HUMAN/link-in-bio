import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { FEATURE_ITEMS } from "@/constant/features";

const featurePreviewMap = {
	"type-tester": TypeTester,
	"layout-animation": LayoutAnimation,
	"speed-indicator": SpeedIndicator,
} as const;

export default function FeatureSection() {
	return (
		<section className="min-h-lvh flex flex-col items-center gap-16 py-20">
			<div className="flex flex-col gap-6 items-center text-center">
				<h2 className="text-3xl font-semibold md:text-5xl">Amazing Features</h2>
				{/*<p className="max-w-md font-normal text-lg text-gray-bright">
          Use Mobbin for free as long as you like or get full access with any of our paid plans.
        </p>*/}
			</div>

			<section className="grid w-full max-w-6xl grid-cols-1 gap-8 md:grid-cols-3">
				{FEATURE_ITEMS.map(({ title, description, thumbnail, preview }) => {
					const Preview = featurePreviewMap[preview];

					return (
						<div
							key={title}
							className="flex h-full w-full flex-col items-center gap-6"
						>
							<div className="aspect-square w-full rounded-2xl bg-secondary/80">
								{thumbnail ? (
									<img
										src={thumbnail}
										alt="Thumbnail"
										className="h-full w-full object-contain"
									/>
								) : (
									<Preview />
								)}
							</div>
							<div className="flex flex-col items-center gap-1 text-center">
								<p className="text-base font-medium md:text-xl">{title}</p>
								<p className="max-w-xs text-sm font-light text-gray-bright md:text-base">
									{description}
								</p>
							</div>
						</div>
					);
				})}
			</section>
		</section>
	);
}

export function FeatureSection2() {
	return (
		<section className="min-h-lvh flex flex-col items-center gap-16 py-20">
			<div className="flex flex-col gap-6 items-center text-center">
				<h2 className="text-3xl font-semibold md:text-5xl">Amazing Features</h2>
			</div>

			<section className="grid w-full max-w-5xl grid-cols-1 gap-5 md:grid-cols-2">
				{FEATURE_ITEMS.map(({ title, description, thumbnail, preview }) => {
					const Preview = featurePreviewMap[preview];

					return (
						<div
							key={title}
							className="flex h-full w-full flex-col gap-6 rounded-2xl bg-secondary/80 p-8"
						>
							<div className="flex flex-col gap-4">
								<p className="text-xl font-medium md:text-2xl">{title}</p>
								<p className="max-w-xs text-sm font-light text-gray-bright md:text-base">
									{description}
								</p>
							</div>
							<div className="aspect-square w-full rounded-2xl">
								{thumbnail ? (
									<img
										src={thumbnail}
										alt="Thumbnail"
										className="w-full h-full object-contain"
									/>
								) : (
									<Preview />
								)}
							</div>
						</div>
					);
				})}
			</section>
		</section>
	);
}

export function FeatureSection3() {
	return (
		<section className="flex flex-col items-center gap-16 py-20">
			<div className="flex flex-col items-center gap-6 text-center">
				<h2 className="text-3xl font-semibold md:text-5xl">Amazing Features</h2>
			</div>

			<section className="flex w-full max-w-6xl flex-col gap-20 md:gap-12">
				{FEATURE_ITEMS.map(
					({ title, description, thumbnail, preview }, idx) => {
						const Preview = featurePreviewMap[preview];

						return (
							<div
								key={title}
								className={`flex flex-col gap-10 rounded-2xl md:items-center md:gap-40 ${
									idx % 2 === 0 ? "md:flex-row" : "md:flex-row-reverse"
								}`}
							>
								<div className="flex flex-1 flex-col gap-4">
									<p className="text-2xl font-medium md:text-3xl">{title}</p>
									<p className="max-w-md text-sm font-light text-gray-bright md:text-base">
										{description}
									</p>
								</div>
								<div className="aspect-square w-full flex-1 rounded-2xl bg-secondary">
									{thumbnail ? (
										<img
											src={thumbnail}
											alt="Thumbnail"
											className="h-full w-full object-contain"
										/>
									) : (
										<Preview />
									)}
								</div>
							</div>
						);
					},
				)}
			</section>
		</section>
	);
}

function TypeTester() {
	const [scale, setScale] = useState(1);

	useEffect(() => {
		const interval = setInterval(() => {
			setScale((prev) => (prev === 1 ? 1.5 : 1));
		}, 2000);
		return () => clearInterval(interval);
	}, []);

	return (
		<div className="flex items-center justify-center h-full">
			<motion.span
				className="font-serif text-6xl md:text-8xl text-foreground"
				animate={{ scale }}
				transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
			>
				Aa
			</motion.span>
		</div>
	);
}

function LayoutAnimation() {
	const [layout, setLayout] = useState(0);

	useEffect(() => {
		const interval = setInterval(() => {
			setLayout((prev) => (prev + 1) % 3);
		}, 2500);
		return () => clearInterval(interval);
	}, []);

	const layouts = [
		"grid-cols-2 grid-rows-2",
		"grid-cols-3 grid-rows-1",
		"grid-cols-1 grid-rows-3",
	];

	return (
		<div className="h-full p-4 flex items-center justify-center">
			<motion.div
				className={`grid ${layouts[layout]} gap-2 w-full max-w-[140px]`}
				layout
			>
				{[1, 2, 3].map((i) => (
					<motion.div
						key={i}
						className="bg-primary/20 rounded-md min-h-[30px]"
						layout
						transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
					/>
				))}
			</motion.div>
		</div>
	);
}

function SpeedIndicator() {
	const [progress, setProgress] = useState(0);

	useEffect(() => {
		const timeout = setTimeout(() => setProgress(100), 500);
		return () => clearTimeout(timeout);
	}, []);

	return (
		<div className="flex flex-col items-center justify-center h-full gap-4">
			<span className="text-3xl md:text-4xl font-sans font-medium text-foreground">
				100ms
			</span>
			<span className="text-sm text-muted-foreground">Load Time</span>
			<div className="w-full max-w-[120px] h-1.5 bg-foreground/10 rounded-full overflow-hidden">
				<motion.div
					className="h-full bg-primary rounded-full"
					initial={{ width: 0 }}
					animate={{ width: `${progress}%` }}
					transition={{ duration: 0.1 }}
				/>
			</div>
		</div>
	);
}
