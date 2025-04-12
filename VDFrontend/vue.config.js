const path = require('path');
const webpack = require('webpack');

module.exports = {
  lintOnSave: false, // 禁用 ESLint

  // 配置 Webpack
  configureWebpack: {
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'), // 设置 @ 指向 src 文件夹
      },
    },
    module: {
      rules: [
        {
          test: /\.frag$/, // 匹配 .frag 文件
          use: 'raw-loader', // 使用 raw-loader 处理
        },
        {
          test: /\.vert$/, // 匹配 .vert 文件
          use: 'raw-loader', // 使用 raw-loader 处理
        },
        {
          test: /\.js$/, // 匹配所有 JavaScript 文件
          exclude: /node_modules/,
          use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env'],
            },
          },
        },
      ],
    },
  },

  chainWebpack(config) {
    // set worker-loader
    config.module
      .rule('worker')
      .test(/\.worker\.js$/)
      .use('worker-loader')
      .loader('worker-loader')
      .end();

    // 解决：worker 热更新问题
    config.module
      .rule('js')
      .exclude
      .add(/\.worker\.js$/)
      .end();

    // 解决：“window is undefined”报错，这个是因为worker线程中不存在window对象，因此不能直接使用，要用this代替
    config.output.globalObject('this')
  },
  parallel: false,
};