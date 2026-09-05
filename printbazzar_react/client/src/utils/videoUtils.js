/**
 * Robust Video & YouTube Embed Helper Utilities
 * 
 * Ensures YouTube-hosted product videos play INLINE on the website
 * without redirecting or opening the external YouTube app on mobile.
 */

/**
 * Extracts the 11-character YouTube video ID from various URL formats:
 * - https://www.youtube.com/watch?v=ID
 * - https://youtu.be/ID
 * - https://www.youtube.com/shorts/ID
 * - https://www.youtube.com/embed/ID
 * - https://www.youtube.com/live/ID
 * - https://m.youtube.com/watch?v=ID
 * - Raw 11-char ID
 */
export function extractYouTubeId(url) {
  if (!url || typeof url !== 'string') return null;
  const trimmed = url.trim();

  // If already an 11-character video ID
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    return trimmed;
  }

  // Regex covering standard watch, youtu.be, shorts, embed, live, mobile
  const regExp = /(?:https?:\/\/)?(?:www\.|m\.)?(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|v\/|shorts\/|live\/)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = trimmed.match(regExp);
  if (match && match[1]) {
    return match[1];
  }

  return null;
}

/**
 * Generates an in-page, privacy-enhanced responsive YouTube embed URL.
 * 
 * Features:
 * - youtube-nocookie.com domain (higher privacy & zero tracking cookies)
 * - playsinline=1 (critical for iOS/Android in-page playback, avoids opening YouTube app)
 * - rel=0 (prevents unrelated competitor video recommendations upon completion)
 * - modestbranding=1 (streamlined, uncluttered controls)
 */
export function getYouTubeEmbedUrl(url, { autoplay = false, mute = false } = {}) {
  const videoId = extractYouTubeId(url);
  if (!videoId) {
    // If it's already an embed URL with no ID matched
    if (typeof url === 'string' && url.includes('/embed/')) {
      const glue = url.includes('?') ? '&' : '?';
      return `${url}${glue}playsinline=1&rel=0&modestbranding=1`;
    }
    return null;
  }

  const params = new URLSearchParams({
    rel: '0',
    modestbranding: '1',
    playsinline: '1',
    enablejsapi: '1',
  });

  if (autoplay) {
    params.set('autoplay', '1');
  }
  if (mute) {
    params.set('mute', '1');
  }

  return `https://www.youtube-nocookie.com/embed/${videoId}?${params.toString()}`;
}

/**
 * High-definition or standard video thumbnail image from YouTube
 */
export function getYouTubeThumbnailUrl(url, quality = 'hqdefault') {
  const videoId = extractYouTubeId(url);
  if (!videoId) return null;
  return `https://img.youtube.com/vi/${videoId}/${quality}.jpg`;
}

/**
 * Checks if a given URL is a direct video file (HTML5 video)
 */
export function isDirectVideoFile(url) {
  if (!url || typeof url !== 'string') return false;
  const lower = url.trim().toLowerCase();
  return (
    lower.endsWith('.mp4') ||
    lower.endsWith('.webm') ||
    lower.endsWith('.mov') ||
    lower.endsWith('.m4v') ||
    lower.startsWith('/uploads/')
  );
}

/**
 * Checks if a given input has any valid video source (YouTube or file)
 */
export function isValidVideoUrl(url) {
  if (!url || typeof url !== 'string') return false;
  return !!extractYouTubeId(url) || isDirectVideoFile(url);
}
