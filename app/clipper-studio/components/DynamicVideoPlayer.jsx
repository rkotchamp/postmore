import { useEffect, useRef, useState } from 'react';
import { useTemplateStore } from '@/app/lib/store/templateStore';

// Google Fonts configuration (same as previous system)
const CAPTION_FONTS = {
  roboto: {
    name: "Roboto",
    family: "Roboto",
    weight: "700",
    cssClass: "font-roboto-caption"
  },
  montserrat: {
    name: "Montserrat",
    family: "Montserrat", 
    weight: "800",
    cssClass: "font-montserrat-caption"
  },
  poppins: {
    name: "Poppins",
    family: "Poppins",
    weight: "600",
    cssClass: "font-poppins-caption"
  },
  inter: {
    name: "Inter",
    family: "Inter",
    weight: "700",
    cssClass: "font-inter-caption"
  },
  notoSans: {
    name: "Noto Sans",
    family: "Noto Sans",
    weight: "700",
    cssClass: "font-noto-sans-caption"
  }
};

export default function DynamicVideoPlayer({ 
  videoUrl, 
  clipId, 
  className = "",
  autoplay = false,
  controls = true,
  muted = true 
}) {
  const videoRef = useRef(null);
  const trackRef = useRef(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [captionsLoaded, setCaptionsLoaded] = useState(false);

  // Get caption settings from template store
  const captionFont = useTemplateStore((state) => state.captionFont);
  const showCaptions = useTemplateStore((state) => state.showCaptions ?? true);

  // WebVTT track URL for this clip
  const captionUrl = `/api/clipper-studio/captions/${clipId}`;

  useEffect(() => {
    const video = videoRef.current;
    const track = trackRef.current;

    if (!video || !track) return;

    // Handle video loading
    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleError = (e) => {
      console.error('Video error:', e);
      setError('Failed to load video');
      setIsLoading(false);
    };

    // Handle caption track loading
    const handleTrackLoad = () => {
      console.log('📝 [VIDEO-PLAYER] Captions loaded successfully');
      setCaptionsLoaded(true);
      
      // Set track mode based on showCaptions state
      track.mode = showCaptions ? 'showing' : 'hidden';
    };

    const handleTrackError = (e) => {
      console.warn('⚠️ [VIDEO-PLAYER] Failed to load captions:', e);
      setCaptionsLoaded(false);
      // Don't set error state - video should still work without captions
    };

    // Add event listeners
    video.addEventListener('loadstart', handleLoadStart);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('error', handleError);
    track.addEventListener('load', handleTrackLoad);
    track.addEventListener('error', handleTrackError);

    return () => {
      video.removeEventListener('loadstart', handleLoadStart);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('error', handleError);
      track.removeEventListener('load', handleTrackLoad);
      track.removeEventListener('error', handleTrackError);
    };
  }, [clipId, showCaptions]);

  // Update caption visibility when showCaptions changes
  useEffect(() => {
    const track = trackRef.current;
    if (track && captionsLoaded) {
      track.mode = showCaptions ? 'showing' : 'hidden';
    }
  }, [showCaptions, captionsLoaded]);

  // Apply dynamic font styling to captions
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Remove previous font classes
    Object.values(CAPTION_FONTS).forEach(font => {
      video.classList.remove(font.cssClass);
    });

    // Add current font class
    const currentFont = CAPTION_FONTS[captionFont] || CAPTION_FONTS.roboto;
    video.classList.add(currentFont.cssClass);

  }, [captionFont]);

  if (error) {
    return (
      <div className={`bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center ${className}`}>
        <div className="text-center p-4">
          <div className="text-red-500 mb-2">⚠️</div>
          <div className="text-sm text-gray-600 dark:text-gray-400">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className={`relative ${className}`}>
      {isLoading && (
        <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 rounded-lg flex items-center justify-center z-10">
          <div className="flex flex-col items-center">
            <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin mb-2"></div>
            <div className="text-xs text-gray-500">Loading video...</div>
          </div>
        </div>
      )}
      
      <video
        ref={videoRef}
        className="w-full h-full rounded-lg"
        autoPlay={autoplay}
        controls={controls}
        muted={muted}
        playsInline
        preload="metadata"
      >
        <source src={videoUrl} type="video/mp4" />
        
        {/* WebVTT caption track */}
        <track
          ref={trackRef}
          kind="captions"
          src={captionUrl}
          srcLang="en"
          label="English Captions"
          default
        />
        
        Your browser does not support the video tag.
      </video>

      {/* Caption status indicator (dev/debug) */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 text-xs bg-black/70 text-white px-2 py-1 rounded">
          {captionsLoaded ? '📝 Captions' : '⚠️ No Captions'}
        </div>
      )}
    </div>
  );
}