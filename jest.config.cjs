/** @type {import('jest').Config} */
module.exports = {
  preset: "jest-expo",

  setupFiles: ["<rootDir>/jest.setup.ts"],

  clearMocks: true,

  testMatch: ["**/?(*.)+(spec|test).[jt]s?(x)"],

  collectCoverageFrom: [
    "src/**/*.{ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.test.{ts,tsx}",
    "!src/**/*.spec.{ts,tsx}",
  ],

  coverageDirectory: "coverage",
};
