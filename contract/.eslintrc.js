module.exports = {
  env: {
    browser: false,
    es2021: true,
    mocha: true,
    node: true,
  },
  engines: {
    "node": ">=12.0.0"
  },
  extends: [
    "standard",
    "plugin:prettier/recommended",
    "plugin:node/recommended",
  ],
  parserOptions: {
    ecmaVersion: 12,
  },
  overrides: [
    {
      files: ["hardhat.config.js"],
      globals: { task: true },
    },
  ],
};
