import type { ForgeConfig } from '@electron-forge/shared-types';
import { MakerSquirrel } from '@electron-forge/maker-squirrel';
import { MakerZIP } from '@electron-forge/maker-zip';
import { VitePlugin } from '@electron-forge/plugin-vite';
import * as path from 'path';

const config: ForgeConfig = {
  packagerConfig: {
    asar: {
      unpack: "**/assets/*"
    },
    icon: path.resolve(__dirname, 'assets/iconPizza'),
    extraResource: [
      path.resolve(__dirname, 'assets')
    ],
  },
  makers: [
    new MakerSquirrel({
      name: 'PIZZA-Mobile',
      setupIcon: path.resolve(__dirname, 'assets/iconPizza.ico'),
    }),
    new MakerZIP({}, ['darwin']),
  ],
  plugins: [
    new VitePlugin({
      build: [
        {
          entry: 'src/main.ts',
          config: 'vite.main.config.mjs',
        },
        {
          entry: 'src/preload.ts',
          config: 'vite.preload.config.mjs',
        },
      ],
      renderer: [
        {
          name: 'main_window',
          config: 'vite.renderer.config.mjs',
        },
      ],
    }),
  ],
};

export default config;