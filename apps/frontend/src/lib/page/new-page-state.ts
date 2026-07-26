import {
	type HandleAvailabilityResponse,
	normalizePageHandle,
} from "@sinabro/api";

const handleAvailabilityMessages = {
	invalid: "Enter a valid handle.",
	reserved: "This handle is reserved.",
	taken: "This handle is already taken.",
} as const;

export function getHandleAvailabilityError(
	availability: HandleAvailabilityResponse | null,
) {
	if (!availability?.reason) {
		return null;
	}

	return handleAvailabilityMessages[availability.reason];
}

export function getHandleAvailabilityStatus(
	handle: string,
	availability: HandleAvailabilityResponse | null,
) {
	const normalizedHandle = normalizePageHandle(handle);
	const canCreatePage =
		availability?.available === true &&
		availability.handle === normalizedHandle;

	return {
		normalizedHandle,
		canCreatePage,
		error: getHandleAvailabilityError(availability),
	};
}
