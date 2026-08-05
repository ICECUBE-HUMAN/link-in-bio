import { useEffect, useRef, useState } from "react";

type RevealOnViewOptions = {
	rootMargin?: string;
	threshold?: number;
};

export function useRevealOnView<T extends HTMLElement>({
	rootMargin = "0px",
	threshold = 0.15,
}: RevealOnViewOptions = {}) {
	const ref = useRef<T>(null);
	const [isShown, setIsShown] = useState(false);

	useEffect(() => {
		const element = ref.current;
		if (!element || isShown) return;

		if (typeof IntersectionObserver === "undefined") {
			setIsShown(true);
			return;
		}

		const observer = new IntersectionObserver(
			([entry]) => {
				if (!entry?.isIntersecting) return;
				setIsShown(true);
				observer.disconnect();
			},
			{ rootMargin, threshold },
		);

		observer.observe(element);
		return () => observer.disconnect();
	}, [isShown, rootMargin, threshold]);

	return { ref, isShown };
}
