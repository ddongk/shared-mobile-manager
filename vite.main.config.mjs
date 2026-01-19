import { defineConfig } from 'vite';
import dotenv from 'dotenv';
import { viteStaticCopy } from 'vite-plugin-static-copy'; // ⭐ 추가

dotenv.config();

export default defineConfig({
    define: {
        'process.env.GH_TOKEN': JSON.stringify(process.env.GH_TOKEN),
    },
    plugins: [
        viteStaticCopy({
            targets: [
                {
                    src: 'assets/*',
                    dest: 'assets'
                }
            ]
        })
    ],
    build: {
        rollupOptions: {
            external: [
                'electron',
                'path',
                'fs',
                'os',
                'child_process',
                'url',
                'module'
            ],
        },
    },
    resolve: {
        mainFields: ['module', 'jsnext:main', 'jsnext'],
    },
});