import { useState } from "react";
import { useGeolocation } from "@/hooks/use-geolocation";
import { 
  useListNearbyChipShops, 
  getListNearbyChipShopsQueryKey,
  useGetNearbySummary,
  getGetNearbySummaryQueryKey
} from "@workspace/api-client-react";
import { MapPin, Navigation, MapPinOff, Fish, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChippyCard } from "@/components/ChippyCard";
import { SummaryCard } from "@/components/SummaryCard";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDistance } from "@/lib/utils";

export default function Home() {
  const { lat, lng, loading: geoLoading, error: geoError, requestLocation, permissionStatus } = useGeolocation();
  const [radius, setRadius] = useState<number>(5000); // Default 5km

  const hasLocation = lat !== null && lng !== null;
  const queryParams = hasLocation ? { lat, lng, radius } : undefined;

  const { 
    data: chipShops = [], 
    isLoading: shopsLoading, 
    isError: shopsError 
  } = useListNearbyChipShops(
    queryParams as any, 
    { 
      query: { 
        enabled: !!queryParams, 
        queryKey: queryParams ? getListNearbyChipShopsQueryKey(queryParams) : [] 
      } 
    }
  );

  const { 
    data: summary, 
    isLoading: summaryLoading 
  } = useGetNearbySummary(
    queryParams as any, 
    { 
      query: { 
        enabled: !!queryParams, 
        queryKey: queryParams ? getGetNearbySummaryQueryKey(queryParams) : [] 
      } 
    }
  );

  const isLoading = geoLoading || (hasLocation && (shopsLoading || summaryLoading));

  return (
    <div className="min-h-[100dvh] bg-background font-sans pb-24">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2 text-primary font-display font-bold text-xl tracking-tight">
            <Fish className="w-6 h-6" />
            <span>Chippy Finder</span>
          </div>
          
          {hasLocation && (
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-muted-foreground hidden sm:inline-block">Search radius:</span>
              <Select value={radius.toString()} onValueChange={(val) => setRadius(parseInt(val, 10))}>
                <SelectTrigger className="w-[110px] h-9 bg-card">
                  <SelectValue placeholder="Radius" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1000">1 km</SelectItem>
                  <SelectItem value="2000">2 km</SelectItem>
                  <SelectItem value="5000">5 km</SelectItem>
                  <SelectItem value="10000">10 km</SelectItem>
                  <SelectItem value="20000">20 km</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 pt-8 pb-12 space-y-8">
        {!hasLocation && !isLoading && (
          <div className="py-20 flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-8 animate-in fade-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2 shadow-inner">
              <MapPin className="w-12 h-12" />
            </div>
            
            <div className="space-y-4">
              <h1 className="text-4xl md:text-5xl font-display font-extrabold text-foreground tracking-tight">
                Hungry for some <span className="text-primary">proper chips?</span>
              </h1>
              <p className="text-lg text-muted-foreground leading-relaxed px-4">
                We'll find the nearest, best-rated fish & chip shops around you in England, Wales, and Scotland. Complete with hygiene ratings so you don't get a dodgy battered sausage.
              </p>
            </div>

            {geoError && (
              <div className="bg-destructive/10 text-destructive-foreground px-4 py-3 rounded-lg flex items-start gap-3 w-full max-w-md text-left">
                <MapPinOff className="w-5 h-5 shrink-0 mt-0.5 text-destructive" />
                <div>
                  <p className="font-semibold text-destructive">Location Error</p>
                  <p className="text-sm opacity-90 mt-1">{geoError}</p>
                  {permissionStatus === 'denied' && (
                    <p className="text-xs opacity-75 mt-2">You may need to enable location access in your browser settings and try again.</p>
                  )}
                </div>
              </div>
            )}

            <Button 
              size="lg" 
              className="rounded-full px-8 py-6 text-lg font-bold shadow-xl hover:shadow-2xl transition-all active:scale-95 bg-primary text-primary-foreground border-b-4 border-primary-border hover-elevate"
              onClick={requestLocation}
            >
              <Navigation className="w-5 h-5 mr-2" />
              Find my nearest chippy
            </Button>
          </div>
        )}

        {isLoading && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="flex items-center gap-3 text-muted-foreground mb-4">
              <Search className="w-5 h-5 animate-spin text-primary" />
              <span className="font-medium animate-pulse">Sniffing out the vinegar...</span>
            </div>
            <Skeleton className="w-full h-[280px] rounded-2xl bg-card border border-border" />
            <div className="grid grid-cols-1 gap-4">
              {[1, 2, 3, 4].map(i => (
                <Skeleton key={i} className="w-full h-40 rounded-xl bg-card border border-border" />
              ))}
            </div>
          </div>
        )}

        {hasLocation && !isLoading && summary && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <SummaryCard summary={summary} />
            
            <div className="mt-12 space-y-6">
              <div className="flex items-end justify-between border-b border-border pb-4">
                <h3 className="text-2xl font-display font-bold text-foreground">
                  Found {chipShops.length} shops near you
                </h3>
                <span className="text-muted-foreground text-sm font-medium">Sorted by distance</span>
              </div>
              
              {shopsError ? (
                <div className="bg-destructive/10 text-destructive-foreground p-6 rounded-xl border border-destructive-border">
                  <h4 className="font-bold mb-2">Blimey, something went wrong.</h4>
                  <p className="opacity-90 text-sm">We couldn't fetch the chip shops. Try refreshing the page or expanding your search radius.</p>
                </div>
              ) : chipShops.length === 0 ? (
                <div className="text-center py-20 bg-card rounded-2xl border border-dashed border-border flex flex-col items-center">
                  <div className="text-6xl mb-4">🍟</div>
                  <h3 className="text-2xl font-display font-bold text-foreground mb-2">No chippies found</h3>
                  <p className="text-muted-foreground mb-6 max-w-sm mx-auto">
                    We couldn't find any fish & chip shops within {formatDistance(radius)}. You might be in a chips desert!
                  </p>
                  <Button 
                    variant="outline" 
                    onClick={() => setRadius(r => r === 5000 ? 10000 : 20000)}
                  >
                    Expand search radius
                  </Button>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {chipShops.map((shop, index) => (
                    <div key={shop.id} style={{ animationDelay: `${index * 50}ms` }} className="animate-in fade-in slide-in-from-bottom-4 fill-mode-both">
                      <ChippyCard shop={shop} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
