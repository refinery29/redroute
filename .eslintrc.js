module.exports = {
  extends: ["r29"],

  plugins: ["jest"],

  rules: {
    "prefer-arrow-callback": "warn",

    "jest/no-disabled-tests": "error",
    "jest/no-focused-tests": "error",
    "jest/valid-expect": "warn",

    "new-cap": 0,
    "no-undef": 0,
    "no-bitwise": 0
  },

  env: {
    "jest/globals": true
  }
};
