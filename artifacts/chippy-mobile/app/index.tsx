import { Feather, MaterialCommunityIcons } from "@expo/vector-icons";
import {
  getGetNearbySummaryQueryKey,
  getListNearbyChipShopsQueryKey,
  useGetNearbySummary,
  useListNearbyChipShops,
} from "@workspace/api-client-react";
import * as Haptics from "expo-haptics";
import * as Location from "expo-location";
import React, { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import ChippyMap from "@/components/ChippyMap";
import FavouritesRail from "@/components/FavouritesRail";
import LoadingSkeletons from "@/components/LoadingSkeletons";
import ShopCard from "@/components/ShopCard";
import SummaryBanner from "@/components/SummaryBanner";
import { useColors } from "@/hooks/useColors";
import { useFavourites } from "@/hooks/useFavourites";

const RADIUS_OPTIONS = [
  { label: "1km", value: 1000 },
  { label: "2km", value: 2000 },
  { label: "5km", value: 5000 },
  { label: "10km", value: 10000 },
];

type Coords = { lat: number; lng: number };
type ViewMode = "list" | "map";

export default function HomeScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const { favourites, favouriteIds, isFavourite, toggleFavourite, loaded: favsLoaded } = useFavourites();

  const [coords, setCoords] = useState<Coords | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);
  const [locationError, setLocationError] = useState<"denied" | "error" | null>(null);
  const [radiusMetres, setRadiusMetres] = useState(5000);
  const [refreshing, setRefreshing] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [postcodeInput, setPostcodeInput] = useState("");
  const [postcodeLoading, setPostcodeLoading] = useState(false);
  const [postcodeError, setPostcodeError] = useState<string | null>(null);

  const [, requestPermission] = Location.useForegroundPermissions();

  const apiParams = coords
    ? { lat: coords.lat, lng: coords.lng, radius: radiusMetres }
    : undefined;

  const {
    data: shops,
    isLoading: shopsLoading,
    error: shopsError,
    refetch: refetchShops,
  } = useListNearbyChipShops(apiParams, {
    query: {
      enabled: !!coords,
      queryKey: getListNearbyChipShopsQueryKey(apiParams),
    },
  });

  const {
    data: summary,
    isLoading: summaryLoading,
    refetch: refetchSummary,
  } = useGetNearbySummary(apiParams, {
    query: {
      enabled: !!coords,
      queryKey: getGetNearbySummaryQueryKey(apiParams),
    },
  });

  const fetchLocation = useCallback(async () => {
    setLocationLoading(true);
    setLocationError(null);
    try {
      if (Platform.OS === "web") {
        await new Promise<void>((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
              resolve();
            },
            () => reject(new Error("location_error")),
            { timeout: 12000 },
          );
        });
      } else {
        const { status } = await requestPermission();
        if (status !== "granted") {
          setLocationError("denied");
          return;
        }
        const loc = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.Balanced,
        });
        setCoords({ lat: loc.coords.latitude, lng: loc.coords.longitude });
      }
    } catch {
      setLocationError("error");
    } finally {
      setLocationLoading(false);
    }
  }, [requestPermission]);

  const geocodePostcode = useCallback(async (query: string) => {
    setPostcodeLoading(true);
    setPostcodeError(null);
    try {
      const encoded = encodeURIComponent(query.trim());
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encoded}&format=json&limit=1&countrycodes=gb`,
        { headers: { "User-Agent": "ChippyFinder/1.0" } },
      );
      const data = await res.json();
      if (!data.length) {
        setPostcodeError("Postcode not found — try a town name instead");
        return;
      }
      setCoords({ lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) });
    } catch {
      setPostcodeError("Couldn't look up that location — check your connection");
    } finally {
      setPostcodeLoading(false);
    }
  }, []);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await Promise.all([refetchShops(), refetchSummary()]);
    setRefreshing(false);
  }, [refetchShops, refetchSummary]);

  const onRadiusChange = (r: number) => {
    Haptics.selectionAsync();
    setRadiusMetres(r);
  };

  const onToggleView = (mode: ViewMode) => {
    Haptics.selectionAsync();
    setViewMode(mode);
  };

  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const styles = makeStyles(colors);

  // ── Welcome ─────────────────────────────────────────────────────────────────
  if (!coords && !locationLoading) {
    return (
      <View style={[styles.container, { paddingTop: topPad }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View style={styles.welcome}>
          <View style={styles.iconWrap}>
            <MaterialCommunityIcons name="fish" size={52} color={colors.primary} />
          </View>
          <Text style={styles.welcomeTitle}>Hungry for chips?</Text>
          <Text style={styles.welcomeSub}>
            Find the nearest fish &amp; chip shop in England, Wales and Scotland — with official hygiene ratings.
          </Text>

          {locationError === "denied" && (
            <View style={styles.errorBox}>
              <Feather name="lock" size={14} color={colors.destructive} />
              <Text style={styles.errorMsg}>Location blocked — use postcode below.</Text>
              {Platform.OS !== "web" && (
                <TouchableOpacity onPress={() => Linking.openSettings()} testID="button-open-settings">
                  <Text style={styles.errorLink}>Open Settings</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
          {locationError === "error" && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={14} color={colors.destructive} />
              <Text style={styles.errorMsg}>Location unavailable — use postcode below.</Text>
            </View>
          )}

          {/* Show saved chippies count on welcome screen if any */}
          {favsLoaded && favourites.length > 0 && (
            <View style={styles.favHint}>
              <MaterialCommunityIcons name="heart" size={13} color="#ef4444" />
              <Text style={styles.favHintText}>
                {favourites.length} saved chippy{favourites.length !== 1 ? "s" : ""}
              </Text>
            </View>
          )}

          <Pressable
            style={({ pressed }) => [styles.mainBtn, pressed && { opacity: 0.85 }]}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              fetchLocation();
            }}
            testID="button-find-chippy"
          >
            <Feather name="map-pin" size={17} color="#1A1A1A" />
            <Text style={styles.mainBtnText}>Use my location</Text>
          </Pressable>

          {/* Postcode / town fallback */}
          <View style={styles.orRow}>
            <View style={styles.orLine} />
            <Text style={styles.orText}>or</Text>
            <View style={styles.orLine} />
          </View>

          <View style={styles.postcodeRow}>
            <TextInput
              style={[styles.postcodeInput, { color: colors.foreground, borderColor: colors.border }]}
              placeholder="Postcode or town…"
              placeholderTextColor={colors.mutedForeground}
              value={postcodeInput}
              onChangeText={(t) => { setPostcodeInput(t); setPostcodeError(null); }}
              autoCapitalize="characters"
              returnKeyType="search"
              onSubmitEditing={() => { if (postcodeInput.trim()) geocodePostcode(postcodeInput); }}
              testID="input-postcode"
            />
            <TouchableOpacity
              style={[
                styles.postcodeBtn,
                { backgroundColor: postcodeInput.trim() ? colors.primary : colors.secondary },
              ]}
              onPress={() => { if (postcodeInput.trim()) geocodePostcode(postcodeInput); }}
              disabled={!postcodeInput.trim() || postcodeLoading}
              testID="button-postcode-search"
            >
              {postcodeLoading
                ? <ActivityIndicator size="small" color="#1A1A1A" />
                : <Feather name="search" size={16} color={postcodeInput.trim() ? "#1A1A1A" : colors.mutedForeground} />
              }
            </TouchableOpacity>
          </View>

          {!!postcodeError && (
            <View style={styles.errorBox}>
              <Feather name="alert-circle" size={13} color={colors.destructive} />
              <Text style={styles.errorMsg}>{postcodeError}</Text>
            </View>
          )}
        </View>
      </View>
    );
  }

  // ── Locating ────────────────────────────────────────────────────────────────
  if (locationLoading) {
    return (
      <View style={[styles.container, styles.centered, { paddingTop: topPad }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.welcomeSub, { marginTop: 16, textAlign: "center" }]}>
          Finding you...
        </Text>
      </View>
    );
  }

  // ── Shared header ────────────────────────────────────────────────────────────
  const AppBar = (
    <View style={[styles.appBar, { paddingTop: topPad + 12 }]}>
      <TouchableOpacity
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          setCoords(null);
          setPostcodeInput("");
          setPostcodeError(null);
          setLocationError(null);
        }}
        style={styles.backBtn}
        testID="button-back-to-search"
      >
        <Feather name="arrow-left" size={18} color={colors.foreground} />
      </TouchableOpacity>

      <View style={styles.viewToggle}>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === "list" && styles.toggleBtnActive]}
          onPress={() => onToggleView("list")}
          testID="button-view-list"
        >
          <Feather name="list" size={16} color={viewMode === "list" ? "#1A1A1A" : colors.mutedForeground} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.toggleBtn, viewMode === "map" && styles.toggleBtnActive]}
          onPress={() => onToggleView("map")}
          testID="button-view-map"
        >
          <Feather name="map" size={16} color={viewMode === "map" ? "#1A1A1A" : colors.mutedForeground} />
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        onPress={fetchLocation}
        style={styles.locBtn}
        testID="button-refresh-location"
      >
        <Feather name="map-pin" size={17} color={colors.mutedForeground} />
      </TouchableOpacity>
    </View>
  );

  const RadiusRow = (
    <View style={styles.radiusRow}>
      {RADIUS_OPTIONS.map((opt) => (
        <TouchableOpacity
          key={opt.value}
          style={[styles.radiusChip, radiusMetres === opt.value && { backgroundColor: colors.primary }]}
          onPress={() => onRadiusChange(opt.value)}
          testID={`button-radius-${opt.value}`}
        >
          <Text
            style={[
              styles.radiusChipText,
              radiusMetres === opt.value && styles.radiusChipTextActive,
            ]}
          >
            {opt.label}
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );

  const isDataLoading = shopsLoading || summaryLoading;

  // ── Loading skeleton ─────────────────────────────────────────────────────────
  if (isDataLoading) {
    return (
      <View style={[styles.container, { paddingBottom: Platform.OS === "web" ? 34 : 0 }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        {AppBar}
        <LoadingSkeletons />
      </View>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────────
  if (shopsError) {
    return (
      <View style={[styles.container, { paddingTop: topPad, paddingBottom: Platform.OS === "web" ? 34 : 0 }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        <View style={styles.centered}>
          <Feather name="wifi-off" size={40} color={colors.mutedForeground} />
          <Text style={styles.errorTitle}>Couldn't load chip shops</Text>
          <Text style={styles.errorSub}>Check your connection and try again.</Text>
          <Pressable
            style={({ pressed }) => [styles.mainBtn, { marginTop: 20 }, pressed && { opacity: 0.85 }]}
            onPress={() => refetchShops()}
            testID="button-retry"
          >
            <Text style={styles.mainBtnText}>Try again</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // ── Map view ─────────────────────────────────────────────────────────────────
  if (viewMode === "map") {
    return (
      <View style={[styles.container, { paddingBottom: Platform.OS === "web" ? 34 : 0 }]}>
        <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
        {AppBar}
        {RadiusRow}
        <ChippyMap
          coords={coords!}
          shops={shops ?? []}
          radiusMetres={radiusMetres}
          favouriteIds={favouriteIds}
        />
      </View>
    );
  }

  // ── List view ────────────────────────────────────────────────────────────────
  const ListHeader = (
    <View>
      {favsLoaded && favourites.length > 0 && (
        <FavouritesRail
          favourites={favourites}
          onRemove={(id) => {
            const shop = favourites.find((f) => f.id === id);
            if (shop) toggleFavourite(shop);
          }}
        />
      )}
      {!!summary && <SummaryBanner summary={summary} />}
      {!!shops && shops.length > 0 && (
        <Text style={styles.sectionLabel}>
          {shops.length} chip shop{shops.length !== 1 ? "s" : ""} nearby
        </Text>
      )}
    </View>
  );

  return (
    <View style={[styles.container, { paddingBottom: Platform.OS === "web" ? 34 : 0 }]}>
      <StatusBar barStyle="dark-content" backgroundColor={colors.background} />
      <FlatList
        data={shops ?? []}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ShopCard
            shop={item}
            isFavourite={isFavourite(item.id)}
            onToggleFavourite={toggleFavourite}
          />
        )}
        ListHeaderComponent={
          <>
            {AppBar}
            {RadiusRow}
            {ListHeader}
          </>
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Feather name="search" size={36} color={colors.mutedForeground} />
            <Text style={styles.emptyTitle}>No chip shops found</Text>
            <Text style={styles.emptySub}>Try increasing the search radius</Text>
          </View>
        }
        contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

function makeStyles(colors: ReturnType<typeof useColors>) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    centered: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 32,
    },
    welcome: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      paddingHorizontal: 36,
      gap: 14,
    },
    iconWrap: {
      width: 100,
      height: 100,
      borderRadius: 24,
      backgroundColor: colors.card,
      alignItems: "center",
      justifyContent: "center",
      marginBottom: 6,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.09,
      shadowRadius: 10,
      elevation: 3,
    },
    welcomeTitle: {
      fontSize: 28,
      fontWeight: "700" as const,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
      textAlign: "center",
    },
    welcomeSub: {
      fontSize: 15,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      textAlign: "center",
      lineHeight: 22,
    },
    favHint: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      backgroundColor: "#fef2f2",
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 50,
    },
    favHintText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: "#b91c1c",
    },
    mainBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      backgroundColor: colors.primary,
      paddingHorizontal: 26,
      paddingVertical: 15,
      borderRadius: 50,
      marginTop: 8,
      shadowColor: colors.primary,
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.35,
      shadowRadius: 10,
      elevation: 5,
    },
    mainBtnText: {
      fontSize: 16,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
      color: "#1A1A1A",
    },
    errorBox: {
      flexDirection: "row",
      alignItems: "center",
      gap: 6,
      backgroundColor: "#FEF2F2",
      paddingHorizontal: 14,
      paddingVertical: 10,
      borderRadius: 10,
    },
    errorMsg: {
      fontSize: 13,
      color: colors.destructive,
      fontFamily: "Inter_400Regular",
    },
    errorLink: {
      fontSize: 13,
      color: colors.destructive,
      fontFamily: "Inter_600SemiBold",
      textDecorationLine: "underline",
    },
    appBar: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "center",
      paddingHorizontal: 20,
      paddingBottom: 14,
      backgroundColor: colors.background,
    },
    appBarLeft: {
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
    },
    appBarTitle: {
      fontSize: 20,
      fontWeight: "700" as const,
      fontFamily: "Inter_700Bold",
      color: colors.foreground,
    },
    viewToggle: {
      flexDirection: "row",
      backgroundColor: colors.secondary,
      borderRadius: 10,
      padding: 3,
      gap: 2,
    },
    toggleBtn: {
      width: 32,
      height: 32,
      borderRadius: 8,
      alignItems: "center",
      justifyContent: "center",
    },
    toggleBtnActive: {
      backgroundColor: colors.primary,
    },
    locBtn: {
      width: 36,
      height: 36,
      borderRadius: 9,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    backBtn: {
      width: 36,
      height: 36,
      borderRadius: 9,
      backgroundColor: colors.secondary,
      alignItems: "center",
      justifyContent: "center",
    },
    radiusRow: {
      flexDirection: "row",
      paddingHorizontal: 16,
      gap: 8,
      marginBottom: 16,
    },
    radiusChip: {
      paddingHorizontal: 14,
      paddingVertical: 7,
      borderRadius: 50,
      backgroundColor: colors.secondary,
    },
    radiusChipText: {
      fontSize: 13,
      fontFamily: "Inter_500Medium",
      color: colors.mutedForeground,
    },
    radiusChipTextActive: {
      color: "#1A1A1A",
      fontFamily: "Inter_700Bold",
      fontWeight: "700" as const,
    },
    sectionLabel: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      fontWeight: "600" as const,
      color: colors.mutedForeground,
      textTransform: "uppercase",
      letterSpacing: 0.8,
      paddingHorizontal: 20,
      paddingBottom: 10,
    },
    errorTitle: {
      fontSize: 17,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
      marginTop: 14,
    },
    errorSub: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
      marginTop: 6,
      textAlign: "center",
    },
    emptyState: {
      alignItems: "center",
      paddingTop: 48,
      gap: 8,
    },
    emptyTitle: {
      fontSize: 17,
      fontWeight: "600" as const,
      fontFamily: "Inter_600SemiBold",
      color: colors.foreground,
    },
    emptySub: {
      fontSize: 14,
      color: colors.mutedForeground,
      fontFamily: "Inter_400Regular",
    },
    orRow: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      width: "100%",
    },
    orLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.border,
    },
    orText: {
      fontSize: 13,
      fontFamily: "Inter_400Regular",
      color: colors.mutedForeground,
    },
    postcodeRow: {
      flexDirection: "row",
      width: "100%",
      gap: 8,
    },
    postcodeInput: {
      flex: 1,
      height: 48,
      borderWidth: 1.5,
      borderRadius: 12,
      paddingHorizontal: 14,
      fontSize: 15,
      fontFamily: "Inter_400Regular",
      backgroundColor: colors.card,
    },
    postcodeBtn: {
      width: 48,
      height: 48,
      borderRadius: 12,
      alignItems: "center",
      justifyContent: "center",
    },
  });
}
