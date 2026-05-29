// capacitor.js — Native device feature utilities
// Wraps Capacitor plugins with web fallbacks so app works on both web and native

// Detect if running inside Capacitor (native app)
export const isNative = () =>
  typeof window !== 'undefined' &&
  window.Capacitor !== undefined &&
  window.Capacitor.isNativePlatform();

export const isAndroid = () =>
  isNative() && window.Capacitor.getPlatform() === 'android';

export const isIOS = () =>
  isNative() && window.Capacitor.getPlatform() === 'ios';

// ── CAMERA ─────────────────────────────────────────────────────────────────
// Takes a photo from camera or picks from gallery
// Returns: { base64: string, mimeType: string } or null
export const takePhoto = async (source = 'CAMERA') => {
  if (!isNative()) {
    // Web fallback — use file input
    return new Promise((resolve) => {
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = 'image/*';
      if (source === 'CAMERA') input.capture = 'environment';
      input.onchange = (e) => {
        const file = e.target.files?.[0];
        if (!file) return resolve(null);
        const reader = new FileReader();
        reader.onload = () => resolve({
          base64: reader.result.split(',')[1],
          mimeType: file.type,
          dataUrl: reader.result,
        });
        reader.readAsDataURL(file);
      };
      input.click();
    });
  }

  try {
    const { Camera } = await import('@capacitor/camera');
    const { CameraResultType, CameraSource } = await import('@capacitor/camera');
    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.Base64,
      source: source === 'GALLERY' ? CameraSource.Photos : CameraSource.Camera,
    });
    return {
      base64: photo.base64String,
      mimeType: `image/${photo.format}`,
      dataUrl: `data:image/${photo.format};base64,${photo.base64String}`,
    };
  } catch (e) {
    if (e.message !== 'User cancelled photos app') {
      console.error('[Camera] Error:', e);
    }
    return null;
  }
};

// ── SHARE ──────────────────────────────────────────────────────────────────
// Share invoice link or PDF via native share sheet
export const shareInvoice = async ({ title, text, url, base64Pdf, filename }) => {
  if (!isNative()) {
    // Web fallback — use navigator.share or copy to clipboard
    if (navigator.share) {
      return navigator.share({ title, text, url });
    }
    if (url) {
      await navigator.clipboard.writeText(url);
      alert('Link copied to clipboard!');
    }
    return;
  }

  try {
    const { Share } = await import('@capacitor/share');
    if (base64Pdf && filename) {
      // Save to temp file then share
      const { Filesystem, Directory } = await import('@capacitor/filesystem');
      await Filesystem.writeFile({
        path: filename,
        data: base64Pdf,
        directory: Directory.Cache,
      });
      const { uri } = await Filesystem.getUri({ path: filename, directory: Directory.Cache });
      await Share.share({ title, text, url: uri, dialogTitle: 'Share Invoice' });
    } else {
      await Share.share({ title, text, url, dialogTitle: 'Share Invoice' });
    }
  } catch (e) {
    if (e.message !== 'Share cancelled') console.error('[Share] Error:', e);
  }
};

// ── NETWORK ────────────────────────────────────────────────────────────────
// Listen for network status changes (online/offline)
export const initNetworkListener = async (onStatusChange) => {
  if (!isNative()) {
    window.addEventListener('online', () => onStatusChange(true));
    window.addEventListener('offline', () => onStatusChange(false));
    return;
  }
  try {
    const { Network } = await import('@capacitor/network');
    const status = await Network.getStatus();
    onStatusChange(status.connected);
    Network.addListener('networkStatusChange', (s) => onStatusChange(s.connected));
  } catch (e) {
    console.error('[Network] Error:', e);
  }
};

// ── HAPTICS ────────────────────────────────────────────────────────────────
// Tactile feedback for button presses
export const haptic = async (style = 'light') => {
  if (!isNative()) return;
  try {
    const { Haptics, ImpactStyle } = await import('@capacitor/haptics');
    const map = { light: ImpactStyle.Light, medium: ImpactStyle.Medium, heavy: ImpactStyle.Heavy };
    await Haptics.impact({ style: map[style] || ImpactStyle.Light });
  } catch {}
};

export const hapticSuccess = async () => {
  if (!isNative()) return;
  try {
    const { Haptics, NotificationType } = await import('@capacitor/haptics');
    await Haptics.notification({ type: NotificationType.Success });
  } catch {}
};

// ── PUSH NOTIFICATIONS ─────────────────────────────────────────────────────
// Request permission and get FCM token for push notifications
export const initPushNotifications = async (onNotification) => {
  if (!isNative()) return null;
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications');
    const result = await PushNotifications.requestPermissions();
    if (result.receive !== 'granted') return null;

    await PushNotifications.register();

    PushNotifications.addListener('registration', (token) => {
      console.log('[Push] FCM Token:', token.value);
      // Save token to Supabase for this driver/user
      onNotification?.({ type: 'registered', token: token.value });
    });

    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      onNotification?.({ type: 'received', notification });
    });

    PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
      onNotification?.({ type: 'action', action });
    });

  } catch (e) {
    console.error('[Push] Error:', e);
    return null;
  }
};

// ── STATUS BAR ─────────────────────────────────────────────────────────────
export const setStatusBarDark = async () => {
  if (!isNative()) return;
  try {
    const { StatusBar, Style } = await import('@capacitor/status-bar');
    await StatusBar.setStyle({ style: Style.Dark });
    if (isAndroid()) await StatusBar.setBackgroundColor({ color: '#07111e' });
  } catch {}
};

// ── KEYBOARD ───────────────────────────────────────────────────────────────
export const hideKeyboard = async () => {
  if (!isNative()) return;
  try {
    const { Keyboard } = await import('@capacitor/keyboard');
    await Keyboard.hide();
  } catch {}
};

// ── FILESYSTEM ─────────────────────────────────────────────────────────────
// Save PDF to device Downloads folder
export const savePDFToDevice = async (base64, filename) => {
  if (!isNative()) return false;
  try {
    const { Filesystem, Directory } = await import('@capacitor/filesystem');
    await Filesystem.writeFile({
      path: `Download/${filename}`,
      data: base64,
      directory: Directory.ExternalStorage,
      recursive: true,
    });
    return true;
  } catch (e) {
    console.error('[Filesystem] Error:', e);
    return false;
  }
};
