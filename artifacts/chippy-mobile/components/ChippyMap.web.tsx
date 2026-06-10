import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

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

export default function ChippyMap(_props: {
  coords: { lat: number; lng: number };
  shops: ChipShop[];
  radiusMetres: number;
  favouriteIds?: string[];
}) {
  const colors = useColors();

  return (
    <View style={[styles.container, { backgroundColor: colors.secondary }]}>
      <View style={styles.inner}>
        <Feather name="map" size={40} color={colors.mutedForeground} />
        <Text style={[styles.title, { color: colors.foreground }]}>
          Map view on mobile
        </Text>
        <Text style={[styles.sub, { color: colors.mutedForeground }]}>
          Scan the QR code with Expo Go on your Android or iOS device to see the
          interactive map.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: 12,
    margin: 16,
  },
  inner: {
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 40,
  },
  title: {
    fontSize: 17,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600" as const,
    textAlign: "center",
  },
  sub: {
    fontSize: 14,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    lineHeight: 20,
  },
});
