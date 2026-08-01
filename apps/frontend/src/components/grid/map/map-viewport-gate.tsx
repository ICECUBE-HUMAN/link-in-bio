import {
	type ReactElement,
	type ReactNode,
	useEffect,
	useRef,
	useState,
} from "react";

export type MapViewportGateProps = {
	forceMount?: boolean;
	placeholder: ReactNode;
	children: ReactNode;
};

export function MapViewportGate({
	forceMount = false,
	placeholder,
	children,
}: MapViewportGateProps): ReactElement {
	const containerRef = useRef<HTMLDivElement>(null);
	const [isNearViewport, setIsNearViewport] = useState(false);

	useEffect(() => {
		if (forceMount) {
			setIsNearViewport(true);
			return;
		}

		const container = containerRef.current;
		if (!container || typeof IntersectionObserver === "undefined") {
			setIsNearViewport(true);
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => setIsNearViewport(entry?.isIntersecting ?? false),
			{ rootMargin: "200px 0px" },
		);
		observer.observe(container);

		return () => observer.disconnect();
	}, [forceMount]);

	return (
		<div ref={containerRef} className="relative size-full min-h-0">
			{isNearViewport ? children : placeholder}
		</div>
	);
}
