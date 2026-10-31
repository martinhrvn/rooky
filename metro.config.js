// Lets us `import Rook from '../assets/pieces/wr.svg'` and get a real component,
// so the Cburnett artwork keeps its own fills instead of being re-tinted by us.
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.transformer.babelTransformerPath = require.resolve('react-native-svg-transformer/expo');
config.resolver.assetExts = config.resolver.assetExts.filter((ext) => ext !== 'svg');
config.resolver.sourceExts = [...config.resolver.sourceExts, 'svg'];

// On web Metro matches zustand's `import` export condition and serves its ESM
// build, whose devtools middleware reads `import.meta.env`. Metro's web bundle
// is a classic script, so that is a syntax error and the page never boots.
// Native already gets the CommonJS build through the `react-native` condition;
// hand web the same one. Scoped to zustand alone — adding `react-native` to
// every web resolution would pull native-only entry points out of other
// packages.
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && (moduleName === 'zustand' || moduleName.startsWith('zustand/'))) {
    return context.resolveRequest(
      { ...context, unstable_conditionNames: ['react-native', 'require', 'default'] },
      moduleName,
      platform,
    );
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
