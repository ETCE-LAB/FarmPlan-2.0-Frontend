import L from 'leaflet';
import type { BaseLayerId } from '@farm/types';

interface TileSource {
  url: string;
  attribution: string;
  maxZoom: number;

  invertInDarkMode: boolean;
}

export const BASE_LAYERS: Record<BaseLayerId, TileSource> = {
  osm: {
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    maxZoom: 19,
    invertInDarkMode: true,
  },
  satellite: {
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    attribution: 'Tiles &copy; Esri — Source: Esri, Maxar, Earthstar Geographics, and the GIS User Community',
    maxZoom: 19,
    invertInDarkMode: false,
  },
  topo: {
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    attribution:
      '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>, SRTM | &copy; <a href="https://opentopomap.org">OpenTopoMap</a> (CC-BY-SA)',
    maxZoom: 17,
    invertInDarkMode: true,
  },
};

const LABELS_OVERLAY = {
  url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}',
  attribution: 'Labels &copy; Esri',
};

export const BASE_LAYER_IDS = Object.keys(BASE_LAYERS) as BaseLayerId[];

export function createBaseLayer(id: BaseLayerId) {
  const { url, attribution, maxZoom, invertInDarkMode } = BASE_LAYERS[id];
  return L.tileLayer(url, { attribution, maxZoom, className: invertInDarkMode ? 'fp-tiles-invertible' : undefined });
}

export function createLabelsOverlay() {
  return L.tileLayer(LABELS_OVERLAY.url, { attribution: LABELS_OVERLAY.attribution, maxZoom: 19, pane: 'overlayPane' });
}
