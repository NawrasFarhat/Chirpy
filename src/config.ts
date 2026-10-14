import type { MigrationConfig } from "drizzle-orm/migrator";
process.loadEnvFile();

function envOrThrow(key: string): string {
  const value = process.env[key];

  if (!value) {
    throw new Error(`Missing required environment variable: ${key}`);
  }

  return value;
}
export type APIConfig = {
  fileserverHits: number;
  port: number;
  platform: string;
};

export type DBConfig = {
  url: string;
  migrationConfig: MigrationConfig;
};

const migrationConfig: MigrationConfig = {
  migrationsFolder: "./src/db/migrations",
};

export const config = {
  api: {
    fileserverHits: 0,
    port: Number(envOrThrow("PORT")),
    platform: envOrThrow("PLATFORM"),
    polkaKey: process.env.POLKA_KEY!,
    
  },
  db: {
    url: envOrThrow("DB_URL"),
    migrationConfig,
  
  },
auth: {
  jwtSecret: process.env.JWT_SECRET!,
},
};