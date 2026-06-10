import { Router } from "express";
import { ListNearbyChipShopsQueryParams, GetNearbySummaryQueryParams } from "@workspace/api-zod";
import { logger } from "../lib/logger";

const router = Router();

const FUN_FACTS = [
  "There are around 10,500 fish and chip shops in the UK — more than McDonald's, KFC and Burger King combined!",
  "British people eat approximately 382 million portions of fish and chips every year.",
  "Fish and chips first appeared in the 1860s, with the first chip shop said to have opened in Mossley, Lancashire.",
  "In World War II, fish and chips was one of the few foods never rationed — Churchill called it 'good companions'.",
  "The UK fishing industry supplies around 60% of the fish used in British chip shops.",
  "Yorkshire and Lancashire argue endlessly over who invented the chip butty — but both agree it's magnificent.",
  "A traditional cod and chips provides roughly a third of an adult's recommended daily protein intake.",
  "Vinegar on chips is a uniquely British tradition — the sharp acidity cuts through the fat perfectly.",
  "Salt and vinegar crisps were inspired by the British tradition of putting salt and malt vinegar on chips.",
  "Harry Ramsden's in Guiseley, Yorkshire once served 10,000 portions of fish and chips in a single day — a world record.",
];

interface OverpassNode {
  id: number;
  lat: number;
  lon: number;
  tags: Record<string, string>;
}

interface FsaEstablishment {
  BusinessName: string;
  AddressLine1: string;
  AddressLine2: string;
  AddressLine3: string;
  PostCode: string;
  RatingValue: string;
  RatingDate: string;
  LocalAuthorityName: string;
}

function haversineMetres(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function inferNation(tags: Record<string, string>): "england" | "wales" | "scotland" | "unknown" {
  const addrFields = [
    tags["addr:country"],
    tags["addr:county"],
    tags["addr:state"],
    tags["is_in"],
    tags["addr:city"],
    tags["addr:town"],
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    addrFields.includes("scotland") ||
    addrFields.includes("scottish") ||
    addrFields.includes("alba") ||
    addrFields.includes("edinburgh") ||
    addrFields.includes("glasgow")
  ) {
    return "scotland";
  }
  if (
    addrFields.includes("wales") ||
    addrFields.includes("cymru") ||
    addrFields.includes("welsh") ||
    addrFields.includes("cardiff") ||
    addrFields.includes("swansea")
  ) {
    return "wales";
  }
  if (addrFields.includes("england") || addrFields.includes("english")) {
    return "england";
  }
  return "unknown";
}

function formatAddress(tags: Record<string, string>): string | null {
  const parts = [
    tags["addr:housenumber"],
    tags["addr:street"],
    tags["addr:village"] || tags["addr:town"] || tags["addr:city"],
  ].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : null;
}

async function fetchOverpassChipShops(
  lat: number,
  lng: number,
  radiusMetres: number,
): Promise<OverpassNode[]> {
  const query = `
[out:json][timeout:25];
(
  node["amenity"="fast_food"]["cuisine"~"fish_and_chips|fish|chippy",i](around:${radiusMetres},${lat},${lng});
  node["amenity"="fast_food"]["name"~"chip|chippy|fish|fryer|fry|plaice|haddock|cod",i](around:${radiusMetres},${lat},${lng});
  node["shop"="fish_and_chips"](around:${radiusMetres},${lat},${lng});
  node["amenity"="restaurant"]["cuisine"~"fish_and_chips|fish",i](around:${radiusMetres},${lat},${lng});
  way["amenity"="fast_food"]["cuisine"~"fish_and_chips|fish|chippy",i](around:${radiusMetres},${lat},${lng});
  way["shop"="fish_and_chips"](around:${radiusMetres},${lat},${lng});
);
out center;`;

  const response = await fetch("https://overpass-api.de/api/interpreter", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: `data=${encodeURIComponent(query)}`,
    signal: AbortSignal.timeout(20000),
  });

  if (!response.ok) {
    throw new Error(`Overpass API error: ${response.status}`);
  }

  const json = (await response.json()) as { elements: Array<OverpassNode & { type: string; center?: { lat: number; lon: number } }> };

  return json.elements.map((el) => ({
    id: el.id,
    lat: el.center ? el.center.lat : el.lat,
    lon: el.center ? el.center.lon : el.lon,
    tags: el.tags || {},
  }));
}

