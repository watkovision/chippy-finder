import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import { Linking, Pressable, StyleSheet, Text, TouchableOpacity, View } from "react-native";

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
  website?: string | null;
  openingHours?: string | null;
  hygieneRating?: number | null;
  hygieneRatingLabel?: string | null;
  localAuthority?: string | null;
  nation: "england" | "wales" | "scotland" | "unknown";
};

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

const NATION_META: Record<string, { label: string; bg: string; text: string }> = {
  england: { label: "ENG", bg: "#003087", text: "#FFFFFF" },
  wales: { label: "WAL", bg: "#00A550", text: "#FFFFFF" },
  scotland: { label: "SCO", bg: "#005EB8", text: "#FFFFFF" },
  unknown: { label: "GB", bg: "#9CA3AF", text: "#FFFFFF" },
};

function HygieneBadge({ rating }: { rating: number | null | undefined }) {
  if (rating === null || rating === undefined) {
    return (
      <View style={[hStyles.badge, { backgroundColor: "#F3F4F6" }]}>
        <Text style={[hStyles.text, { color: "#9CA3AF" }]}>Unrated</Text>
      </View>
    );
  }
  const bg = rating >= 4 ? "#16a34a" : rating >= 3 ? "#d97706" : "#dc2626";
  return (
    <View style={[hStyles.badge, { backgroundColor: bg }]}>
      <MaterialCommunityIcons name="silverware-fork-knife" size={10} color="#FFF" />
      <Text style={[hStyles.text, { color: "#FFF" }]}>{rating}/5</Text>
    </View>
  );
}

const hStyles = StyleSheet.create({
  badge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 50,
  },
  text: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600" as const,
  },
});

export default function ShopCard({
  shop,
  isFavourite = false,
  onToggleFavourite,
}: {
  shop: ChipShop;
  isFavourite?: boolean;
  onToggleFavourite?: (shop: ChipShop) => void;
}) {
  const colors = useColors();
  const nation = NATION_META[shop.nation] ?? NATION_META.unknown;
  const styles = makeStyles(colors);

  const openMaps = () => {
    Haptics.selectionAsync();
    const query = shop.address
      ? encodeURIComponent(`${shop.name} ${shop.address}`)
      : `${shop.lat},${shop.lng}`;
    Linking.openURL(`https://maps.google.com/?q=${query}`);
  };

  const openPhone = () => {
    if (!shop.phone) return;
    Haptics.selectionAsync();
    Linking.openURL(`tel:${shop.phone.replace(/\s/g, "")}`);
  };

  const openWebsite = () => {
    if (!shop.website) return;
    Haptics.selectionAsync();
    const url = shop.website.startsWith("http") ? shop.website : `https://${shop.website}`;
    Linking.openURL(url);
  };

  return (
    <Pressable
      style={({ pressed }) => [
        styles.card,
        isFavourite && styles.cardFav,
        pressed && styles.cardPressed,
      ]}
      onPress={openMaps}
      testID={`card-shop-${shop.id}`}
    >
      <View style={styles.topRow}>
        <View style={styles.topLeft}>
          <Text style={styles.name} numberOfLines={2}>
            {shop.name}
          </Text>
          <View style={styles.badges}>
            <View style={[styles.nationBadge, { backgroundColor: nation.bg }]}>
              <Text style={[styles.nationText, { color: nation.text }]}>{nation.label}</Text>
            </View>
            <HygieneBadge rating={shop.hygieneRating} />
          </View>
        </View>
        <View style={styles.topRight}>
          <View style={styles.distancePill}>
            <Text style={styles.distanceText}>{formatDistance(shop.distanceMetres)}</Text>
          </View>
          {!!onToggleFavourite && (
            <TouchableOpacity
              style={[styles.heartBtn, isFavourite && styles.heartBtnActive]}
              onPress={() => onToggleFavourite(shop)}
              testID={`button-favourite-${shop.id}`}
              hitSlop={6}
            >
              <MaterialCommunityIcons
                name={isFavourite ? "heart" : "heart-outline"}
                size={18}
                color={isFavourite ? "#ef4444" : colors.mutedForeground}
              />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {!!(shop.address || shop.postcode) && (
        <View style={styles.infoRow}>
          <Feather name="map-pin" size={12} color={colors.mutedForeground} />
          <Text style={styles.infoText} numberOfLines={1}>
            {[shop.address, shop.postcode].filter(Boolean).join(" · ")}
          </Text>
        </View>
      )}

      {!!shop.openingHours && (
        <View style={styles.infoRow}>
          <Feather name="clock" size={12} color={colors.mutedForeground} />
          <Text style={styles.infoText} numberOfLines={1}>
            {shop.openingHours}
          </Text>
        </View>
      )}

      {!!(shop.phone || shop.website) && (
        <View style={styles.actions}>
          {!!shop.phone && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={openPhone}
              testID={`button-phone-${shop.id}`}
            >
              <Feather name="phone" size={14} color={colors.foreground} />
            </TouchableOpacity>
          )}
          {!!shop.website && (
            <TouchableOpacity
              style={styles.actionBtn}
              onPress={openWebsite}
              testID={`button-website-${shop.id}`}
            >
              <Feather name="globe" size={14} color={colors.foreground} />
            </TouchableOpacity>
          )}
          <TouchableOpacity
            style={styles.actionBtn}
            onPress={openMaps}
            testID={`button-directions-${shop.id}`}
          >
            <Feather name="navigation" size={14} color={colors.foreground} />
          </TouchableOpacity>
        </View>
      )}
    </Pressable>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginBottom: 10,
      borderRadius: 14,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 6,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardFav: {
      borderColor: "#ef444428",
    },
    cardPressed: {
      opacity: 0.93,
    },
    topRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: 12,
      marginBottom: 8,
    },
    topLeft: {
      flex: 1,
      gap: 6,
    },
    topRight: {
      alignItems: "flex-end",
      gap: 6,
    },
    name: {
      fontSize: 16,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      lineHeight: 22,
    },
    badges: {
      flexDirection: "row",
      gap: 6,
      flexWrap: "wrap",
    },
    nationBadge: {
      paddingHorizontal: 7,
      paddingVertical: 3,
      borderRadius: 4,
    },
    nationText: {
      fontSize: 10,
      fontFamily: "Inter_700Bold",
      fontWeight: "700" as const,
      letterSpacing: 0.6,
    },
    distancePill: {
      backgroundColor: "#FFAD0018",
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 50,
      borderWidth: 1,
      borderColor: "#FFAD0035",
    },
    distanceText: {
      fontSize: 13,
      fontWeight: "700" as const,
      fontFamily: "Inter_700Bold",
      color: "#9A6B00",
    },
    heartBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    heartBtnActive: {
      backgroundColor: "#fef2f2",
    },
    infoRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginBottom: 3,
    },
    infoText: {
      flex: 1,
      fontSize: 13,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    actions: {
      flexDirection: "row",
      gap: 8,
      marginTop: 10,
      paddingTop: 10,
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    actionBtn: {
      width: 36,
      height: 36,
      borderRadius: 9,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
