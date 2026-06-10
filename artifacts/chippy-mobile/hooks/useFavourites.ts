import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useCallback, useEffect, useState } from "react";

const KEY = "@chippy:favourites:v1";

export type FavouriteShop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceMetres: number;
  address?: string | null;
  postcode?: string | null;
  phone?: string | null;
  website?: string | null;
  openingHours?: string | null;
  hygieneRating?: number | null;
  hygieneRatingLabel?: string | null;
  localAuthority?: string | null;
  nation: "england" | "wales" | "scotland" | "unknown";
};

export function useFavourites() {
  const [favourites, setFavourites] = useState<FavouriteShop[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(KEY).then((raw) => {
      try {
        if (raw) setFavourites(JSON.parse(raw));
      } catch {}
      setLoaded(true);
    });
  }, []);

  const persist = useCallback(async (next: FavouriteShop[]) => {
    setFavourites(next);
    await AsyncStorage.setItem(KEY, JSON.stringify(next));
  }, []);

  const isFavourite = useCallback(
    (id: string) => favourites.some((f) => f.id === id),
    [favourites],
  );

  const toggleFavourite = useCallback(
    (shop: FavouriteShop) => {
      const removing = favourites.some((f) => f.id === shop.id);
      Haptics.impactAsync(
        removing
          ? Haptics.ImpactFeedbackStyle.Light
          : Haptics.ImpactFeedbackStyle.Medium,
      );
      const next = removing
        ? favourites.filter((f) => f.id !== shop.id)
        : [shop, ...favourites];
      persist(next);
    },
    [favourites, persist],
  );

  const favouriteIds = favourites.map((f) => f.id);

  return { favourites, favouriteIds, isFavourite, toggleFavourite, loaded };
}
