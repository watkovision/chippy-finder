import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import React from "react";
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from "react-native";

import { useColors } from "@/hooks/useColors";
import type { FavouriteShop } from "@/hooks/useFavourites";

function formatDistance(m: number): string {
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

function hygieneColor(r: number | null | undefined): string {
  if (r === null || r === undefined) return "#9CA3AF";
  if (r >= 4) return "#16a34a";
  if (r >= 2) return "#d97706";
  return "#dc2626";
}

function FavCard({
  shop,
  onRemove,
}: {
  shop: FavouriteShop;
  onRemove: () => void;
}) {
  const colors = useColors();
  const styles = makeCardStyles(colors);

  return (
    <View style={styles.card}>
      <TouchableOpacity
        style={styles.removeBtn}
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          onRemove();
        }}
        testID={`button-unfav-${shop.id}`}
        hitSlop={8}
      >
        <MaterialCommunityIcons name="heart" size={14} color="#ef4444" />
      </TouchableOpacity>

      <Text style={styles.name} numberOfLines={3}>
        {shop.name}
      </Text>

      <View style={styles.foot}>
        <Text style={styles.dist}>{formatDistance(shop.distanceMetres)}</Text>
        {shop.hygieneRating !== null && shop.hygieneRating !== undefined && (
          <View
            style={[
              styles.ratingPill,
              { backgroundColor: hygieneColor(shop.hygieneRating) },
            ]}
          >
            <Text style={styles.ratingText}>{shop.hygieneRating}/5</Text>
          </View>
        )}
      </View>

      {!!(shop.address || shop.postcode) && (
        <Text style={styles.addr} numberOfLines={1}>
          {[shop.address, shop.postcode].filter(Boolean).join(", ")}
        </Text>
      )}
    </View>
  );
}

function makeCardStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    card: {
      width: 148,
      backgroundColor: colors.card,
      borderRadius: 12,
      padding: 12,
      borderWidth: 1,
      borderColor: "#ef444420",
      gap: 4,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 4,
      elevation: 2,
    },
    removeBtn: {
      alignSelf: "flex-end",
      marginBottom: 2,
    },
    name: {
      fontSize: 13,
      fontFamily: "Inter_600SemiBold",
      fontWeight: "600" as const,
      color: colors.foreground,
      lineHeight: 18,
      flex: 1,
    },
    foot: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      marginTop: 4,
    },
    dist: {
      fontSize: 12,
      fontFamily: "Inter_700Bold",
      fontWeight: "700" as const,
      color: "#9A6B00",
    },
    ratingPill: {
      paddingHorizontal: 6,
      paddingVertical: 2,
      borderRadius: 50,
    },
    ratingText: {
      fontSize: 10,
      fontFamily: "Inter_600SemiBold",
      fontWeight: "600" as const,
      color: "#FFF",
    },
    addr: {
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
      marginTop: 2,
    },
  });
}

export default function FavouritesRail({
  favourites,
  onRemove,
}: {
  favourites: FavouriteShop[];
  onRemove: (id: string) => void;
}) {
  const colors = useColors();

  if (favourites.length === 0) return null;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="heart" size={14} color="#ef4444" />
        <Text style={[styles.sectionLabel, { color: colors.mutedForeground }]}>
          Saved chippies
        </Text>
        <Text style={[styles.count, { color: colors.mutedForeground }]}>
          {favourites.length}
        </Text>
      </View>
      <FlatList
        horizontal
        data={favourites}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <FavCard shop={item} onRemove={() => onRemove(item.id)} />
        )}
        contentContainerStyle={styles.rail}
        showsHorizontalScrollIndicator={false}
        ItemSeparatorComponent={() => <View style={{ width: 10 }} />}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  sectionLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600" as const,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    flex: 1,
  },
  count: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
  },
  rail: {
    paddingHorizontal: 16,
    paddingBottom: 4,
  },
});
