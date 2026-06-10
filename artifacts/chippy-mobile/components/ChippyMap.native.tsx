import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React, { useState } from "react";
import {
  Linking,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import MapView, { Marker } from "react-native-maps";

import { useColors } from "@/hooks/useColors";

type ChipShop = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceMetres: number;
  address?: string | null;
  postcode?: string | null;
  phone?: string | null;
  hygieneRating?: number | null;
  hygieneRatingLabel?: string | null;
  nation: "england" | "wales" | "scotland" | "unknown";
};

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

function pinColor(rating: number | null | undefined, isFav: boolean): string {
  if (isFav) return "#FFAD00";
  if (rating === null || rating === undefined) return "#9CA3AF";
  if (rating >= 4) return "#16a34a";
  if (rating >= 2) return "#d97706";
  return "#dc2626";
}

function hygieneColor(rating: number | null | undefined): string {
  if (rating === null || rating === undefined) return "#9CA3AF";
  if (rating >= 4) return "#16a34a";
  if (rating >= 2) return "#d97706";
  return "#dc2626";
}

const RADIUS_DELTA: Record<number, number> = {
  1000: 0.022,
  2000: 0.042,
  5000: 0.1,
  10000: 0.2,
};

export default function ChippyMap({
  coords,
  shops,
  radiusMetres,
  favouriteIds = [],
}: {
  coords: { lat: number; lng: number };
  shops: ChipShop[];
  radiusMetres: number;
  favouriteIds?: string[];
}) {
  const colors = useColors();
  const styles = makeStyles(colors);
  const [selected, setSelected] = useState<ChipShop | null>(null);

  const delta = RADIUS_DELTA[radiusMetres] ?? 0.1;
  const favSet = new Set(favouriteIds);

  const openMaps = (shop: ChipShop) => {
    Haptics.selectionAsync();
    const query = shop.address
      ? encodeURIComponent(`${shop.name} ${shop.address}`)
      : `${shop.lat},${shop.lng}`;
    Linking.openURL(`https://maps.google.com/?q=${query}`);
  };

  const openPhone = (phone: string) => {
    Haptics.selectionAsync();
    Linking.openURL(`tel:${phone.replace(/\s/g, "")}`);
  };

  // Render favourite pins last so they appear on top of others
  const sortedShops = [...shops].sort((a, b) =>
    (favSet.has(a.id) ? 1 : 0) - (favSet.has(b.id) ? 1 : 0),
  );

  return (
    <View style={styles.container}>
      <MapView
        style={styles.map}
        initialRegion={{
          latitude: coords.lat,
          longitude: coords.lng,
          latitudeDelta: delta,
          longitudeDelta: delta,
        }}
        showsUserLocation
        showsMyLocationButton
        onPress={() => setSelected(null)}
        testID="map-view"
      >
        {sortedShops.map((shop) => {
          const isFav = favSet.has(shop.id);
          return (
            <Marker
              key={shop.id}
              coordinate={{ latitude: shop.lat, longitude: shop.lng }}
              pinColor={pinColor(shop.hygieneRating, isFav)}
              onPress={(e) => {
                e.stopPropagation();
                Haptics.selectionAsync();
                setSelected(shop);
              }}
              testID={`marker-shop-${shop.id}`}
            />
          );
        })}
      </MapView>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#FFAD00" }]} />
          <Text style={styles.legendText}>saved</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#16a34a" }]} />
          <Text style={styles.legendText}>4–5</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#d97706" }]} />
          <Text style={styles.legendText}>2–3</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#dc2626" }]} />
          <Text style={styles.legendText}>0–1</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: "#9CA3AF" }]} />
          <Text style={styles.legendText}>unrated</Text>
        </View>
      </View>

      {/* Count pill */}
      <View style={styles.countPill}>
        <Text style={styles.countText}>
          {shops.length} chippy{shops.length !== 1 ? "s" : ""}
          {favouriteIds.length > 0 ? `  ❤️ ${favouriteIds.length}` : ""}
        </Text>
      </View>

      {/* Selected shop card */}
      {selected && (
        <View style={[styles.bottomCard, favSet.has(selected.id) && styles.bottomCardFav]}>
          <View style={styles.cardHeader}>
            <View style={styles.cardTitleRow}>
              {favSet.has(selected.id) && (
                <MaterialCommunityIcons name="heart" size={14} color="#ef4444" />
              )}
              <Text style={styles.cardName} numberOfLines={1}>
                {selected.name}
              </Text>
              <View style={styles.distPill}>
                <Text style={styles.distText}>{formatDistance(selected.distanceMetres)}</Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={() => setSelected(null)}
              style={styles.dismissBtn}
              testID="button-dismiss-card"
            >
              <Feather name="x" size={16} color={colors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {!!(selected.address || selected.postcode) && (
            <View style={styles.infoRow}>
              <Feather name="map-pin" size={12} color={colors.mutedForeground} />
              <Text style={styles.infoText} numberOfLines={1}>
                {[selected.address, selected.postcode].filter(Boolean).join(" · ")}
              </Text>
            </View>
          )}

          {selected.hygieneRating !== null && selected.hygieneRating !== undefined && (
            <View style={styles.infoRow}>
              <MaterialCommunityIcons
                name="silverware-fork-knife"
                size={12}
                color={hygieneColor(selected.hygieneRating)}
              />
              <Text
                style={[
                  styles.infoText,
                  { color: hygieneColor(selected.hygieneRating), fontFamily: "Inter_600SemiBold" },
                ]}
              >
                Hygiene rating: {selected.hygieneRating}/5
              </Text>
            </View>
          )}

          <View style={styles.cardActions}>
            <Pressable
              style={({ pressed }) => [styles.actionPrimary, pressed && { opacity: 0.85 }]}
              onPress={() => openMaps(selected)}
              testID={`button-map-directions-${selected.id}`}
            >
              <Feather name="navigation" size={14} color="#1A1A1A" />
              <Text style={styles.actionPrimaryText}>Directions</Text>
            </Pressable>
            {!!selected.phone && (
              <TouchableOpacity
                style={styles.actionSecondary}
                onPress={() => openPhone(selected.phone!)}
                testID={`button-map-phone-${selected.id}`}
              >
                <Feather name="phone" size={15} color={colors.foreground} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: { flex: 1 },
    map: { flex: 1 },
    legend: {
      position: "absolute",
      top: 12,
      right: 12,
      backgroundColor: colors.card,
      borderRadius: 10,
      padding: 10,
      gap: 5,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
      borderWidth: 1,
      borderColor: colors.border,
    },
    legendItem: { flexDirection: "row", alignItems: "center", gap: 6 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendText: {
      fontSize: 11,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    countPill: {
      position: "absolute",
      top: 12,
      left: 12,
      backgroundColor: colors.primary,
      paddingHorizontal: 12,
      paddingVertical: 6,
      borderRadius: 50,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.15,
      shadowRadius: 4,
      elevation: 3,
    },
    countText: {
      fontSize: 12,
      fontFamily: "Inter_700Bold",
      fontWeight: "700" as const,
      color: "#1A1A1A",
    },
    bottomCard: {
      position: "absolute",
      bottom: 20,
      left: 16,
      right: 16,
      backgroundColor: colors.card,
      borderRadius: 16,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.12,
      shadowRadius: 12,
      elevation: 8,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 6,
    },
    bottomCardFav: {
      borderColor: "#ef444428",
    },
    cardHeader: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 8,
      marginBottom: 2,
    },
    cardTitleRow: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      flexWrap: "wrap",
    },
    cardName: {
      flex: 1,
      fontSize: 16,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    distPill: {
      backgroundColor: "#FFAD0018",
      paddingHorizontal: 8,
      paddingVertical: 3,
      borderRadius: 50,
      borderWidth: 1,
      borderColor: "#FFAD0030",
    },
    distText: {
      fontSize: 12,
      fontWeight: "700" as const,
      fontFamily: "Inter_700Bold",
      color: "#9A6B00",
    },
    dismissBtn: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    infoRow: { flexDirection: "row", alignItems: "center", gap: 6 },
    infoText: {
      flex: 1,
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    cardActions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 8,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionPrimary: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 6,
      backgroundColor: colors.primary,
      paddingVertical: 10,
      borderRadius: 10,
    },
    actionPrimaryText: {
      fontSize: 14,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
      color: "#1A1A1A",
    },
    actionSecondary: {
      width: 42,
      height: 42,
      borderRadius: 10,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
