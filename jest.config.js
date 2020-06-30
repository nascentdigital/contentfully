module.exports = {
    preset: "ts-jest",
    collectCoverage: true,
    collectCoverageFrom: [
        "src/**/*.ts"
    ],
    testEnvironment: "node",
    testPathIgnorePatterns: [
        "/node_modules/",
        "/legacy/"
    ],
    testSequencer: "./test/Sequencer.js",
    globals: {
        "ts-jest": {
            tsConfig: "./tsconfig.test.json"
        }
    }
};
