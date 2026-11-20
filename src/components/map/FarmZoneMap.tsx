import { useEffect, useRef } from 'react';
import L from 'leaflet';
import { useTranslation } from 'react-i18next';
import { hardinessZoneColor } from '@farm/lib/agronomy';
import type { LatLngTuple } from '@farm/lib/geo';
import { popupElement } from './mapPopup';
import { useLeafletMap } from './useLeafletMap';

export interface FarmZonePoint {
  id: string;
  name: string;
  /** Hardiness zone from the farm's master data; null if not set. */
  zone: string | null;
  center: LatLngTuple;
}

const UNKNOWN_COLOR = '#94a3b8';

/** Small map of the user's farms, each marked in the colour of its hardiness zone. Lazy-loaded. */
export default function FarmZoneMap({ farms }: { farms: FarmZonePoint[] }) {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const map = useLeafletMap(containerRef);

  useEffect(() => {
    if (!map) return;
    const group = L.featureGroup().addTo(map);
    for (const farm of farms) {
      const color = (farm.zone && hardinessZoneColor(farm.zone)) || UNKNOWN_COLOR;
      L.circleMarker(farm.center, { radius: 9, color: '#ffffff', weight: 2, fillColor: color, fillOpacity: 0.95 })
        .bindTooltip(
          popupElement([
            farm.name,
            farm.zone ? t('plants.zoneLegend.farmZone', { zone: farm.zone }) : t('plants.zoneLegend.noZone'),
          ]),
        )
        .addTo(group);
    }
    if (farms.length > 0) map.fitBounds(group.getBounds(), { padding: [30, 30], maxZoom: 8 });
    return () => {
      group.remove();
    };
  }, [map, farms, t]);

  return (
    <section
      ref={containerRef}
      aria-label={t('plants.zoneLegend.mapLabel')}
      className="w-full h-56 rounded border border-line z-0"
    />
  );
}
