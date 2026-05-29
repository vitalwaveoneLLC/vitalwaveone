/**
 * Camera Utilities - Safe Camera Access with Android Crash Fix
 * Prevents crash on Android when camera permissions are denied
 */

import { Camera, CameraResultType, CameraSource } from '@capacitor/camera';
import { Capacitor } from '@capacitor/core';

/**
 * Request camera permissions with proper error handling
 * Fixes: Android crash on permission denial
 */
export async function requestCameraPermission() {
  try {
    const platform = Capacitor.getPlatform();

    if (platform === 'android') {
      // Android-specific permission handling
      try {
        const permission = await Camera.requestPermissions({
          permissions: ['camera', 'photos'],
        });

        if (permission.camera === 'denied' || permission.photos === 'denied') {
          return {
            granted: false,
            error: 'Camera permissions denied by user',
            platform: 'android',
          };
        }

        return {
          granted: true,
          platform: 'android',
        };
      } catch (permissionError) {
        console.error('Android permission request failed:', permissionError);
        return {
          granted: false,
          error: 'Failed to request camera permissions on Android',
          details: permissionError.message,
          platform: 'android',
        };
      }
    } else if (platform === 'ios') {
      // iOS permission handling
      try {
        const permission = await Camera.requestPermissions({
          permissions: ['camera', 'photos'],
        });

        if (permission.camera === 'denied' || permission.photos === 'denied') {
          return {
            granted: false,
            error: 'Camera permissions denied by user',
            platform: 'ios',
          };
        }

        return {
          granted: true,
          platform: 'ios',
        };
      } catch (permissionError) {
        console.error('iOS permission request failed:', permissionError);
        return {
          granted: false,
          error: 'Failed to request camera permissions on iOS',
          details: permissionError.message,
          platform: 'ios',
        };
      }
    }

    // Web platform
    return {
      granted: true,
      platform: 'web',
    };
  } catch (error) {
    console.error('Unexpected error requesting camera permission:', error);
    return {
      granted: false,
      error: 'Unexpected error',
      details: error.message,
    };
  }
}

/**
 * Safe camera capture with Android crash prevention
 */
export async function capturePhoto() {
  try {
    // Check permissions first
    const permissionCheck = await requestCameraPermission();

    if (!permissionCheck.granted) {
      throw new Error(permissionCheck.error);
    }

    // Capture with error handling
    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      correctOrientation: true,
      webUseInput: true,
    });

    return {
      success: true,
      dataUrl: image.dataUrl,
      format: image.format,
    };
  } catch (error) {
    console.error('Camera capture failed:', error);

    // User cancelled - not an error
    if (error.message?.includes('User cancelled')) {
      return {
        success: false,
        cancelled: true,
        error: 'User cancelled camera',
      };
    }

    // Permission denied
    if (error.message?.includes('permission')) {
      return {
        success: false,
        permissionDenied: true,
        error: 'Camera permissions required. Please enable in settings.',
      };
    }

    // Generic error
    return {
      success: false,
      error: error.message || 'Failed to capture photo',
    };
  }
}

/**
 * Safe photo library access
 */
export async function pickPhotoFromLibrary() {
  try {
    const permissionCheck = await requestCameraPermission();

    if (!permissionCheck.granted) {
      throw new Error(permissionCheck.error);
    }

    const image = await Camera.getPhoto({
      quality: 90,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
      correctOrientation: true,
      webUseInput: true,
    });

    return {
      success: true,
      dataUrl: image.dataUrl,
      format: image.format,
    };
  } catch (error) {
    console.error('Photo library access failed:', error);

    if (error.message?.includes('User cancelled')) {
      return {
        success: false,
        cancelled: true,
        error: 'User cancelled selection',
      };
    }

    if (error.message?.includes('permission')) {
      return {
        success: false,
        permissionDenied: true,
        error: 'Photo library access required. Please enable in settings.',
      };
    }

    return {
      success: false,
      error: error.message || 'Failed to access photo library',
    };
  }
}

/**
 * Check current camera permissions status (Android & iOS)
 */
export async function checkCameraPermissionStatus() {
  try {
    const platform = Capacitor.getPlatform();

    if (platform === 'web') {
      return { camera: 'granted', photos: 'granted' };
    }

    const status = await Camera.checkPermissions();

    return {
      camera: status.camera,
      photos: status.photos,
      platform,
    };
  } catch (error) {
    console.error('Failed to check camera permissions:', error);
    return {
      camera: 'unknown',
      photos: 'unknown',
      error: error.message,
    };
  }
}
