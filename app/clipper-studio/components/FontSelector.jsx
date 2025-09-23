import { useState, useEffect } from 'react';
import { Type, ChevronDown, AlignCenter, Move, Maximize2 } from 'lucide-react';
import { useTemplateStore } from '@/app/lib/store/templateStore';

// Font options that match our backend font system
const FONT_OPTIONS = [
  {
    key: 'bebasNeue',
    name: 'Bebas Neue',
    description: 'Bold & Condensed',
    style: { fontFamily: 'Impact, Arial Black, sans-serif', fontWeight: 'bold' }
  },
  {
    key: 'montserrat',
    name: 'Montserrat',
    description: 'Clean & Modern',
    style: { fontFamily: 'Arial, sans-serif', fontWeight: 'bold' }
  },
  {
    key: 'anton',
    name: 'Anton',
    description: 'Heavy & Impactful',
    style: { fontFamily: 'Impact, Arial Black, sans-serif', fontWeight: 'bold' }
  },
  {
    key: 'oswald',
    name: 'Oswald',
    description: 'Tall & Narrow',
    style: { fontFamily: 'Arial, sans-serif', fontWeight: '600' }
  },
  {
    key: 'roboto',
    name: 'Roboto',
    description: 'Standard & Reliable',
    style: { fontFamily: 'Arial, sans-serif', fontWeight: '700' }
  }
];

// Size options
const SIZE_OPTIONS = [
  { key: 'small', name: 'Small', description: '1.2rem' },
  { key: 'medium', name: 'Medium', description: '1.5rem' },
  { key: 'large', name: 'Large', description: '1.8rem' }
];

// Position options
const POSITION_OPTIONS = [
  { key: 'top', name: 'Top', description: 'Top of video' },
  { key: 'center', name: 'Center', description: 'Center of video' },
  { key: 'bottom', name: 'Bottom', description: 'Bottom of video' }
];

