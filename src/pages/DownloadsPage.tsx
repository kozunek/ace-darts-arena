import ExtensionDownloadSection from "@/components/ExtensionDownloadSection";
import ApkDownloadSection from "@/components/ApkDownloadSection";
import { Download } from "lucide-react";

const DownloadsPage = () => {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="flex items-center gap-3 mb-8">
        <div className="p-2 rounded-lg bg-primary/20 border border-primary/30">
          <Download className="h-7 w-7 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl md:text-4xl font-display font-bold text-foreground">Pobieranie</h1>
          <p className="text-muted-foreground font-body text-sm">Wtyczka przeglądarkowa i aplikacja mobilna</p>
        </div>
      </div>

      <div className="space-y-8">
        <ExtensionDownloadSection />
        <ApkDownloadSection />
      </div>
    </div>
  );
};

export default DownloadsPage;
