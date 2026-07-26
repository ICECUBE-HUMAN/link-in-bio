import { HTTPException } from "hono/http-exception";

export class NotFoundError extends HTTPException {
	constructor(resource: string) {
		super(404, {
			message: `${resource} not found`,
		});
	}
}

export class UnauthorizedError extends HTTPException {
	constructor() {
		super(401, {
			message: "Unauthorized",
		});
	}
}

