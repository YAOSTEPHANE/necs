"use client";

import type { GeoPoint } from "@/lib/pointage-shared";

export class PunchGeoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "PunchGeoError";
  }
}

/** Position unique au moment du pointage (pas de suivi continu). */
export function readPunchPosition(): Promise<GeoPoint> {
  if (typeof navigator === "undefined" || !navigator.geolocation) {
    return Promise.reject(
      new PunchGeoError(
        "Ce téléphone ne fournit pas sa position. Pointage impossible.",
      ),
    );
  }
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(
      (pos) =>
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: Number.isFinite(pos.coords.accuracy)
            ? Math.round(pos.coords.accuracy)
            : null,
        }),
      (err) => {
        if (err.code === err.PERMISSION_DENIED) {
          reject(
            new PunchGeoError(
              "Localisation refusée. Autorisez la position pour ce site dans les réglages du navigateur, puis réessayez.",
            ),
          );
        } else if (err.code === err.TIMEOUT) {
          reject(
            new PunchGeoError(
              "Position introuvable à temps. Activez le GPS, rapprochez-vous d’une fenêtre et réessayez.",
            ),
          );
        } else {
          reject(
            new PunchGeoError(
              "Position indisponible. Activez la localisation du téléphone et réessayez.",
            ),
          );
        }
      },
      { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
    );
  });
}

export function mapsUrl(geo: GeoPoint): string {
  return `https://www.google.com/maps/search/?api=1&query=${geo.lat},${geo.lng}`;
}

export function formatAccuracy(geo: GeoPoint): string {
  return geo.accuracy !== null ? `± ${geo.accuracy} m` : "précision inconnue";
}
