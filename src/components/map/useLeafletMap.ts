import { useEffect, useState, type RefObject } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useTranslation } from 'react-i18next';
import { useFarmStore } from '@farm/store/useFarmStore';
import { BASE_LAYER_IDS, createBaseLayer, createLabelsOverlay } from './baseLayers';
import type { BaseLayerId } from '@farm/types';

const DEFAULT_CENTER: L.LatLngTuple = [52.2689, 10.5268]; // Braunschweig
const DEFAULT_ZOOM = 14;

export function useLeafletMap(containerRef: RefObject<HTMLDivElement | null>) {
  const { t } = useTranslation();
  const setBaseLayer = useFarmStore((s) => s.setBaseLayer);
  const [map, setMap] = useState<L.Map | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const instance = L.map(containerRef.current, { center: DEFAULT_CENTER, zoom: DEFAULT_ZOOM });
    setMap(instance);
    return () => {
      instance.remove();
      setMap(null);
    };
  }, [containerRef]);

  useEffect(() => {
    if (!map) return;
    const layers = Object.fromEntries(BASE_LAYER_IDS.map((id) => [id, createBaseLayer(id)])) as Record<
      BaseLayerId,
      L.TileLayer
    >;
    const labels = createLabelsOverlay();
    layers[useFarmStore.getState().baseLayer].addTo(map);

    const control = L.control
      .layers(
        Object.fromEntries(BASE_LAYER_IDS.map((id) => [t(`map.layers.${id}`), layers[id]])),
        { [t('map.layers.labels')]: labels },
        { position: 'topright' },
      )
      .addTo(map);

    const onBaseLayerChange = (event: L.LayersControlEvent) => {
      const id = BASE_LAYER_IDS.find((key) => layers[key] === event.layer);
      if (id) setBaseLayer(id);
    };
    map.on('baselayerchange', onBaseLayerChange);

    return () => {
      map.off('baselayerchange', onBaseLayerChange);
      control.remove();
      Object.values(layers).forEach((layer) => layer.remove());
      labels.remove();
    };
  }, [map, t, setBaseLayer]);

  return map;
}
