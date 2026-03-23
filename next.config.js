/** @type {import('next').NextConfig} */

const webpack = require('webpack');
const withSerwist = require("@serwist/next").default({
  swSrc: "public/sw.js",
  swDest: "public/sw.js",
  disable: process.env.NODE_ENV === "development",
});
require('dotenv').config();

const nextConfig = {
  env: {
    URL: process.env.URL,
    TWITTER: process.env.TWITTER,
    DISCORD: process.env.DISCORD,
    RPC_URL: process.env.RPC_URL,
    ORACLE_URL: process.env.ORACLE_URL,
  },
  reactStrictMode: true,
  ...(process.env.NODE_ENV === 'production' && {
    typescript: {
      ignoreBuildErrors: true,
    },
    eslint: {
      ignoreDuringBuilds: true,
    },
  }),
  webpack: (config, options) => {
    config.ignoreWarnings = [/Failed to parse source map/];
    const fallback = config.resolve.fallback || {};
    Object.assign(fallback, {
      stream: require.resolve('stream-browserify'),
      fs: require.resolve('browserify-fs'),
    });
    config.resolve.fallback = fallback;
    config.plugins = (config.plugins || []).concat([
      new webpack.ProvidePlugin({
        process: 'process/browser',
        Buffer: ['buffer', 'Buffer'],
      }),
    ]);
    const experiments = config.experiments || {};
    Object.assign(experiments, {
      asyncWebAssembly: true,
      syncWebAssembly: true,
      topLevelAwait: true,
    });
    config.experiments = experiments;
    const alias = config.resolve.alias || {};
    Object.assign(alias, {
      react$: require.resolve('react'),
    });
    config.resolve.alias = alias;
    
    patchWasmModuleImport(config, options.isServer);

    config.module.rules.push({
      test: /\.wasm$/,
      include: /node_modules[\\/](@provablehq|@aleohq)/,
      type: 'asset/resource',
    });

    return config;
  },
};

function patchWasmModuleImport(config, isServer) {
  config.experiments = Object.assign(config.experiments || {}, {
      asyncWebAssembly: true,
  });

  config.optimization.moduleIds = 'named';

  config.module.rules.push({
      test: /\.wasm$/,
      type: 'webassembly/async',
  });

  // TODO: improve this function -> track https://github.com/vercel/next.js/issues/25852
  if (isServer) {
      config.output.webassemblyModuleFilename = './../static/wasm/[modulehash].wasm';
  } else {
      config.output.webassemblyModuleFilename = 'static/wasm/[modulehash].wasm';
  }
}

module.exports = withPWA(nextConfig);