const path = require('path')
const HtmlWebpackPlugin = require("html-webpack-plugin");
const webpack = require("webpack");

module.exports = {
    mode:"development",
    entry: {
        index:path.resolve(__dirname,"./src/index.js"),
        work:path.resolve(__dirname,"./src/lib/work.js"),
    },
    devtool:'inline-source-map',
    output: {
        publicPath: "/",
        path: path.resolve(__dirname, 'dist'),
        filename: '[name].bundle.js',
        libraryTarget: 'umd',
        library: 'library',
    },
    devServer: {
        contentBase: path.resolve(__dirname,"dist"), // 为哪个文件夹提供本地服务
        host: "localhost",
        inline: true, // 开启热更新
        port: 8080, // 默认8080端口号
        open: true, // 开启服务器后自动打开浏览器
        https:false,
    },
    module: {
        rules: [  
        {  
            test: /\.(tsx?|js)$/,
            loader: "babel-loader",
            options: {
                cacheDirectory: true,
            },
            exclude: /(node_modules)/,
        }
        ],
    },  
    plugins: [

        new HtmlWebpackPlugin({

            template: path.resolve(__dirname,"public/index.html")

        }),

        new webpack.HotModuleReplacementPlugin()
    ]
}