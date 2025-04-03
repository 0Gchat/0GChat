const webpack = require('webpack');

module.exports = {
    webpack: {
        configure: (config) => {
            // 处理 node: 前缀的模块
            config.plugins.push(
                new webpack.NormalModuleReplacementPlugin(
                    /^node:/,
                    (resource) => {
                        resource.request = resource.request.replace(/^node:/, '');
                    }
                )
            );

            // 配置 fallback
            config.resolve.fallback = {
                ...config.resolve.fallback,
                "crypto": require.resolve("crypto-browserify"),
                "stream": require.resolve("stream-browserify"),
                "path": require.resolve("path-browserify"),
                "os": require.resolve("os-browserify"),
                "assert": require.resolve("assert"),
                "fs": false,
                "child_process": false,
                "http": require.resolve("stream-http"),
                "https": require.resolve("https-browserify"),
                "zlib": require.resolve("browserify-zlib")
            };

            // 全局变量 polyfill
            config.plugins.push(
                new webpack.ProvidePlugin({
                    process: 'process/browser',
                    Buffer: ['buffer', 'Buffer'],
                })
            );
            return config;
        }
    }
};