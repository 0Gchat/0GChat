declare module 'node:crypto' {
    import crypto from 'crypto';
    export = crypto;
}

declare module 'crypto' {
    import crypto from 'crypto-browserify';
    export = crypto;
}

export {}; // 解决 isolatedModules 问题