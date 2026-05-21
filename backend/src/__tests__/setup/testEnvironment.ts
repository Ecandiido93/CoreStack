import NodeEnvironment from "jest-environment-node";
import * as dotenv from "dotenv";
import * as path from "path";
import type { EnvironmentContext, JestEnvironmentConfig } from "@jest/environment";

export default class TestEnvironment extends NodeEnvironment {
  constructor(config: JestEnvironmentConfig, context: EnvironmentContext) {
    // Seta DATABASE_URL ANTES de qualquer coisa — inclusive antes do super()
    dotenv.config({ path: path.resolve(process.cwd(), ".env.test"), override: true });
    if (process.env.DATABASE_URL_TEST) {
      process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
    }
    super(config, context);
  }
}
