export default function DemoSection() {
	return (
		<section className="min-h-lvh flex flex-col items-center gap-16 py-20">
			<div className="flex flex-col gap-6 items-center text-center">
				<h2 className="text-3xl font-semibold md:text-5xl">Demo</h2>
				<p className="max-w-md font-normal text-lg text-gray-bright">
					Use Mobbin for free as long as you like or get full access with any of
					our paid plans.
				</p>
			</div>
			<video
				autoPlay
				loop
				muted
				playsInline
				className="w-full max-w-7xl rounded-2xl shadow-sm"
			>
				<source src="/videos/demo.webm" type="video/webm" />
				Your browser does not support the video tag.
			</video>
		</section>
	);
}
