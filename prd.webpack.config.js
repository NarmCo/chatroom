const os = require('os');
const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');
const nodeExternals = require('webpack-node-externals');
const WebpackShellPluginNext = require('webpack-shell-plugin-next');

process.env.NODE_ENV = 'production';

let rmDirKeyword;
let rmKeyword;
switch (os.type()) {
    case 'Windows_NT':
        rmDirKeyword = 'rmdir /s /q';
        rmKeyword = 'del';
        break;
    case 'Linux':
    case 'Darwin':
    default:
        rmDirKeyword = 'rm -r';
        rmKeyword = 'rm';
}

module.exports = {
    entry: path.join(__dirname, 'src', 'index.ts'),
    mode: process.env.NODE_ENV,
    watch: false,
    target: 'node',
    output: {
        path: path.join(__dirname, 'build-prd'),
        filename: 'index.js'
    },
    resolve: {
        extensions: ['.ts', '.js']
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: [
                    {
                        loader: 'ts-loader'
                    }
                ]
            }
        ]
    },
    stats: {errorDetails: true},
    plugins: [
        new WebpackShellPluginNext({
            onBuildStart: {
                scripts: [
                    `${rmDirKeyword} "${path.join(__dirname, 'build-prd')}"`
                ],
                blocking: true,
                parallel: false
            }
        }),
        new CopyPlugin({
            patterns: [path.join(__dirname, '.env')]
        })
    ],
    externals: [
        nodeExternals({
            allowlist: v => !['pg'].includes(v)
        })
    ]
};
