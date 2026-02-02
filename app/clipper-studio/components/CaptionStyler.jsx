import { useTemplateStore } from '@/app/lib/store/templateStore';
import { ChevronDown, Eye, EyeOff } from 'lucide-react';
import { useState } from 'react';

const CAPTION_FONTS = {
  roboto: {
    name: "Roboto",
    family: "Roboto",
    weight: "700",
    description: "Clean & Modern"
  },
  montserrat: {
    name: "Montserrat",
    family: "Montserrat", 
    weight: "800",
    description: "Professional & Bold"
  },
  poppins: {
    name: "Poppins",
    family: "Poppins",
    weight: "600", 
    description: "Friendly & Educational"
  },
  inter: {
    name: "Inter",
    family: "Inter",
    weight: "700",
    description: "Screen Optimized"
  },
  notoSans: {
    name: "Noto Sans",
    family: "Noto Sans",
    weight: "700",
    description: "Universal Support"
  }
};

export default function CaptionStyler() {
  const captionFont = useTemplateStore((state) => state.captionFont);
  const setCaptionFont = useTemplateStore((state) => state.setCaptionFont);
  const showCaptions = useTemplateStore((state) => state.showCaptions ?? true);
  const setShowCaptions = useTemplateStore((state) => state.setShowCaptions);
  
  const [isExpanded, setIsExpanded] = useState(false);

  const selectedFontConfig = CAPTION_FONTS[captionFont] || CAPTION_FONTS.roboto;

  const handleFontChange = (newFont) => {
    setCaptionFont(newFont);
    console.log(`🎨 [CAPTION-STYLER] Font changed to: ${newFont}`);
  };

  const toggleCaptions = () => {
    const newState = !showCaptions;
    setShowCaptions(newState);
    console.log(`👁️ [CAPTION-STYLER] Captions ${newState ? 'enabled' : 'disabled'}`);
  };

  return (
    <div className="space-y-3">
      <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
        Subtitle Controls
      </label>
      
      {/* Caption Visibility Toggle */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-foreground">Show Captions</span>
        <button
          onClick={toggleCaptions}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all duration-200 ${
            showCaptions 
              ? 'bg-primary text-primary-foreground hover:bg-primary/90' 
              : 'bg-muted text-muted-foreground hover:bg-muted/80'
          }`}
        >
          {showCaptions ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          {showCaptions ? 'Visible' : 'Hidden'}
        </button>
      </div>

      {/* Font Selector */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-foreground">Font Style</span>
          <span className="text-xs text-muted-foreground">Real-time</span>
        </div>
        
        <div className="relative">
          <select 
            value={captionFont}
            onChange={(e) => handleFontChange(e.target.value)}
            className="w-full appearance-none bg-gradient-to-r from-slate-50 to-slate-100 dark:from-slate-800 dark:to-slate-700 border-2 border-slate-200 dark:border-slate-600 rounded-lg px-4 py-2.5 text-sm font-medium text-slate-800 dark:text-slate-200 shadow-sm hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition-all duration-200 cursor-pointer"
            style={{
              fontFamily: selectedFontConfig.family,
              fontWeight: selectedFontConfig.weight
            }}
          >
            {Object.entries(CAPTION_FONTS).map(([key, font]) => (
              <option 
                key={key} 
                value={key}
                className="bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-200 py-2"
                style={{ 
                  fontFamily: font.family,
                  fontWeight: font.weight 
                }}
              >
                {font.name}
              </option>
            ))}
          </select>
          
          <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500 dark:text-slate-400 pointer-events-none transition-colors duration-200" />
        </div>

        {/* Font Preview */}
        <div className="bg-slate-100 dark:bg-slate-800 rounded-md p-3 border">
          <div className="text-xs text-muted-foreground mb-1">Preview:</div>
          <div 
            className="text-sm text-foreground font-bold"
            style={{
              fontFamily: selectedFontConfig.family,
              fontWeight: selectedFontConfig.weight
            }}
          >
            The quick brown fox jumps
          </div>
        </div>
      </div>

      {/* Advanced Options (Expandable) */}
      <div className="space-y-2">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
        >
          <span>Advanced Options</span>
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`} />
        </button>

        {isExpanded && (
          <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-700">
            {/* Font Weight Info */}
            <div className="text-xs text-muted-foreground">
              <div className="flex justify-between">
                <span>Weight:</span>
                <span className="font-medium">{selectedFontConfig.weight}</span>
              </div>
              <div className="flex justify-between">
                <span>Style:</span>
                <span className="font-medium">{selectedFontConfig.description}</span>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center gap-2 text-xs">
              <div className="w-2 h-2 rounded-full bg-green-500"></div>
              <span className="text-muted-foreground">
                Changes apply instantly
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-md p-3">
        <div className="text-xs text-blue-700 dark:text-blue-300">
          💡 <strong>Pro tip:</strong> Font changes are applied instantly without re-processing the video. 
          Toggle captions on/off to see the difference.
        </div>
      </div>
    </div>
  );
}