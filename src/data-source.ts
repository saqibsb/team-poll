// src/data-source.ts

import "reflect-metadata";
import { DataSource } from "typeorm";
import { config } from "./config";
import { Poll } from "./entities/Poll";
import { PollOption } from "./entities/PollOption";
import { Vote } from "./entities/Vote";

export const AppDataSource = new DataSource({
  type: "postgres",
  host: config.db.host,
  port: config.db.port,
  username: config.db.username,
  password: config.db.password,
  database: config.db.database,
  synchronize: config.isDevelopment, // Auto-create database tables in development
  logging: config.isDevelopment,
  entities: [Poll, PollOption, Vote],
  migrations: [__dirname + "/migrations/**/*.{js,ts}"],
  subscribers: [__dirname + "/subscribers/**/*.{js,ts}"]
});

// Initialize database connection
export const initializeDatabase = async () => {
  try {
    await AppDataSource.initialize();
    console.log("Data Source has been initialized!");
    return AppDataSource;
  } catch (err) {
    console.error("Error during Data Source initialization:", err);
    throw err;
  }
};