#!/usr/bin/env bash
set -euo pipefail

# Resolve repo root (this script lives in scripts/)
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "[1/6] Ensuring Java 21 is available..."
export JAVA_HOME="$({ /usr/libexec/java_home -v 21; } 2>/dev/null || echo /opt/homebrew/opt/openjdk@21/libexec/openjdk.jdk/Contents/Home)"
export PATH="$JAVA_HOME/bin:$PATH"
java -version || true

echo "[2/6] Building web assets (vite build)..."
npm run --silent build

echo "[3/6] Generating Android assets (icon/splash) if present..."
if npx --yes capacitor-assets --help >/dev/null 2>&1; then
  npx capacitor-assets generate --android || true
else
  echo "  capacitor-assets not installed; skipping asset generation"
fi

echo "[4/6] Syncing Capacitor -> Android project..."
npx cap sync android

echo "[5/6] Assembling debug APK with Gradle..."
cd android
./gradlew assembleDebug

APK_PATH="$ROOT_DIR/android/app/build/outputs/apk/debug/app-debug.apk"
echo "[6/6] Done. APK: $APK_PATH"

# Optional: install if adb and a device are available
if command -v adb >/dev/null 2>&1; then
  if adb get-state >/dev/null 2>&1; then
    echo "Installing to connected device (adb -r)..."
    adb install -r "$APK_PATH" || true
  else
    echo "adb found but no device connected; skipping install"
  fi
else
  echo "adb not found; skipping install"
fi


