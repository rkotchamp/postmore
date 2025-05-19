#!/usr/bin/env node

/**
 * Custom Next.js starter script with explicit port
 */

const { spawn } = require("child_process");
const path = require("path");

// Set the port
const PORT = process.env.PORT || 3001;

console.log(`Starting Next.js on port ${PORT}...`);

// Set environment variables
process.env.PORT = PORT.toString();

// Start Next.js
const nextStart = spawn("npx", ["next", "start", "-p", PORT.toString()], {
  stdio: "inherit",
  cwd: process.cwd(),
  env: process.env,
});

// Handle process exit
nextStart.on("exit", (code) => {
  process.exit(code);
});

// Handle signals
process.on("SIGINT", () => {
  nextStart.kill("SIGINT");
});

process.on("SIGTERM", () => {
  nextStart.kill("SIGTERM");
});
