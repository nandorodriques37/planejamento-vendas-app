import type { SavedAdjustment } from "./forecastEngine";
import { computeDerivedState } from "./forecastEngine";

self.onmessage = (e: MessageEvent<{ savedAdjustments: SavedAdjustment[] }>) => {
    const { savedAdjustments } = e.data;
    const result = computeDerivedState(savedAdjustments);
    self.postMessage(result);
};
