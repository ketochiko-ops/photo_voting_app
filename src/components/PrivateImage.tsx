import { useEffect, useState } from 'react';

interface PrivateImageProps {
  roomId: string;
  photoId: string;
  accessKey: string;
  alt: string;
}

/** Fetches private images with the access key; an img URL alone can never bypass authorization. */
export function PrivateImage({ roomId, photoId, accessKey, alt }: PrivateImageProps) {
  const [source, setSource] = useState<string>();
  useEffect(() => {
    let objectUrl: string | undefined;
    const controller = new AbortController();
    void fetch(
      `/api/rooms/${encodeURIComponent(roomId)}/photos/${encodeURIComponent(photoId)}/content`,
      {
        headers: { Authorization: `Bearer ${accessKey}` },
        signal: controller.signal,
      },
    )
      .then((response) => {
        if (!response.ok) throw new Error('Image unavailable');
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        setSource(objectUrl);
      })
      .catch(() => undefined);
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [accessKey, photoId, roomId]);
  return source ? (
    <img src={source} alt={alt} />
  ) : (
    <div className="image-placeholder" aria-label={`${alt} 読み込み中`} />
  );
}
