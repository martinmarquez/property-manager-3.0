import { useCallback } from 'react';
import { isNative } from '../lib/capacitor.js';

interface PhotoResult {
  dataUrl: string;
  format: string;
}

export function useNativeCamera() {
  const takePhoto = useCallback(async (): Promise<PhotoResult | null> => {
    if (!isNative()) return null;

    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Camera,
      width: 1920,
      height: 1080,
    });

    if (!photo.dataUrl) return null;
    return { dataUrl: photo.dataUrl, format: photo.format };
  }, []);

  const pickFromGallery = useCallback(async (): Promise<PhotoResult | null> => {
    if (!isNative()) return null;

    const { Camera, CameraResultType, CameraSource } = await import('@capacitor/camera');

    const photo = await Camera.getPhoto({
      quality: 85,
      allowEditing: false,
      resultType: CameraResultType.DataUrl,
      source: CameraSource.Photos,
    });

    if (!photo.dataUrl) return null;
    return { dataUrl: photo.dataUrl, format: photo.format };
  }, []);

  const pickMultiple = useCallback(async (limit = 10): Promise<PhotoResult[]> => {
    if (!isNative()) return [];

    const { Camera } = await import('@capacitor/camera');

    const result = await Camera.pickImages({ quality: 85, limit });
    return result.photos
      .filter((p): p is typeof p & { webPath: string } => !!p.webPath)
      .map(p => ({ dataUrl: p.webPath, format: p.format }));
  }, []);

  return { takePhoto, pickFromGallery, pickMultiple };
}
