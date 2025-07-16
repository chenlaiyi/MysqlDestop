const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CopyWebpackPlugin = require('copy-webpack-plugin');

const isProduction = process.env.NODE_ENV === 'production';

module.exports = [
  // 渲染进程配置
  {
    mode: isProduction ? 'production' : 'development',
    entry: './src/renderer/index.tsx',
    target: 'electron-renderer',
    devtool: isProduction ? false : 'source-map',
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
        {
          test: /\.(png|jpe?g|gif|svg)$/i,
          type: 'asset/resource',
          generator: {
            filename: 'assets/[name][ext]'
          }
        },
      ],
    },
    resolve: {
      extensions: ['.tsx', '.ts', '.js'],
    },
    optimization: {
      minimize: isProduction,
      splitChunks: isProduction ? {
        chunks: 'all',
        cacheGroups: {
          vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',
            chunks: 'all',
          },
        },
      } : false,
    },
    output: {
      filename: isProduction ? '[name].[contenthash].js' : 'bundle.js',
      path: path.resolve(__dirname, 'dist'),
      clean: false,
    },
    plugins: [
      new HtmlWebpackPlugin({
        template: './src/renderer/index.html',
        minify: isProduction,
      }),
      new CopyWebpackPlugin({
        patterns: [
          { from: 'assets', to: 'assets' }
        ]
      }),
    ],
  },
  // 主进程配置
  {
    mode: isProduction ? 'production' : 'development',
    entry: './src/main/main.ts',
    target: 'electron-main',
    devtool: isProduction ? false : 'source-map',
    output: {
      path: path.resolve(__dirname, 'dist/main'),
      filename: 'main.js',
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
    externals: {
      electron: 'commonjs2 electron',
    },
  },
  // 预加载脚本配置
  {
    mode: isProduction ? 'production' : 'development',
    entry: './src/main/preload.ts',
    target: 'electron-preload',
    devtool: isProduction ? false : 'source-map',
    output: {
      path: path.resolve(__dirname, 'dist/main'),
      filename: 'preload.js',
    },
    resolve: {
      extensions: ['.ts', '.js'],
    },
    module: {
      rules: [
        {
          test: /\.ts$/,
          use: 'ts-loader',
          exclude: /node_modules/,
        },
      ],
    },
  },
];