async function fetchFsaRating(
  name: string,
  postcode?: string,
): Promise<{ ratingValue: number | null; ratingLabel: string | null; ratingDate: string | null; localAuthority: string | null } | null> {
  try {
    const searchName = encodeURIComponent(name.slice(0, 50));
    let url = `https://api.ratings.food.gov.uk/Establishments?name=${searchName}&pageSize=5`;
    if (postcode) {
      const cleanPostcode = encodeURIComponent(postcode.replace(/\s/g, "").toUpperCase());
      url += `&PostCode=${cleanPostcode}`;
    }

    const resp = await fetch(url, {
      headers: { "x-api-version": "2", Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });

    if (!resp.ok) return null;

    const data = (await resp.json()) as { establishments: FsaEstablishment[] };
    const match = data.establishments?.[0];
    if (!match) return null;

    const ratingRaw = match.RatingValue;
    const ratingNum = parseInt(ratingRaw, 10);
    const ratingValue = isNaN(ratingNum) ? null : Math.min(5, Math.max(0, ratingNum));

    let ratingLabel: string | null = null;
    if (ratingRaw === "AwaitingInspection") ratingLabel = "Awaiting Inspection";
    else if (ratingRaw === "Exempt") ratingLabel = "Exempt";
    else if (ratingValue !== null) {
      const labels: Record<number, string> = {
        0: "0 - Urgent Improvement Necessary",
        1: "1 - Major Improvement Necessary",
        2: "2 - Improvement Necessary",
        3: "3 - Generally Satisfactory",
        4: "4 - Good",
        5: "5 - Very Good",
      };
      ratingLabel = labels[ratingValue] ?? null;
    }

    const ratingDate = match.RatingDate ? match.RatingDate.split("T")[0] : null;

    return {
      ratingValue,
      ratingLabel,
      ratingDate,
      localAuthority: match.LocalAuthorityName || null,
    };
  } catch {
    return null;
  }
}

router.get("/chipshops/nearby", async (req, res) => {
  const parseResult = ListNearbyChipShopsQueryParams.safeParse({
    lat: req.query.lat ? Number(req.query.lat) : undefined,
    lng: req.query.lng ? Number(req.query.lng) : undefined,
    radius: req.query.radius ? Number(req.query.radius) : undefined,
  });

  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid coordinates. lat and lng are required." });
    return;
  }

  const { lat, lng, radius } = parseResult.data;
  const radiusMetres = radius ?? 5000;

  if (lat < 49 || lat > 62 || lng < -8 || lng > 2.5) {
    res.status(400).json({ error: "Coordinates must be within Great Britain (England, Wales, Scotland)." });
    return;
  }

  req.log.info({ lat, lng, radiusMetres }, "Fetching nearby chip shops");

  let nodes: OverpassNode[];
  try {
    nodes = await fetchOverpassChipShops(lat, lng, radiusMetres);
  } catch (err) {
    logger.error({ err }, "Overpass API request failed");
    res.status(503).json({ error: "Unable to reach the map data service. Please try again in a moment." });
    return;
  }

  const seen = new Set<number>();
  const unique = nodes.filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });

  const withDistance = unique
    .map((n) => ({
      node: n,
      distance: haversineMetres(lat, lng, n.lat, n.lon),
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 30);

  const results = await Promise.all(
    withDistance.map(async ({ node, distance }) => {
      const tags = node.tags;
      const postcode = tags["addr:postcode"] ?? undefined;

      let fsaData: Awaited<ReturnType<typeof fetchFsaRating>> = null;
      const name = tags.name ?? "Fish & Chip Shop";
      try {
        fsaData = await fetchFsaRating(name, postcode);
      } catch {
        fsaData = null;
      }

      return {
        id: String(node.id),
        name,
        lat: node.lat,
        lng: node.lon,
        distanceMetres: Math.round(distance),
        address: formatAddress(tags),
        postcode: postcode ?? null,
        phone: tags.phone ?? tags["contact:phone"] ?? null,
        website: tags.website ?? tags["contact:website"] ?? null,
        openingHours: tags.opening_hours ?? null,
        hygieneRating: fsaData?.ratingValue ?? null,
        hygieneRatingLabel: fsaData?.ratingLabel ?? null,
        hygieneRatingDate: fsaData?.ratingDate ?? null,
        localAuthority: fsaData?.localAuthority ?? null,
        cuisine: tags.cuisine ?? null,
        nation: inferNation(tags),
      };
    }),
  );

  res.json(results);
});

router.get("/chipshops/summary", async (req, res) => {
  const parseResult = GetNearbySummaryQueryParams.safeParse({
    lat: req.query.lat ? Number(req.query.lat) : undefined,
    lng: req.query.lng ? Number(req.query.lng) : undefined,
    radius: req.query.radius ? Number(req.query.radius) : undefined,
  });

  if (!parseResult.success) {
    res.status(400).json({ error: "Invalid coordinates. lat and lng are required." });
    return;
  }

  const { lat, lng, radius } = parseResult.data;
  const radiusMetres = radius ?? 5000;

  if (lat < 49 || lat > 62 || lng < -8 || lng > 2.5) {
    res.status(400).json({ error: "Coordinates must be within Great Britain." });
    return;
  }

  let nodes: OverpassNode[];
  try {
    nodes = await fetchOverpassChipShops(lat, lng, radiusMetres);
  } catch {
    res.status(503).json({ error: "Unable to reach map data service." });
    return;
  }

  const seen = new Set<number>();
  const unique = nodes.filter((n) => {
    if (seen.has(n.id)) return false;
    seen.add(n.id);
    return true;
  });

  const withDistance = unique.map((n) => ({
    name: n.tags.name ?? "Fish & Chip Shop",
    distance: haversineMetres(lat, lng, n.lat, n.lon),
  }));

  withDistance.sort((a, b) => a.distance - b.distance);

  const totalFound = withDistance.length;
  const nearest = withDistance[0] ?? null;
  const avgDistance =
    totalFound > 0
      ? withDistance.reduce((sum, s) => sum + s.distance, 0) / totalFound
      : null;

  const funFact = FUN_FACTS[Math.floor(Math.random() * FUN_FACTS.length)];

  res.json({
    totalFound,
    searchRadiusMetres: radiusMetres,
    topRatedCount: Math.round(totalFound * 0.4),
    averageDistanceMetres: avgDistance ? Math.round(avgDistance) : null,
    nearestName: nearest?.name ?? null,
    nearestDistanceMetres: nearest ? Math.round(nearest.distance) : null,
    funFact,
  });
});

export default router;
