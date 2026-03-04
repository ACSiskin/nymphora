import { useState, useCallback, useEffect } from "react";
import { FlyToInterpolator } from "@deck.gl/core";

export function useCameraFocus(initialViewState: any) {
  const [viewState, setViewState] = useState(initialViewState);

  const goToNode = useCallback((nodeId: string, nodes: any[]) => {
    const target = nodes.find((n) => n.id === nodeId);
    if (!target) return;

    const [lon, lat, alt] = target.position;

    setViewState((prev: any) => ({
      ...prev,
      longitude: lon,
      latitude: lat,
      zoom: 10, // Zbliżenie taktyczne
      pitch: 60, // Kąt patrzenia z góry
      bearing: (prev.bearing + 45) % 360, // Lekki obrót dla efektu 3D
      transitionDuration: 2000, // Czas lotu (2s)
      transitionInterpolator: new FlyToInterpolator(),
      transitionEasing: (t: number) => t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t // Ease-in-out
    }));
  }, []);

  return { viewState, setViewState, goToNode };
}
