const path = require('path');

module.exports = {
    entry: {
        snaxjs_api: './src/snaxjs-api.ts',
        snaxjs_jsonrpc: './src/snaxjs-jsonrpc.ts',
        snaxjs_rpcerror: './src/snaxjs-rpcerror.ts',
        snaxjs_jssig: './src/snaxjs-jssig.ts',
    },
    devtool: 'inline-source-map',
    mode: 'development',
    output: {
        library: 'snaxjs',
        pathinfo: true,
    },
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: {
                    loader: 'ts-loader',
                    options: {
                        configFile: 'tsconfig.json'
                    }
                },
                exclude: /node_modules/,
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    output: {
        filename: x => x.chunk.id.replace('_', '-') + '-debug.js',
        library: '[id]',
        path: path.resolve(__dirname, 'dist-web'),
    }
};
