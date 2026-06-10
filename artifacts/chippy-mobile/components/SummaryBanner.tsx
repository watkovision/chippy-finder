import { Feather } from "@expo/vector-icons";
import React from "react";
import { StyleSheet, Text, View } from "react-native";

import { useColors } from "@/hooks/useColors";

type Summary = {
  totalFound: number;
  searchRadiusMetres: number;
  topRatedCount: number;
  averageDistanceMetres?: number | null;
  nearestName?: string | null;
  nearestDistanceMetres?: number | null;
  funFact: string;
};

function formatDistance(m: number | null | undefined): string {
  if (!m) return "";
  if (m < 1000) return `${Math.round(m)}m`;
  return `${(m / 1000).toFixed(1)}km`;
}

export default function SummaryBanner({ summary }: { summary: Summary }) {
  const colors = useColors();
  const styles = makeStyles(colors);

  return (
    <View style={styles.card} testID="summary-banner">
      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{summary.totalFound}</Text>
          <Text style={styles.statLabel}>chippies nearby</Text>
        </View>
        <View style={styles.divider} />
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{summary.topRatedCount}</Text>
          <Text style={styles.statLabel}>top rated</Text>
        </View>
        {!!summary.averageDistanceMetres && (
          <>
            <View style={styles.divider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatDistance(summary.averageDistanceMetres)}
              </Text>
              <Text style={styles.statLabel}>avg distance</Text>
            </View>
          </>
        )}
      </View>

      {!!summary.nearestName && (
        <View style={styles.nearestRow}>
          <Feather name="star" size={14} color="#FFAD00" />
          <Text style={styles.nearestText} numberOfLines={1}>
            {"Nearest: "}
            <Text style={styles.nearestName}>{summary.nearestName}</Text>
            {summary.nearestDistanceMetres
              ? ` · ${formatDistance(summary.nearestDistanceMetres)}`
              : ""}
          </Text>
        </View>
      )}

      <View style={styles.factRow}>
        <Feather name="info" size={13} color={colors.mutedForeground} style={{ marginTop: 1 }} />
        <Text style={styles.factText}>{summary.funFact}</Text>
      </View>
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    card: {
      backgroundColor: colors.card,
      marginHorizontal: 16,
      marginBottom: 16,
      borderRadius: 14,
      padding: 16,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.07,
      shadowRadius: 6,
      elevation: 2,
      borderWidth: 1,
      borderColor: colors.border,
      gap: 12,
    },
    statsRow: {
      flexDirection: "row",
      alignItems: "center",
    },
    statItem: {
      flex: 1,
      alignItems: "center",
      gap: 2,
    },
    statValue: {
      fontSize: 22,
      fontWeight: "700" as const,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    statLabel: {
      fontSize: 11,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
    },
    divider: {
      width: 1,
      height: 32,
      backgroundColor: colors.border,
    },
    nearestRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#FFAD0015",
      padding: 10,
      borderRadius: 8,
    },
    nearestText: {
      flex: 1,
      fontSize: 13,
      color: colors.foreground,
      fontFamily: "Inter_400Regular",
    },
    nearestName: {
      fontFamily: "Inter_600SemiBold",
      fontWeight: "600" as const,
    },
    factRow: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 6,
    },
    factText: {
      flex: 1,
      fontSize: 12,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      fontStyle: "italic",
      lineHeight: 18,
    },
  });
}
