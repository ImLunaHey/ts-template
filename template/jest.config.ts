import { readFileSync } from 'fs';
import { pathsToModuleNameMapper } from 'ts-jest';
import type { JestConfigWithTsJest } from 'ts-jest';
import { stripComments } from 'jsonc-parser';

const tsconfigFile = readFileSync('./tsconfig.json');

const { compilerOptions } = JSON.parse(stripComments(tsconfigFile.toString())) as {
  compilerOptions: {
    baseUrl: string;
    paths: Record<string, string[]>;
  };
};

const jestConfig: JestConfigWithTsJest = {
  verbose: true,
  setupFilesAfterEnv: ['<rootDir>/jest.setup.ts'],
  roots: ['<rootDir>'],
  modulePaths: [compilerOptions.baseUrl],
  moduleNameMapper: pathsToModuleNameMapper(
    compilerOptions.paths,
  ),
  transform: {
    '^.+\\.(ts|tsx)?$': ['ts-jest', { useESM: true }],
  },
  collectCoverageFrom: ['src/**/*.ts'],
  coverageReporters: ['clover', 'json', 'json-summary', 'lcov', ['text', { skipFull: true }]],
};

export default jestConfig;
