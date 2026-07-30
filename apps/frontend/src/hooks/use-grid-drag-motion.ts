import {
	useMotionValue,
	useMotionValueEvent,
	useReducedMotion,
	useSpring,
	useTransform,
	useVelocity,
} from "motion/react";
import { useEffect, useRef } from "react";
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

function getDragRotationScale(element: HTMLElement | null) {
	return element?.querySelector('[data-grid-item-type="section"]')
		? WIDE_ITEM_ROTATION_SCALE
		: 1;
}

function setDragRotation(
	element: HTMLElement | null,
	rotation: { x: string; z: string },
) {
	const card = element?.querySelector<HTMLElement>("[data-grid-item-card]");
	if (!card) return;

	const scale = getDragRotationScale(element);
	card.style.setProperty(
		"--grid-drag-rotate-x",
		`${Number.parseFloat(rotation.x) * scale}deg`,
	);
	card.style.setProperty(
		"--grid-drag-rotate-z",
		`${Number.parseFloat(rotation.z) * scale}deg`,
	);
}

function resetDragRotation(element: HTMLElement | null) {
	setDragRotation(element, { x: "0deg", z: "0deg" });
}

export function useGridDragMotion() {
	const shouldReduceMotion = useReducedMotion();
	const draggingElementRef = useRef<HTMLElement | null>(null);
	const pendingRotationRef = useRef({ x: "0deg", z: "0deg" });
	const rotationFrameRef = useRef<number | null>(null);
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

	const cancelRotationFrame = () => {
		if (rotationFrameRef.current === null) return;
		window.cancelAnimationFrame(rotationFrameRef.current);
		rotationFrameRef.current = null;
	};

	const scheduleRotation = (axis: "x" | "z", value: string) => {
		pendingRotationRef.current[axis] = value;
		if (rotationFrameRef.current !== null) return;

		rotationFrameRef.current = window.requestAnimationFrame(() => {
			rotationFrameRef.current = null;
			setDragRotation(draggingElementRef.current, pendingRotationRef.current);
		});
	};

	useMotionValueEvent(smoothDragRotateX, "change", (value) => {
		if (shouldReduceMotion) return;
		scheduleRotation("x", value);
	});
	useMotionValueEvent(smoothDragRotateZ, "change", (value) => {
		if (shouldReduceMotion) return;
		scheduleRotation("z", value);
	});

	useEffect(() => cancelRotationFrame, []);

	const onDragStart: EventCallback = (
		_currentLayout,
		_oldItem,
		_newItem,
		_placeholder,
		event,
		element,
	) => {
		draggingElementRef.current = element;
		cancelRotationFrame();
		pendingRotationRef.current = { x: "0deg", z: "0deg" };
		resetDragRotation(element);
		if (shouldReduceMotion) return;
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
		if (shouldReduceMotion) return;
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
		cancelRotationFrame();
		resetDragRotation(element ?? draggingElementRef.current);
		draggingElementRef.current = null;
	};

	return { onDragStart, onDrag, onDragStop };
}
