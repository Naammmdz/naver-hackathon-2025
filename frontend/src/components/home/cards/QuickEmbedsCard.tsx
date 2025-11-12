import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Grid3x3, ExternalLink } from 'lucide-react';
import { useState } from 'react';

// Convert various URLs to embed-friendly formats
const convertToEmbedUrl = (url: string): string => {
  try {
    const urlObj = new URL(url);
    
    // YouTube - convert watch URLs to embed URLs
    if (urlObj.hostname.includes('youtube.com') || urlObj.hostname.includes('youtu.be')) {
      let videoId = '';
      
      if (urlObj.hostname.includes('youtu.be')) {
        // Short URL format: youtu.be/VIDEO_ID
        videoId = urlObj.pathname.slice(1).split('?')[0];
      } else if (urlObj.searchParams.has('v')) {
        // Regular URL format: youtube.com/watch?v=VIDEO_ID
        videoId = urlObj.searchParams.get('v') || '';
      } else if (urlObj.pathname.includes('/embed/')) {
        // Already an embed URL
        return url;
      }
      
      if (videoId) {
        return `https://www.youtube.com/embed/${videoId}`;
      }
    }
    
    // Google Docs - convert to preview URL
    if (urlObj.hostname.includes('docs.google.com')) {
      // Extract document ID
      const docIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (docIdMatch) {
        const docId = docIdMatch[1];
        return `https://docs.google.com/document/d/${docId}/preview`;
      }
    }
    
    // Google Sheets - convert to embed URL
    if (urlObj.hostname.includes('sheets.google.com')) {
      const sheetIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (sheetIdMatch) {
        const sheetId = sheetIdMatch[1];
        // Get gid (sheet tab ID) if present
        const gidMatch = url.match(/[#&]gid=([0-9]+)/);
        const gid = gidMatch ? gidMatch[1] : '0';
        return `https://docs.google.com/spreadsheets/d/${sheetId}/preview?gid=${gid}&widget=true&headers=false`;
      }
    }
    
    // Google Slides - convert to embed URL
    if (urlObj.hostname.includes('slides.google.com')) {
      const slideIdMatch = url.match(/\/d\/([a-zA-Z0-9-_]+)/);
      if (slideIdMatch) {
        const slideId = slideIdMatch[1];
        return `https://docs.google.com/presentation/d/${slideId}/embed?start=false&loop=false&delayms=3000`;
      }
    }
    
    // Google Forms
    if (urlObj.hostname.includes('forms.google.com') || urlObj.hostname.includes('docs.google.com/forms')) {
      if (!url.includes('/viewform')) {
        return url.replace('/edit', '/viewform?embedded=true');
      }
      return url + (url.includes('?') ? '&' : '?') + 'embedded=true';
    }
    
    // Google Drive - convert to preview URL
    if (urlObj.hostname.includes('drive.google.com')) {
      const fileIdMatch = url.match(/\/file\/d\/([a-zA-Z0-9-_]+)/);
      if (fileIdMatch) {
        const fileId = fileIdMatch[1];
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
      // Alternative ID pattern
      const idMatch = url.match(/[?&]id=([a-zA-Z0-9-_]+)/);
      if (idMatch) {
        const fileId = idMatch[1];
        return `https://drive.google.com/file/d/${fileId}/preview`;
      }
    }
    
    // Figma
    if (urlObj.hostname.includes('figma.com')) {
      return `https://www.figma.com/embed?embed_host=share&url=${encodeURIComponent(url)}`;
    }
    
    // CodePen
    if (urlObj.hostname.includes('codepen.io')) {
      // Convert to embed URL
      return url.replace('/pen/', '/embed/');
    }
    
    // Loom
    if (urlObj.hostname.includes('loom.com')) {
      const videoIdMatch = url.match(/\/share\/([a-zA-Z0-9]+)/);
      if (videoIdMatch) {
        return `https://www.loom.com/embed/${videoIdMatch[1]}`;
      }
    }
    
    // For other URLs, return as-is
    return url;
  } catch (e) {
    // If URL parsing fails, return original
    return url;
  }
};

export function QuickEmbedsCard() {
  const [embedType, setEmbedType] = useState<'url' | 'html'>('url');
  const [embedUrl, setEmbedUrl] = useState('');
  const [embedHtml, setEmbedHtml] = useState('');
  const [showEmbed, setShowEmbed] = useState(false);
  const [embedError, setEmbedError] = useState(false);

  const handleAddEmbed = () => {
    if ((embedType === 'url' && embedUrl) || (embedType === 'html' && embedHtml)) {
      setEmbedError(false);
      setShowEmbed(true);
    }
  };

  const handleClear = () => {
    setEmbedUrl('');
    setEmbedHtml('');
    setShowEmbed(false);
    setEmbedError(false);
  };

  const handleIframeError = () => {
    setEmbedError(true);
  };

  return (
    <div className="flex h-full flex-col">
      <div className="mb-3 flex items-center gap-2">
        <Grid3x3 className="h-4 w-4 text-cyan-500" />
        <h3 className="text-sm font-semibold text-foreground">Quick Embeds</h3>
      </div>

      {!showEmbed ? (
        <div className="flex-1 space-y-3">
          <RadioGroup value={embedType} onValueChange={(value) => setEmbedType(value as 'url' | 'html')}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="url" id="url" />
              <Label htmlFor="url" className="text-xs font-medium cursor-pointer">
                Embed URL
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="html" id="html" />
              <Label htmlFor="html" className="text-xs font-medium cursor-pointer">
                Enter embed HTML
              </Label>
            </div>
          </RadioGroup>

          {embedType === 'url' ? (
            <div className="space-y-2">
              <Input
                placeholder="Paste YouTube, Google Docs, Sheets, Slides URL..."
                value={embedUrl}
                onChange={(e) => setEmbedUrl(e.target.value)}
                className="text-xs"
              />
              <div className="space-y-1">
                <p className="text-[10px] text-muted-foreground">
                  YouTube, Loom, Figma,.. link
                </p>
                
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Textarea
                placeholder="Enter embed HTML code..."
                value={embedHtml}
                onChange={(e) => setEmbedHtml(e.target.value)}
                className="min-h-[100px] text-xs font-mono"
              />
              <p className="text-[10px] text-muted-foreground">
                Paste iframe or embed code from any service
              </p>
            </div>
          )}

          <Button 
            onClick={handleAddEmbed} 
            size="sm" 
            className="w-full"
            disabled={embedType === 'url' ? !embedUrl : !embedHtml}
          >
            Add Embed
          </Button>

          {/* Quick Access Buttons */}
          <div className="pt-2 border-t border-border/40">
            <p className="text-[10px] text-muted-foreground mb-2">Quick access:</p>
            <div className="grid grid-cols-2 gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => window.open('https://docs.google.com', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Google Docs
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => window.open('https://sheets.google.com', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Sheets
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => window.open('https://slides.google.com', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Slides
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs"
                onClick={() => window.open('https://drive.google.com', '_blank')}
              >
                <ExternalLink className="h-3 w-3 mr-1" />
                Drive
              </Button>
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
          <div className="flex-1 rounded-md border border-border/40 bg-muted/20 overflow-hidden relative">
            {embedError && (
              <div className="absolute inset-0 flex flex-col items-center justify-center bg-background/95 p-4 text-center z-10">
                <p className="text-sm font-medium text-foreground mb-2">Unable to load embed</p>
                <div className="text-xs text-muted-foreground mb-3 space-y-1">
                  <p className="font-medium">Possible reasons:</p>
                  <p>• Google Drive: File must be shared publicly ("Anyone with the link")</p>
                  <p>• YouTube: Some videos can't be embedded</p>
                  <p>• Website blocks embedding via X-Frame-Options</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    onClick={handleClear}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    Try Another
                  </Button>
                  <Button 
                    onClick={() => window.open(embedType === 'url' ? embedUrl : '#', '_blank')}
                    variant="outline"
                    size="sm"
                    className="text-xs"
                  >
                    <ExternalLink className="h-3 w-3 mr-1" />
                    Open Link
                  </Button>
                </div>
              </div>
            )}
            {embedType === 'url' ? (
              <iframe
                src={convertToEmbedUrl(embedUrl)}
                className="w-full h-full"
                frameBorder="0"
                allowFullScreen
                sandbox="allow-same-origin allow-scripts allow-popups allow-forms allow-presentation"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                referrerPolicy="no-referrer-when-downgrade"
                title="Embedded content"
                onError={handleIframeError}
              />
            ) : (
              <div 
                className="w-full h-full"
                dangerouslySetInnerHTML={{ __html: embedHtml }}
              />
            )}
          </div>
          <Button 
            onClick={handleClear} 
            variant="outline" 
            size="sm" 
            className="mt-2 w-full text-xs"
          >
            Change Embed
          </Button>
        </div>
      )}
    </div>
  );
}
