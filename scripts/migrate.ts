import { promises as fs } from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Migrator, FileMigrationProvider } from 'kysely';
import { createDb } from '../src/infrastructure/db/create-db.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

if (!process.env.DATABASE_URL) {
	console.error('DATABASE_URL is required');
	process.exit(1);
}

const db = createDb(process.env.DATABASE_URL);

const migrator = new Migrator({
	db,
	provider: new FileMigrationProvider({
		fs,
		path,
		migrationFolder: path.join(__dirname, '../migrations'),
	}),
});

const { error, results } = await migrator.migrateToLatest();

results?.forEach((result) => {
	if (result.status === 'Success') {
		console.log(`✓ ${result.migrationName}`);
	} else if (result.status === 'Error') {
		console.error(`✗ ${result.migrationName}`);
	}
});

if (error) {
	console.error('Migration failed:', error);
	await db.destroy();
	process.exit(1);
}

if (!results?.length) {
	console.log('No pending migrations');
}

await db.destroy();
