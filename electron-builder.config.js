/** @type {import('electron-builder').Configuration} */
const config = {
  appId: 'com.strataflux.app',
  productName: 'StrataFlux',
  directories: {
    output: 'release',
    buildResources: 'assets',
  },
  files: [
    'dist/**/*',
    'assets/**/*',
    'package.json',
  ],
  mac: {
    icon: 'assets/icon.png',
    target: [{ target: 'dmg', arch: ['x64', 'arm64'] }],
    category: 'public.app-category.developer-tools',
  },
  win: {
    icon: 'assets/icon.png',
    target: [{ target: 'nsis', arch: ['x64'] }],
  },
  nsis: {
    oneClick: false,
    allowToChangeInstallationDirectory: true,
  },
};

module.exports = config;
