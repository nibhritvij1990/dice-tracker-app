App Name: Edit android/app/src/main/res/values/strings.xml → change <string name="app_name">...</string>.
App Icon: resources/icon.png (1024×1024, flat background, padding)
Splash Screen: resources/splash.png (large square, e.g. 2732×2732)

## Build and Sync APK:
cd /Users/nibhritvij/Downloads/dice-tracker-app
npm run build
npx capacitor-assets generate --android
npx cap sync android
cd android
export JAVA_HOME=$(/usr/libexec/java_home -v 21 2>/dev/null || echo /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home)
export PATH="$JAVA_HOME/bin:$PATH"
./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk

## Android APK/AAB build guide for `dice-tracker-app`

This document captures the exact steps, commands, and artifact paths to build, sign, and install the Android app from this Vite + React + Capacitor project.

### TL;DR (artifact paths)
- Debug APK: `android/app/build/outputs/apk/debug/app-debug.apk`
- Release APK (unsigned): `android/app/build/outputs/apk/release/app-release-unsigned.apk`
- Release AAB (for Play Console): `android/app/build/outputs/bundle/release/app-release.aab`

### Prerequisites
1) Java 21
```bash
brew install openjdk@21
export JAVA_HOME=$(/usr/libexec/java_home -v 21 2>/dev/null || echo /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home)
export PATH="$JAVA_HOME/bin:$PATH"
```

2) Android SDK (command-line tools)
```bash
brew install --cask android-commandlinetools
export ANDROID_HOME="$HOME/Library/Android/sdk"
export PATH="$ANDROID_HOME/platform-tools:$ANDROID_HOME/emulator:/opt/homebrew/bin:$PATH"
yes | sdkmanager --sdk_root="$ANDROID_HOME" --licenses
sdkmanager --sdk_root="$ANDROID_HOME" "platform-tools" "platforms;android-35" "build-tools;35.0.0"
```

### One-time project setup (already done)
- Router changed to HashRouter: `src/main.tsx`
- Relative asset base set: `vite.config.ts` with `base: ''`
- Capacitor initialized: `capacitor.config.ts` with `webDir: 'dist'`
- Android platform added: `npx cap add android`

### Build web assets
```bash
npm run build
```

### Sync Capacitor (web -> native)
```bash
npx cap sync android
```

### Build a debug APK
```bash
cd android
./gradlew assembleDebug
# APK:
# ../android/app/build/outputs/apk/debug/app-debug.apk
```

### Create release signing keystore (already created here)
- Keystore file: `android/release.keystore`
- Properties file: `android/keystore.properties`
```properties
storeFile=release.keystore
storePassword=changeit123
keyAlias=release
keyPassword=changeit123
```
- Sensitive files are ignored via `.gitignore`:
```
android/keystore.properties
android/release.keystore
```

To recreate a keystore:
```bash
cd android
keytool -genkeypair -v -storetype JKS -keystore release.keystore \
  -storepass changeit123 -keypass changeit123 -alias release \
  -keyalg RSA -keysize 2048 -validity 3650 \
  -dname 'CN=DiceTracker, OU=Dev, O=Dice, L=City, S=State, C=US'
```

### Gradle signing configuration (already added)
- File: `android/app/build.gradle`
- Loads `keystore.properties` and applies `signingConfigs.release` for release builds.

### Build release APK and AAB
```bash
cd android
./gradlew assembleRelease bundleRelease
# Outputs:
# APK (unsigned): ../android/app/build/outputs/apk/release/app-release-unsigned.apk
# AAB (signed for Play Console): ../android/app/build/outputs/bundle/release/app-release.aab
```

### Manually align and sign the release APK
If you want a signed APK (for direct install), use the Android build-tools `zipalign` and `apksigner`:
```bash
export ANDROID_HOME="$HOME/Library/Android/sdk"
ZIPALIGN="$ANDROID_HOME/build-tools/35.0.0/zipalign"
APKSIGNER="$ANDROID_HOME/build-tools/35.0.0/apksigner"

$ZIPALIGN -v -p 4 \
  android/app/build/outputs/apk/release/app-release-unsigned.apk \
  android/app/build/outputs/apk/release/app-release-aligned.apk

$APKSIGNER sign --ks android/release.keystore \
  --ks-pass pass:changeit123 --key-pass pass:changeit123 \
  --out android/app/build/outputs/apk/release/app-release-signed.apk \
  android/app/build/outputs/apk/release/app-release-aligned.apk

$APKSIGNER verify android/app/build/outputs/apk/release/app-release-signed.apk
```

### Install on device (USB)
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
# or, for the signed release APK
adb install -r android/app/build/outputs/apk/release/app-release-signed.apk
```

### Open in Android Studio
```bash
npx cap open android
```

### Notes / Troubleshooting
- Java 21 is required (the Android build chain here uses `source release: 21`).
- Ensure Android SDK Platform 35 and Build-Tools 35.0.0 are installed.
- Using `HashRouter` and `base: ''` ensures routes/assets work inside a WebView.
- For Play Store distribution, upload the AAB: `android/app/build/outputs/bundle/release/app-release.aab`.


