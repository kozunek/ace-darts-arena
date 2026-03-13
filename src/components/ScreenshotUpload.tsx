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

/**
 * Compress image client-side before upload to save storage.
 * Target: max 1200px wide, JPEG quality 0.7 (~50-80KB per screenshot)
 */
const compressImage = (file: File, maxWidth = 1200, quality = 0.7): Promise<Blob> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement("canvas");
      let w = img.width;
      let h = img.height;
      if (w > maxWidth) {
        h = Math.round((h * maxWidth) / w);
        w = maxWidth;
      }
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) { resolve(file); return; }
      ctx.drawImage(img, 0, 0, w, h);
      canvas.toBlob(
        (blob) => {
          if (blob) resolve(blob);
          else resolve(file);
        },
        "image/jpeg",
        quality
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Image load failed")); };
    img.src = url;
  });
};

const ScreenshotUpload = ({ onStatsExtracted, matchId, disabled, matchContext }: ScreenshotUploadProps) => {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [uploadedUrls, setUploadedUrls] = useState<string[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);

  const uploadFile = async (file: File): Promise<string | null> => {
    // Compress before upload
    const compressed = await compressImage(file);
    const path = `${matchId || "temp"}/${Date.now()}-${Math.random().toString(36).slice(2)}.jpg`;

    const { error } = await supabase.storage
      .from("match-screenshots")
      .upload(path, compressed, { contentType: "image/jpeg" });

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
    if (uploadedUrls.length + files.length > 2) {
      toast({ title: "Limit", description: "Maksymalnie 2 zrzuty ekranu.", variant: "destructive" });
      return;
    }

    setUploading(true);
    const newUrls: string[] = [];
    const newPreviews: string[] = [];

    for (const file of Array.from(files)) {
      if (!file.type.startsWith("image/")) continue;

      // Local preview (use compressed version)
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
        // Handle rate limit and payment errors
        const errorMsg = error.message || "";
        if (errorMsg.includes("429") || errorMsg.includes("rate")) {
          toast({ title: "⏳ Limit żądań", description: "Zbyt wiele żądań AI. Poczekaj chwilę i spróbuj ponownie.", variant: "destructive" });
        } else if (errorMsg.includes("402") || errorMsg.includes("payment") || errorMsg.includes("kredyty")) {
          toast({ title: "💳 Brak kredytów AI", description: "Wyczerpano limit AI. Doładuj kredyty lub ustaw własny klucz API w Ustawieniach → Integracje.", variant: "destructive" });
        } else {
          toast({ title: "Błąd analizy", description: error.message, variant: "destructive" });
        }
        setAnalyzing(false);
        return;
      }

      if (!data?.success || !data?.data) {
        const errMsg = data?.error || "Nie udało się przeanalizować";
        if (errMsg.includes("kredyty") || errMsg.includes("402")) {
          toast({ title: "💳 Brak kredytów AI", description: errMsg, variant: "destructive" });
        } else {
          toast({ title: "Błąd", description: errMsg, variant: "destructive" });
        }
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
              <img src={preview} alt={`Screenshot ${i + 1}`} className="w-full h-full object-cover" loading="lazy" />
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
          disabled={disabled || uploading || uploadedUrls.length >= 2}
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
        Prześlij zrzuty ekranu z podsumowania meczu (wymagane). AI rozpozna statystyki automatycznie.
        {uploadedUrls.length > 0 && ` (${uploadedUrls.length}/2)`}
      </p>
    </div>
  );
};

export default ScreenshotUpload;