export default function FontSelector() {
  const [fontOpen, setFontOpen] = useState(false);
  const [sizeOpen, setSizeOpen] = useState(false);
  const [positionOpen, setPositionOpen] = useState(false);
  const [selectedFont, setSelectedFont] = useState('roboto');
  const [selectedSize, setSelectedSize] = useState('medium');
  const [selectedPosition, setSelectedPosition] = useState('bottom');

  // Get caption settings from store
  const captionFont = useTemplateStore((state) => state.captionFont) || 'roboto';
  const captionSize = useTemplateStore((state) => state.captionSize) || 'medium';
  const captionPosition = useTemplateStore((state) => state.captionPosition) || 'bottom';
  const setCaptionFont = useTemplateStore((state) => state.setCaptionFont);
  const setCaptionSize = useTemplateStore((state) => state.setCaptionSize);
  const setCaptionPosition = useTemplateStore((state) => state.setCaptionPosition);

  // Sync with existing caption settings
  useEffect(() => {
    if (captionFont && captionFont !== selectedFont) {
      setSelectedFont(captionFont);
    }
    if (captionSize && captionSize !== selectedSize) {
      setSelectedSize(captionSize);
    }
    if (captionPosition && captionPosition !== selectedPosition) {
      setSelectedPosition(captionPosition);
    }
  }, [captionFont, captionSize, captionPosition, selectedFont, selectedSize, selectedPosition]);

  const handleFontChange = (fontKey) => {
    setSelectedFont(fontKey);
    if (setCaptionFont) {
      setCaptionFont(fontKey);
    }
    setFontOpen(false);
    console.log(`🎨 [FONT-SELECTOR] Font changed to: ${fontKey}`);
  };

  const handleSizeChange = (sizeKey) => {
    setSelectedSize(sizeKey);
    if (setCaptionSize) {
      setCaptionSize(sizeKey);
    }
    setSizeOpen(false);
    console.log(`📏 [FONT-SELECTOR] Size changed to: ${sizeKey}`);
  };

  const handlePositionChange = (positionKey) => {
    console.log(`📍 [FONT-SELECTOR] Position change started:`, { positionKey, setCaptionPosition: !!setCaptionPosition });
    setSelectedPosition(positionKey);
    if (setCaptionPosition) {
      setCaptionPosition(positionKey);
      console.log(`📍 [FONT-SELECTOR] Called setCaptionPosition with: ${positionKey}`);
    } else {
      console.error(`📍 [FONT-SELECTOR] setCaptionPosition is undefined!`);
    }
    setPositionOpen(false);
    console.log(`📍 [FONT-SELECTOR] Position changed to: ${positionKey}`);
  };

  const selectedFontConfig = FONT_OPTIONS.find(f => f.key === selectedFont) || FONT_OPTIONS[4]; // Default to roboto
  const selectedSizeConfig = SIZE_OPTIONS.find(s => s.key === selectedSize) || SIZE_OPTIONS[1]; // Default to medium
  const selectedPositionConfig = POSITION_OPTIONS.find(p => p.key === selectedPosition) || POSITION_OPTIONS[2]; // Default to bottom

  return (
    <div className="flex items-center gap-2">
      {/* Font Selector */}
      <div className="relative">
        <button
          onClick={() => setFontOpen(!fontOpen)}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
          title="Select Caption Font"
        >
          <Type className="w-3 h-3" />
          <span className="hidden sm:inline font-medium" style={selectedFontConfig.style}>
            {selectedFontConfig.name}
          </span>
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${fontOpen ? 'rotate-180' : ''}`} />
        </button>

        {fontOpen && (
          <div className="absolute top-full right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 min-w-[200px]">
            <div className="p-2">
              <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                Caption Font
              </div>
              <div className="space-y-1">
                {FONT_OPTIONS.map((font) => (
                  <button
                    key={font.key}
                    onClick={() => handleFontChange(font.key)}
                    className={`w-full text-left px-2 py-2 text-sm rounded-md transition-colors flex flex-col gap-0.5 ${
                      selectedFont === font.key
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <div className="font-medium" style={font.style}>
                      {font.name}
                    </div>
                    <div className={`text-xs ${
                      selectedFont === font.key
                        ? 'text-primary-foreground/70'
                        : 'text-muted-foreground'
                    }`}>
                      {font.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {fontOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setFontOpen(false)}
          />
        )}
      </div>

      {/* Size Selector */}
      <div className="relative">
        <button
          onClick={() => setSizeOpen(!sizeOpen)}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
          title="Select Caption Size"
        >
          <Maximize2 className="w-3 h-3" />
          <span className="hidden sm:inline font-medium">
            {selectedSizeConfig.name}
          </span>
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${sizeOpen ? 'rotate-180' : ''}`} />
        </button>

        {sizeOpen && (
          <div className="absolute top-full right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 min-w-[160px]">
            <div className="p-2">
              <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                Caption Size
              </div>
              <div className="space-y-1">
                {SIZE_OPTIONS.map((size) => (
                  <button
                    key={size.key}
                    onClick={() => handleSizeChange(size.key)}
                    className={`w-full text-left px-2 py-2 text-sm rounded-md transition-colors flex justify-between items-center ${
                      selectedSize === size.key
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <div className="font-medium">
                      {size.name}
                    </div>
                    <div className={`text-xs ${
                      selectedSize === size.key
                        ? 'text-primary-foreground/70'
                        : 'text-muted-foreground'
                    }`}>
                      {size.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {sizeOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setSizeOpen(false)}
          />
        )}
      </div>

      {/* Position Selector */}
      <div className="relative">
        <button
          onClick={() => setPositionOpen(!positionOpen)}
          className="flex items-center gap-1 px-2 py-1 text-xs rounded-md hover:bg-muted/50 transition-colors text-muted-foreground hover:text-foreground border border-transparent hover:border-border"
          title="Select Caption Position"
        >
          <Move className="w-3 h-3" />
          <span className="hidden sm:inline font-medium">
            {selectedPositionConfig.name}
          </span>
          <ChevronDown className={`w-3 h-3 transition-transform duration-200 ${positionOpen ? 'rotate-180' : ''}`} />
        </button>

        {positionOpen && (
          <div className="absolute top-full right-0 mt-1 bg-background border border-border rounded-lg shadow-lg z-50 min-w-[180px]">
            <div className="p-2">
              <div className="text-xs font-medium text-muted-foreground mb-2 px-2">
                Caption Position
              </div>
              <div className="space-y-1">
                {POSITION_OPTIONS.map((position) => (
                  <button
                    key={position.key}
                    onClick={() => handlePositionChange(position.key)}
                    className={`w-full text-left px-2 py-2 text-sm rounded-md transition-colors flex flex-col gap-0.5 ${
                      selectedPosition === position.key
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted/50 text-foreground'
                    }`}
                  >
                    <div className="font-medium">
                      {position.name}
                    </div>
                    <div className={`text-xs ${
                      selectedPosition === position.key
                        ? 'text-primary-foreground/70'
                        : 'text-muted-foreground'
                    }`}>
                      {position.description}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {positionOpen && (
          <div
            className="fixed inset-0 z-40"
            onClick={() => setPositionOpen(false)}
          />
        )}
      </div>
    </div>
  );
}