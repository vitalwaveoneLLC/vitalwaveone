# RouteFlow — Mobile App Setup Guide (Capacitor)
## Google Play + Apple App Store

---

## Prerequisites — Install on Your Computer

```bash
# Node.js 18+ required
node --version

# Install Android Studio (for Android)
# https://developer.android.com/studio

# Install Xcode 15+ (for iOS — Mac only)
# https://developer.apple.com/xcode/

# Install Java 17 (for Android)
# https://adoptium.net/
```

---

## Step 1 — Clone and Install

```bash
git clone https://github.com/YOUR_REPO/routeflow.git
cd routeflow
npm install
```

---

## Step 2 — Initialize Capacitor

```bash
# Initialize Capacitor (only run once)
npx cap init "RouteFlow" "com.vitalwaveone.routeflow" --web-dir dist

# Add Android platform
npx cap add android

# Add iOS platform (Mac only)
npx cap add ios
```

---

## Step 3 — Build and Sync

```bash
# Build the web app
npm run build

# Sync with native platforms
npx cap sync

# Or both at once:
npm run build:cap
```

---

## Step 4 — Android Setup

### Open in Android Studio
```bash
npm run cap:android
# OR
npx cap open android
```

### Configure android/app/src/main/AndroidManifest.xml
Add these permissions inside `<manifest>`:
```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.RECEIVE_BOOT_COMPLETED" />
<uses-permission android:name="android.permission.VIBRATE" />
```

Add inside `<application>`:
```xml
android:networkSecurityConfig="@xml/network_security_config"
```

### Copy network security config
Copy `android-network-security-config.xml` to:
`android/app/src/main/res/xml/network_security_config.xml`

### Set App Icon
Replace icons in: `android/app/src/main/res/`
- mipmap-mdpi: 48x48
- mipmap-hdpi: 72x72
- mipmap-xhdpi: 96x96
- mipmap-xxhdpi: 144x144
- mipmap-xxxhdpi: 192x192

Use https://www.appicon.co/ to generate all sizes from your 1024x1024 icon.

### Build Release APK
```bash
# In Android Studio: Build → Generate Signed Bundle / APK
# Choose APK → Create new keystore → Fill details → Build
```

Or from command line:
```bash
cd android
./gradlew assembleRelease
# APK will be at: android/app/build/outputs/apk/release/app-release.apk
```

---

## Step 5 — iOS Setup (Mac Required)

### Open in Xcode
```bash
npm run cap:ios
# OR
npx cap open ios
```

### Configure in Xcode:
1. Select `App` target
2. Set Bundle ID: `com.vitalwaveone.routeflow`
3. Set Version: `1.0.0`
4. Set Team: Your Apple Developer account
5. Enable capabilities: Push Notifications, Background Modes

### Add to Info.plist:
```xml
<key>NSCameraUsageDescription</key>
<string>RouteFlow uses camera to capture receipts and delivery photos</string>
<key>NSPhotoLibraryUsageDescription</key>
<string>RouteFlow accesses photos to attach to invoices</string>
<key>NSLocationWhenInUseUsageDescription</key>
<string>RouteFlow uses location for delivery route tracking</string>
```

### Build for App Store:
1. Product → Archive
2. Distribute App → App Store Connect
3. Upload

---

## Step 6 — Google Play Store

### Requirements:
- Google Play Developer Account ($25 one-time): https://play.google.com/console
- Signed APK or AAB (Android App Bundle — preferred)

### Create AAB (recommended over APK):
```bash
cd android
./gradlew bundleRelease
# AAB at: android/app/build/outputs/bundle/release/app-release.aab
```

### Play Console Steps:
1. Create new app → "RouteFlow"
2. Fill store listing (description, screenshots, icon)
3. Upload AAB to Internal Testing first
4. Test with your phone
5. Promote to Production

### Store Listing Info:
- **App Name**: RouteFlow
- **Short Description**: Wholesale distribution management for drivers and businesses
- **Category**: Business
- **Content Rating**: Everyone

---

## Step 7 — Apple App Store

### Requirements:
- Apple Developer Account ($99/year): https://developer.apple.com
- Mac with Xcode

### App Store Connect Steps:
1. Go to https://appstoreconnect.apple.com
2. New App → iOS → "RouteFlow"
3. Bundle ID: com.vitalwaveone.routeflow
4. Fill metadata (description, keywords, screenshots)
5. Upload build from Xcode
6. Submit for Review (usually 1-3 days)

---

## Step 8 — Two Apps Strategy

### App 1 — RouteFlow Admin
- For: You and managers only
- Distribution: Internal (Google Play Internal Testing or TestFlight)
- No public listing needed

### App 2 — RouteFlow Driver
- For: Your drivers
- URL: `routeflow-jade.vercel.app/order`
- Distribution: Google Play + App Store (public or invite-only)

To build the Driver app, change in capacitor.config.ts:
```ts
server: {
  url: 'https://routeflow-jade.vercel.app/order',
}
```

---

## Development Workflow

```bash
# 1. Make code changes
# 2. Build
npm run build

# 3. Sync to native
npx cap sync

# 4. Test on Android device/emulator
npx cap run android

# 5. Test on iOS device/simulator
npx cap run ios
```

### Live Reload During Development
Uncomment in capacitor.config.ts:
```ts
server: {
  url: 'http://YOUR_LOCAL_IP:5173',
  cleartext: true,
}
```
Then run `npm run dev` and `npx cap run android --livereload`

---

## Environment Variables

Create `.env` file (never commit this):
```
VITE_SUPABASE_URL=https://xxxx.supabase.co
VITE_SUPABASE_ANON_KEY=your_anon_key
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| White screen on device | Check console in Chrome DevTools → Remote devices |
| Camera not working | Add permissions to AndroidManifest.xml |
| HTTPS errors | Check network_security_config.xml |
| Build fails | Run `npx cap doctor` to diagnose |
| iOS signing issues | Check Apple Developer portal for certificates |

---

## App Store Assets Needed

### Screenshots (create in iPhone/Android simulator):
- Android: 1080x1920, 1080x2160
- iPhone: 1290x2796 (iPhone 15 Pro Max)
- iPad: 2048x2732

### Icons:
- 1024x1024 master icon (no rounded corners — stores add them)
- Use https://www.appicon.co/ to generate all sizes

### Privacy Policy:
- Required by both stores
- Create at https://privacypolicygenerator.info/
- Host on your domain or GitHub Pages

---

*Generated for RouteFlow v1.0.0 — VitalWaveOne LLC*
