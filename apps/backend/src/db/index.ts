import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import type { AppBindings } from "types/type";
import * as schema from "./schema";

export const createDatabaseClient = (
	env: AppBindings,
) => {
	const connectionString =
		env.DATABASE_URL;

	if (!connectionString) {
		throw new Error(
			"DATABASE_URL is required",
		);
	}

	const client = new Pool({
		connectionString,
		max: 1,
		connectionTimeoutMillis: 5_000,
	});

	return drizzle({ client, schema });
};

export type DatabaseClient = ReturnType<
	typeof createDatabaseClient
>;
