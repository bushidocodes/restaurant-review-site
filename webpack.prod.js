const { merge } = require("webpack-merge");
const Dotenv = require("dotenv-webpack");
const common = require("./webpack.common.js");
const { InjectManifest } = require("workbox-webpack-plugin");

const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { WebpackManifestPlugin } = require("webpack-manifest-plugin");
const CssMinimizerPlugin = require("css-minimizer-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");
const MiniCSSExtractPlugin = require("mini-css-extract-plugin");

module.exports = merge(common, {
  mode: "production",
  optimization: {
    minimizer: [
      "...",
      new CssMinimizerPlugin()
    ]
  },
  output: {
    path: path.resolve(__dirname, "dist"),
    publicPath: "/",
    filename: "[name].js",
    clean: true
  },
  plugins: [
    new Dotenv({ systemvars: true }),
    new CopyWebpackPlugin({
      patterns: [
        { from: "./src/manifest.json" },
        { from: "./src/img/icons", to: "img/icons" },
        { from: "./src/img/icons/icon-96x96.png", to: "favicon.ico", toType: "file" }
      ]
    }),
    new HtmlWebpackPlugin({
      chunks: ["main"],
      filename: "index.html",
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      },
      template: "./src/index.html"
    }),
    new HtmlWebpackPlugin({
      inject: true,
      chunks: ["restaurantInfo"],
      filename: "restaurant.html",
      minify: {
        removeComments: true,
        collapseWhitespace: true,
        removeRedundantAttributes: true,
        useShortDoctype: true,
        removeEmptyAttributes: true,
        removeStyleLinkTypeAttributes: true,
        keepClosingSlash: true,
        minifyJS: true,
        minifyCSS: true,
        minifyURLs: true
      },
      template: "./src/restaurant.html"
    }),
    new WebpackManifestPlugin({
      fileName: "asset-manifest.json"
    }),
    new MiniCSSExtractPlugin({
      filename: "[name].css"
    }),
    new InjectManifest({
      include: [/\.html$/, /\.css$/, /\.js$/],
      swSrc: "./src/sw.base.mjs",
      swDest: "sw.js"
    })
  ],
  module: {
    rules: [
      {
        test: /\.css$/,
        use: [MiniCSSExtractPlugin.loader, "css-loader"]
      },
      {
        test: /\.(jpg|png)$/i,
        use: [
          {
            loader: "responsive-loader",
            options: {
              adapter: require("responsive-loader/jimp"),
              sizes: [300, 600]
            }
          }
        ]
      }
    ]
  }
});
