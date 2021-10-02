const HtmlWebPackPlugin = require('html-webpack-plugin');
const path = require('path');
const webpack = require('webpack');

module.exports = {
  entry: {
    main: './index.js',
    'editor.worker': 'monaco-editor/esm/vs/editor/editor.worker.js',
    'yaml.worker': 'monaco-yaml/lib/esm/yaml.worker.js',
  },
  output: {
    globalObject: 'this',
    filename: '[name].bundle.js',
    path: path.resolve(__dirname, 'dist'),
  },
  optimization: {
    runtimeChunk: 'single',
  },
  module: {
    rules: [
      {
        test: /\.css$/,
        use: ['style-loader', 'css-loader'],
      },
      {
        test: /\.ttf$/,
        loader: 'file-loader',
      },
    ],
  },
  plugins: [
    new HtmlWebPackPlugin({
      template: './index.html',
    }),
    new webpack.optimize.LimitChunkCountPlugin({
      maxChunks: 1, // disable creating additional chunks
    }),
  ],
  node: {
    fs: 'empty',
    module: 'empty',
  },
};
