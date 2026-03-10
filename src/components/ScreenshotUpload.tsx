import { useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Camera, Loader2, X, ImagePlus, Sparkles } from "lucide-react";

interface ScreenshotUploadProps {
  onStatsExtracted: (stats: Record<string, any>) => void;
  matchId?: string;
  disabled?: boolean;
  matchContext?: { player1_name: string; player2_name: string };
}

const ScreenshotUpload = ({ onStatsExtracted, matchId, disabled, matchContext }: ScreenshotUploadProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const uploadFile = async (file: File): Promise<string | null> => {
    const ext = file.name.split(".").pop() || "png";
    const path = `${matchId || "temp"}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;

    const { error } = await supabase.storage
      .from("match-screenshots")
      .upload(path, file, { contentType: file.type });

    if (error) {
      console.error("Upload error:", error);
      return null;
    }

    const { data: urlData } = supabase.storage
      .from("match-screenshots")
      .getPublicUrl(path);

    return urlData.publicUrl;
  };

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    if (uploadedUrls.length + files.length > 5) {
      toast({ title: "Limit", description: "Maksymalnie 5 zrzutów ekranu.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];
    const newPreviews: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;

      // Local preview
      const reader = new FileReader();
      const previewPromise = new Promise<string>((resolve) => {
        reader.onload = (e) => resolve(e.target?.result as string);
        reader.readAsDataURL(file);
      });
      newPreviews.push(await previewPromise);

      const url = await uploadFile(file);
      if (url) newUrls.push(url);
    }

    setUploadedUrls((prev) => [...prev, ...newUrls]);
    setPreviews((prev) => [...prev, ...newPreviews]);
    setUploading(false);

    if (newUrls.length > 0) {
      toast({ title: "📸 Przesłano!", description: `${newUrls.length} zrzut(y) ekranu.` });
    }
  };

  const removeScreenshot = (index: number) => {
    setUploadedUrls((prev) => prev.filter((_, i) => i !== index));
    setPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const analyzeScreenshots = async () => {
    if (uploadedUrls.length === 0) return;

    setAnalyzing(true);
    try {
      const requestBody: Record<string, any> = { screenshot_urls: uploadedUrls };
      if (matchContext) {
        requestBody.match_context = matchContext;
      }
      const { data, error } = await supabase.functions.invoke("analyze-match-screenshot", {
        body: requestBody,
      });

      if (error) {
        toast({ title: "Błąd analizy", description: error.message, variant: "destructive" });
        setAnalyzing(false);
        return;
      }

      if (!data?.success || !data?.data) {
        toast({ title: "Błąd", description: data?.error || "Nie udało się przeanalizować", variant: "destructive" });
        setAnalyzing(false);
        return;
      }

      const stats = data.data;

      if (stats.confidence === "none") {
        toast({
          title: "Nie rozpoznano",
          description: "Zrzut ekranu nie wygląda na podsumowanie meczu darta. Spróbuj inny screenshot.",
          variant: "destructive",
        });
        setAnalyzing(false);
        return;
      }

      if (stats.confidence === "low") {
        toast({
          title: "⚠️ Niska pewność",
          description: "Niektóre dane mogą być nieprawidłowe. Sprawdź i popraw ręcznie.",
        });
      } else {
        toast({
          title: "✅ Rozpoznano!",
          description: `Platforma: ${stats.platform || "nieznana"} — ${stats.player1_name || "?"} vs ${stats.player2_name || "?"}`,
        });
      }

      onStatsExtracted({ ...stats, screenshot_urls: uploadedUrls });
    } catch (err) {
      console.error("Analysis error:", err);
      toast({ title: "Błąd", description: "Nie udało się połączyć z AI.", variant: "destructive" });
    }
    setAnalyzing(false);
  };

  return (
    <div className="space-y-4 rounded-lg border border-border bg-card p-4">
      <div className="flex items-center gap-2">
        <Camera className="h-4 w-4 text-primary" />
        <Label className="font-display uppercase tracking-wider text-xs text-muted-foreground">
          Zrzuty ekranu z aplikacji (DartCounter / DartsMind)
        </Label>
      </div>

      {/* Preview grid */}
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2">
          {previews.map((preview, i) => (
            <div key={i} className="relative group rounded-lg overflow-hidden border border-border aspect-video">
              <img src={preview} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" />
              <button
                type="button"
                onClick={() => removeScreenshot(i)}
                className="absolute top-1 right-1 p-1 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
          disabled={disabled || uploading}
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
          disabled={disabled || uploading || uploadedUrls.length >= 5}
          className="font-display uppercase tracking-wider text-xs"
        >
          {uploading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-1" />
          ) : (
            <ImagePlus className="h-4 w-4 mr-1" />
          )}
          {uploading ? "Przesyłanie..." : "Dodaj zrzuty"}
        </Button>

        {uploadedUrls.length > 0 && (
          <Button
            type="button"
            variant="default"
            size="sm"
            onClick={analyzeScreenshots}
            disabled={analyzing || disabled}
            className="font-display uppercase tracking-wider text-xs"
          >
            {analyzing ? (
              <Loader2 className="h-4 w-4 animate-spin mr-1" />
            ) : (
              <Sparkles className="h-4 w-4 mr-1" />
            )}
            {analyzing ? "Analizuję..." : "🤖 Analizuj AI"}
          </Button>
        )}
      </div>

      <p className="text-[10px] text-muted-foreground font-body">
        Prześlij zrzuty ekranu z podsumowania meczu. AI rozpozna statystyki automatycznie.
        {uploadedUrls.length > 0 && ` (${uploadedUrls.length}/5)`}
      </p>
    </div>
  );
};

export default ScreenshotUpload;
