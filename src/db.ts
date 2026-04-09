import { neon } from '@neondatabase/serverless';

export const sql = (...args: Parameters<ReturnType<typeof neon>>) => {
	if (!process.env.DATABASE_URL) {
		throw new Error('DATABASE_URL environment variable is required');
	}
	return neon(process.env.DATABASE_URL)(...args);
};
