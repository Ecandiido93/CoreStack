import type { Config } from "jest";

const config: Config = {
  preset: "ts-jest",
  testEnvironment: "./src/__tests__/setup/testEnvironment.ts",
  rootDir: ".",
  testMatch: ["**/src/__tests__/**/*.test.ts"],
  globalSetup: "./src/__tests__/setup/globalSetup.ts",
  globalTeardown: "./src/__tests__/setup/globalTeardown.ts",
  setupFilesAfterEnv: ["./src/__tests__/setup/jestSetup.ts"],
  clearMocks: false,
  verbose: true,
  testTimeout: 30000,
  maxWorkers: 1,
};

export default config;
