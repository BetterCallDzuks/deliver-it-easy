module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      // Enables the `@/*` -> `src/*` import alias declared in tsconfig.json
      [
        'module-resolver',
        {
          root: ['.'],
          alias: {
            '@': './src',
          },
        },
      ],
      // react-native-reanimated's plugin MUST be listed last.
      'react-native-reanimated/plugin',
    ],
  };
};
