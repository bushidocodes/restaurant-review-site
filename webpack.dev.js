const { merge } = require("webpack-merge");
const Dotenv = require("dotenv-webpack");
const common = require("./webpack.common.js");
const { WebpackManifestPlugin } = require("webpack-manifest-plugin");
const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin");
const { InjectManifest } = require("workbox-webpack-plugin");
const CopyWebpackPlugin = require("copy-webpack-plugin");

module.exports = merge(common, {
  mode: "development",
  entry: {
    main: path.resolve(__dirname, "src", "js", "main.js"),
    restaurantInfo: "./src/js/restaurant_info.js"
  },
  devServer: {
    static: "./dist"
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
      template: "./src/index.html",
      inject: true,
      chunks: ["main"],
      filename: "index.html"
    }),
    new HtmlWebpackPlugin({
      template: "./src/restaurant.html",
      inject: true,
      chunks: ["restaurantInfo"],
      filename: "restaurant.html"
    }),
    new WebpackManifestPlugin(),
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
        use: [
          { loader: "style-loader" },
          {
            loader: "css-loader",
            options: {
              sourceMap: true
            }
          }
        ]
      },
      {
        test: /\.(jpg|png)$/i,
        loader: "responsive-loader",
        options: {
          adapter: require("responsive-loader/jimp")
        }
      }
    ]
  }
});
