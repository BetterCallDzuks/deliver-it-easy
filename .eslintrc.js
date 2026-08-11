// ESLint config for Deliver It Easy.
// Uses the official Expo shared config (React, React Hooks, import rules).
module.exports = {
  root: true,
  extends: ['expo'],
  ignorePatterns: [
    'node_modules/',
    'dist/',
    '.expo/',
    'assets/',
    'babel.config.js',
  ],
};
