import { motion, useReducedMotion } from "framer-motion";
import { useEffect, useState } from "react";
import { FEATURE_ITEMS } from "@/constant/features";

const featurePreviewMap = {
	"drag-drop": DragDropPreview,
	"rich-content": RichContentPreview,
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
				<h2 className="text-3xl font-semibold md:text-4xl">Built for You</h2>
			</div>

			<section className="grid w-full max-w-5xl grid-cols-1 gap-5 md:grid-cols-2">
				{FEATURE_ITEMS.map(
					({ icon: Icon, title, description, thumbnail, preview }, idx) => {
						const Preview = featurePreviewMap[preview];
						const iconColor = idx === 0 ? "text-violet-500" : "text-sky-500";

						return (
							<div
								key={title}
								className="flex h-full w-full flex-col gap-6 rounded-2xl bg-secondary/80 p-8"
							>
								<div className="flex flex-col gap-0">
									<div className="flex flex-col gap-3">
										<div className="rounded-full bg-background size-10 flex items-center justify-center">
											<Icon className={`size-7 ${iconColor}`} />
										</div>
										<p
											className={`text-xl font-medium md:text-2xl ${iconColor}`}
										>
											{title}
										</p>
									</div>
									<p className="text-xl font-medium md:text-2xl">
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
					},
				)}
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

function DragDropPreview() {
	return <AbstractLayoutPreview animated />;
}

function RichContentPreview() {
	return <AbstractLayoutPreview />;
}

const abstractLayoutItems = [
	{ id: "small", className: "h-14 w-16" },
	{ id: "large", className: "h-28 w-24" },
	{ id: "medium", className: "h-20 w-20" },
];

function AbstractLayoutPreview({ animated = false }: { animated?: boolean }) {
	const shouldReduceMotion = useReducedMotion();
	const [order, setOrder] = useState(() =>
		abstractLayoutItems.map(({ id }) => id),
	);

	useEffect(() => {
		if (!animated || shouldReduceMotion) return;
		const interval = setInterval(() => {
			setOrder((currentOrder) => [
				currentOrder[1],
				currentOrder[2],
				currentOrder[0],
			]);
		}, 1800);
		return () => clearInterval(interval);
	}, [animated, shouldReduceMotion]);

	return (
		<div className="flex h-full items-center justify-center p-8">
			<div className="flex h-56 w-full max-w-sm items-end justify-center gap-3 rounded-2xl border border-foreground/10 bg-background/30 p-8">
				{order.map((id) => {
					const item = abstractLayoutItems.find(
						(layoutItem) => layoutItem.id === id,
					);
					if (!item) return null;

					return (
						<motion.div
							key={item.id}
							layout={animated}
							transition={{
								type: "spring",
								duration: 0.6,
								bounce: 0.12,
							}}
							className={`rounded-xl border border-foreground/10 bg-foreground/10 ${item.className}`}
						/>
					);
				})}
			</div>
		</div>
	);
}
