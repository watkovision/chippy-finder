import { useState, useEffect, useCallback } from "react";

interface GeolocationState {
  lat: number | null;
  lng: number | null;
  error: string | null;
  loading: boolean;
  permissionStatus: PermissionState | null;
}

export function useGeolocation() {
  const [state, setState] = useState<GeolocationState>({
    lat: null,
    lng: null,
    error: null,
    loading: false,
    permissionStatus: null,
  });

  const checkPermission = useCallback(async () => {
    if (!navigator.permissions) return;
    try {
      const result = await navigator.permissions.query({ name: "geolocation" });
      setState((prev) => ({ ...prev, permissionStatus: result.state }));
      result.onchange = () => {
        setState((prev) => ({ ...prev, permissionStatus: result.state }));
      };
    } catch (e) {
      // Ignore errors for unsupported browsers
    }
  }, []);

  useEffect(() => {
    checkPermission();
  }, [checkPermission]);

  const requestLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setState((prev) => ({
        ...prev,
        error: "Geolocation is not supported by your browser.",
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setState((prev) => ({
          ...prev,
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          loading: false,
          error: null,
        }));
      },
      (error) => {
        let errorMsg = "Unable to get your location.";
        if (error.code === error.PERMISSION_DENIED) {
          errorMsg = "Location permission was denied.";
        } else if (error.code === error.POSITION_UNAVAILABLE) {
          errorMsg = "Location information is unavailable.";
        } else if (error.code === error.TIMEOUT) {
          errorMsg = "The request to get user location timed out.";
        }
        
        setState((prev) => ({
          ...prev,
          loading: false,
          error: errorMsg,
        }));
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  }, []);

  return { ...state, requestLocation };
}
