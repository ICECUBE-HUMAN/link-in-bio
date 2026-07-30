import {
	useMotionValue,
	useMotionValueEvent,
	useSpring,
	useTransform,
	useVelocity,
} from "motion/react";
import { useRef } from "react";
import type { EventCallback } from "react-grid-layout";

type PointerPoint = { x: number; y: number };

const MAX_DRAG_VELOCITY = 1400;
const VELOCITY_TO_ROTATION = 0.012;
const WIDE_ITEM_ROTATION_SCALE = 0.6;

function getPointerPoint(event: Event): PointerPoint | null {
	if ("clientX" in event && "clientY" in event) {
		const { clientX, clientY } = event as MouseEvent;
		if (typeof clientX === "number" && typeof clientY === "number") {
			return { x: clientX, y: clientY };
		}
	}

	const touch = (event as TouchEvent).touches?.[0];
	return touch ? { x: touch.clientX, y: touch.clientY } : null;
}

function setDragRotation(
	element: HTMLElement | null,
	axis: "x" | "z",
	value: string,
) {
	const card = element?.querySelector<HTMLElement>("[data-grid-item-card]");
	if (!card) return;

	const isWideItem = Boolean(
		element?.querySelector('[data-grid-item-type="section"]'),
	);
	const nextValue = isWideItem
		? `${Number.parseFloat(value) * WIDE_ITEM_ROTATION_SCALE}deg`
		: value;
	card.style.setProperty(`--grid-drag-rotate-${axis}`, nextValue);
}

function resetDragRotation(element: HTMLElement | null) {
	setDragRotation(element, "x", "0deg");
	setDragRotation(element, "z", "0deg");
}

export function useGridDragMotion() {
	const draggingElementRef = useRef<HTMLElement | null>(null);
	const dragPointerX = useMotionValue(0);
	const dragPointerY = useMotionValue(0);
	const dragVelocityX = useVelocity(dragPointerX);
	const dragVelocityY = useVelocity(dragPointerY);
	const dragRotateX = useTransform(
		dragVelocityY,
		[-MAX_DRAG_VELOCITY, 0, MAX_DRAG_VELOCITY],
		[
			`${MAX_DRAG_VELOCITY * VELOCITY_TO_ROTATION}deg`,
			"0deg",
			`${-MAX_DRAG_VELOCITY * VELOCITY_TO_ROTATION}deg`,
		],
	);
	const dragRotateZ = useTransform(
		dragVelocityX,
		[-MAX_DRAG_VELOCITY, 0, MAX_DRAG_VELOCITY],
		[
			`${-MAX_DRAG_VELOCITY * VELOCITY_TO_ROTATION}deg`,
			"0deg",
			`${MAX_DRAG_VELOCITY * VELOCITY_TO_ROTATION}deg`,
		],
	);
	const smoothDragRotateX = useSpring(dragRotateX, {
		stiffness: 500,
		damping: 35,
		mass: 0.25,
	});
	const smoothDragRotateZ = useSpring(dragRotateZ, {
		stiffness: 500,
		damping: 35,
		mass: 0.25,
	});

	useMotionValueEvent(smoothDragRotateX, "change", (value) => {
		setDragRotation(draggingElementRef.current, "x", value);
	});
	useMotionValueEvent(smoothDragRotateZ, "change", (value) => {
		setDragRotation(draggingElementRef.current, "z", value);
	});

	const onDragStart: EventCallback = (
		_currentLayout,
		_oldItem,
		_newItem,
		_placeholder,
		event,
		element,
	) => {
		draggingElementRef.current = element;
		resetDragRotation(element);
		const point = getPointerPoint(event);
		if (!point) return;
		dragPointerX.set(point.x);
		dragPointerY.set(point.y);
	};

	const onDrag: EventCallback = (
		_currentLayout,
		_oldItem,
		_newItem,
		_placeholder,
		event,
		element,
	) => {
		const point = getPointerPoint(event);
		if (!point) return;
		draggingElementRef.current = element ?? draggingElementRef.current;
		dragPointerX.set(point.x);
		dragPointerY.set(point.y);
	};

	const onDragStop: EventCallback = (
		_currentLayout,
		_oldItem,
		_newItem,
		_placeholder,
		_event,
		element,
	) => {
		resetDragRotation(element ?? draggingElementRef.current);
		draggingElementRef.current = null;
	};

	return { onDragStart, onDrag, onDragStop };
}
