import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import { useColors } from "@/hooks/useColors";

function SkeletonPulse({ width, height, style }: {
  width: number | string;
  height: number;
  style?: object;
}) {
  const colors = useColors();
  const opacity = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(opacity, { toValue: 1, duration: 650, useNativeDriver: true }),
        Animated.timing(opacity, { toValue: 0.4, duration: 650, useNativeDriver: true }),
      ]),
    );
    anim.start();
    return () => anim.stop();
  }, [opacity]);

  return (
    <Animated.View
      style={[
        { width, height, borderRadius: 6, backgroundColor: colors.muted, opacity },
        style,
      ]}
    />
  );
}

function SkeletonCard() {
  const colors = useColors();
  return (
    <View style={[cardStyle.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={cardStyle.top}>
        <View style={{ flex: 1, gap: 8 }}>
          <SkeletonPulse width="68%" height={16} />
          <View style={{ flexDirection: "row", gap: 6 }}>
            <SkeletonPulse width={36} height={22} style={{ borderRadius: 4 }} />
            <SkeletonPulse width={52} height={22} style={{ borderRadius: 50 }} />
          </View>
        </View>
        <SkeletonPulse width={52} height={26} style={{ borderRadius: 50 }} />
      </View>
      <SkeletonPulse width="80%" height={12} style={{ marginTop: 8 }} />
      <SkeletonPulse width="55%" height={12} style={{ marginTop: 6 }} />
    </View>
  );
}

const cardStyle = StyleSheet.create({
  card: {
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
  },
  top: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: 12,
  },
});

export default function LoadingSkeletons() {
  return (
    <View style={styles.container}>
      {[0, 1, 2, 3].map((i) => (
        <SkeletonCard key={i} />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingTop: 8,
  },
});
