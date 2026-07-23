const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const PACKAGE_PATH = 'com/rahulautospares/store';

function withFullScreenOrderAlertManifest(config) {
  return withAndroidManifest(config, (config) => {
    const manifest = config.modResults;
    const app = manifest.manifest.application[0];

    if (!manifest.manifest['uses-permission']) {
      manifest.manifest['uses-permission'] = [];
    }
    const hasPermission = manifest.manifest['uses-permission'].some(
      (p) => p.$['android:name'] === 'android.permission.USE_FULL_SCREEN_INTENT'
    );
    if (!hasPermission) {
      manifest.manifest['uses-permission'].push({
        $: { 'android:name': 'android.permission.USE_FULL_SCREEN_INTENT' },
      });
    }

    if (!app.activity) app.activity = [];
    const exists = app.activity.some(
      (a) => a.$['android:name'] === '.OrderAlertActivity'
    );
    if (!exists) {
      app.activity.push({
        $: {
          'android:name': '.OrderAlertActivity',
          'android:showWhenLocked': 'true',
          'android:turnScreenOn': 'true',
          'android:excludeFromRecents': 'true',
          'android:launchMode': 'singleInstance',
          'android:theme': '@style/Theme.AppCompat.NoActionBar',
          'android:exported': 'false',
        },
      });
    }

    return config;
  });
}

function withFullScreenOrderAlertNativeFiles(config) {
  return withDangerousMod(config, [
    'android',
    async (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const srcDir = path.join(projectRoot, 'plugins', 'native-src');
      const destDir = path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        PACKAGE_PATH
      );

      if (!fs.existsSync(destDir)) {
        fs.mkdirSync(destDir, { recursive: true });
      }

      const files = ['OrderAlertActivity.kt', 'OrderAlertModule.kt', 'OrderAlertPackage.kt'];
      for (const file of files) {
        const src = path.join(srcDir, file);
        const dest = path.join(destDir, file);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, dest);
        }
      }

      const mainAppPath = path.join(destDir, 'MainApplication.kt');
      if (fs.existsSync(mainAppPath)) {
        let content = fs.readFileSync(mainAppPath, 'utf-8');
        if (!content.includes('OrderAlertPackage()')) {
          content = content.replace(
            /(PackageList\(this\)\.packages)/,
            '$1.apply { add(OrderAlertPackage()) }'
          );
          fs.writeFileSync(mainAppPath, content);
        }
      }

      return config;
    },
  ]);
}

module.exports = function withFullScreenOrderAlert(config) {
  config = withFullScreenOrderAlertManifest(config);
  config = withFullScreenOrderAlertNativeFiles(config);
  return config;
};
