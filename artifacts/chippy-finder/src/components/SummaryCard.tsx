import { NearbySummary } from "@workspace/api-client-react";
import { formatDistance } from "@/lib/utils";
import { Fish, Award, Navigation, Sparkles } from "lucide-react";

interface SummaryCardProps {
  summary: NearbySummary;
}

export function SummaryCard({ summary }: SummaryCardProps) {
  return (
    <div className="bg-primary text-primary-foreground rounded-2xl overflow-hidden shadow-lg border border-primary-border">
      <div className="p-6 sm:p-8">
        <h2 className="text-2xl sm:text-3xl font-display font-bold mb-6 flex items-center gap-3">
          <Fish className="w-8 h-8 opacity-80" />
          The Local Catch
        </h2>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-primary-foreground/10 rounded-xl p-4 flex flex-col justify-center">
            <span className="text-4xl font-display font-bold">{summary.totalFound}</span>
            <span className="text-sm font-medium opacity-90 uppercase tracking-wider mt-1">Chippies Found</span>
          </div>
          
          <div className="bg-primary-foreground/10 rounded-xl p-4 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-1">
              <Award className="w-4 h-4 opacity-70" />
              <span className="text-sm font-medium opacity-90 uppercase tracking-wider">Top Rated</span>
            </div>
            <span className="text-2xl font-display font-bold">{summary.topRatedCount}</span>
            <span className="text-xs opacity-75 mt-0.5">Rating 4 or 5</span>
          </div>
          
          <div className="bg-primary-foreground/10 rounded-xl p-4 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-1">
              <Navigation className="w-4 h-4 opacity-70" />
              <span className="text-sm font-medium opacity-90 uppercase tracking-wider">Closest</span>
            </div>
            <span className="text-2xl font-display font-bold truncate" title={summary.nearestName || ""}>
              {summary.nearestName || "N/A"}
            </span>
            <span className="text-xs opacity-75 mt-0.5">
              {formatDistance(summary.nearestDistanceMetres)}
            </span>
          </div>

          <div className="bg-primary-foreground/10 rounded-xl p-4 flex flex-col justify-center">
            <div className="flex items-center gap-1.5 mb-1">
              <Navigation className="w-4 h-4 opacity-70" />
              <span className="text-sm font-medium opacity-90 uppercase tracking-wider">Avg Distance</span>
            </div>
            <span className="text-2xl font-display font-bold">
              {formatDistance(summary.averageDistanceMetres)}
            </span>
          </div>
        </div>

        <div className="bg-card/90 text-card-foreground rounded-xl p-4 md:p-5 flex gap-4 items-start shadow-inner">
          <div className="bg-secondary/20 p-2.5 rounded-full shrink-0">
            <Sparkles className="w-5 h-5 text-secondary" />
          </div>
          <div>
            <h4 className="font-bold text-sm text-secondary uppercase tracking-wider mb-1">Did you know?</h4>
            <p className="text-sm md:text-base leading-relaxed opacity-90">
              {summary.funFact}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
