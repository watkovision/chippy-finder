import { ChipShop } from "@workspace/api-client-react";
import { MapPin, Navigation, Star, Clock, Phone, Globe, Info } from "lucide-react";
import { formatDistance } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

interface ChippyCardProps {
  shop: ChipShop;
}

const NATION_FLAGS: Record<string, string> = {
  england: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  wales: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  scotland: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  unknown: "",
};

export function ChippyCard({ shop }: ChippyCardProps) {
  const getHygieneColor = (rating: number | null) => {
    if (rating === null) return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
    if (rating >= 4) return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800";
    if (rating >= 3) return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-300 dark:border-yellow-800";
    return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800";
  };

  const getHygieneText = (rating: number | null, label: string | null) => {
    if (rating === null) return "Awaiting inspection";
    if (label) return `${rating} - ${label.replace(/^\d+\s*-\s*/, '')}`;
    return `Rating: ${rating}/5`;
  };

  const flag = NATION_FLAGS[shop.nation] || "";

  return (
    <div className="group bg-card rounded-xl border border-card-border overflow-hidden hover-elevate transition-all duration-300 w-full animate-in fade-in slide-in-from-bottom-4">
      <div className="p-5 flex flex-col h-full gap-4">
        {/* Header */}
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <h3 className="font-display font-bold text-xl text-foreground flex items-center gap-2">
              {shop.name} {flag && <span className="text-xl leading-none">{flag}</span>}
            </h3>
            {shop.address && (
              <p className="text-sm text-muted-foreground flex items-start gap-1">
                <MapPin className="w-4 h-4 shrink-0 mt-0.5 text-secondary" />
                <span className="line-clamp-2">{shop.address}</span>
              </p>
            )}
          </div>
          <div className="flex flex-col items-end shrink-0 bg-primary/10 px-3 py-2 rounded-lg">
            <span className="text-2xl font-bold text-primary font-display leading-none">
              {formatDistance(shop.distanceMetres)}
            </span>
            <span className="text-xs font-medium text-primary/80 uppercase tracking-wider mt-1">Away</span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          {/* Details Column 1 */}
          <div className="space-y-2.5">
            {shop.openingHours ? (
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <Clock className="w-4 h-4 text-muted-foreground" />
                <span className="truncate">{shop.openingHours}</span>
              </div>
            ) : null}
            
            {shop.phone ? (
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <Phone className="w-4 h-4 text-muted-foreground" />
                <a href={`tel:${shop.phone.replace(/\s+/g, '')}`} className="hover:text-primary transition-colors hover:underline">
                  {shop.phone}
                </a>
              </div>
            ) : null}

            {shop.website ? (
              <div className="flex items-center gap-2 text-sm text-foreground/80">
                <Globe className="w-4 h-4 text-muted-foreground" />
                <a href={shop.website} target="_blank" rel="noopener noreferrer" className="hover:text-primary transition-colors hover:underline truncate">
                  Website
                </a>
              </div>
            ) : null}
          </div>

          {/* Details Column 2 */}
          <div className="space-y-3 flex flex-col justify-end items-start md:items-end">
             <div className="flex items-center gap-2 w-full justify-start md:justify-end">
                <Badge variant="outline" className={`font-medium px-2.5 py-1 ${getHygieneColor(shop.hygieneRating)}`}>
                  <div className="flex items-center gap-1.5">
                    {shop.hygieneRating !== null ? (
                      <Star className="w-3.5 h-3.5 fill-current" />
                    ) : (
                      <Info className="w-3.5 h-3.5" />
                    )}
                    {getHygieneText(shop.hygieneRating, shop.hygieneRatingLabel)}
                  </div>
                </Badge>
             </div>
             <a 
                href={`https://www.google.com/maps/dir/?api=1&destination=${shop.lat},${shop.lng}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full md:w-auto inline-flex items-center justify-center gap-2 bg-secondary text-secondary-foreground px-4 py-2 rounded-lg font-medium hover:bg-secondary/90 transition-colors active:scale-[0.98]"
              >
                <Navigation className="w-4 h-4" />
                <span>Get Directions</span>
              </a>
          </div>
        </div>
      </div>
    </div>
  );
}
