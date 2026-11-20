import { lazy, Suspense, useId, useMemo, useRef, useState } from 'react';
import { Info, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Button } from '@farm/components/ui/Button';
import type { FarmZonePoint } from '@farm/components/map/FarmZoneMap';
import { HARDINESS_ZONES, hardinessZoneColor, hardinessZoneRangeC } from '@farm/lib/agronomy';
import { useFormat } from '@farm/lib/format';
import { polygonsCenterLatLng } from '@farm/lib/geo';
import { cn } from '@farm/lib/utils';
import { useFarmStore } from '@farm/store/useFarmStore';

// Leaflet stays out of the main bundle: the map loads only when the legend opens with farms to show.
const FarmZoneMap = lazy(() => import('@farm/components/map/FarmZoneMap'));

/** Farms with a known location (boundary, else fields) for the zone map. */
function useFarmZonePoints(): FarmZonePoint[] {
  const farms = useFarmStore((s) => s.farms);
  const fields = useFarmStore((s) => s.fields);
  return useMemo(
    () =>
      farms.flatMap((farm) => {
        const shapes = farm.boundary
          ? [farm.boundary]
          : fields.flatMap((f) => (f.farmId === farm.id && f.geometry ? [f.geometry] : []));
        const center = polygonsCenterLatLng(shapes);
        return center ? [{ id: farm.id, name: farm.name, zone: farm.climateZone, center }] : [];
      }),
    [farms, fields],
  );
}

function ZoneSwatch({ zone }: { zone: string }) {
  return (
    <span
      aria-hidden
      className="inline-block w-3.5 h-3.5 rounded-sm border border-black/10 align-[-2px] mr-2"
      style={{ backgroundColor: hardinessZoneColor(zone) ?? undefined }}
    />
  );
}

/** (i) button that opens a legend of all USDA hardiness zones with their minimum winter temperatures. */
export function HardinessZoneLegend({ selectedZone, className }: { selectedZone?: string; className?: string }) {
  const { t } = useTranslation();
  const format = useFormat();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [isOpen, setIsOpen] = useState(false);
  const farmPoints = useFarmZonePoints();

  const open = () => {
    // Open before rendering the map, so Leaflet measures a visible container.
    dialogRef.current?.showModal();
    setIsOpen(true);
    dialogRef.current
      ?.querySelector<HTMLElement>(`[data-zone="${selectedZone}"]`)
      ?.scrollIntoView?.({ block: 'center' });
  };
  const close = () => dialogRef.current?.close();

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        icon={Info}
        aria-label={t('plants.zoneLegend.open')}
        title={t('plants.zoneLegend.open')}
        aria-haspopup="dialog"
        onClick={open}
        className={className}
      />
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        onClose={() => setIsOpen(false)}
        className="m-auto w-[min(26rem,calc(100vw-2rem))] max-h-[85vh] rounded-md border border-line bg-surface p-0 text-ink shadow-xl backdrop:bg-black/50"
      >
        <div className="flex items-start justify-between gap-3 p-5 pb-3 border-b border-line-subtle">
          <div>
            <h2 id={titleId} className="text-base font-bold">
              {t('plants.zoneLegend.title')}
            </h2>
            <p className="mt-1 text-xs text-ink-soft">{t('plants.zoneLegend.intro')}</p>
          </div>
          <Button variant="ghost" size="icon" icon={X} aria-label={t('common.close')} onClick={close} />
        </div>
        <div className="overflow-y-auto max-h-[60vh]">
          <table className="w-full text-xs">
            <caption className="sr-only">{t('plants.zoneLegend.title')}</caption>
            <thead className="sticky top-0 bg-surface-muted text-ink-muted uppercase tracking-wider">
              <tr>
                <th scope="col" className="py-2 px-5 text-left font-semibold">
                  {t('plants.zoneLegend.zone')}
                </th>
                <th scope="col" className="py-2 px-5 text-right font-semibold">
                  {t('plants.zoneLegend.minTemperature')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line-subtle">
              {HARDINESS_ZONES.map((zone) => {
                const range = hardinessZoneRangeC(zone)!;
                const selected = zone === selectedZone;
                return (
                  <tr
                    key={zone}
                    data-zone={zone}
                    aria-current={selected ? 'true' : undefined}
                    className={cn(selected && 'bg-brand-50 font-semibold text-brand-fg')}
                  >
                    <th scope="row" className="py-1.5 px-5 text-left font-semibold">
                      <ZoneSwatch zone={zone} />
                      {zone}
                      {selected && <span className="sr-only"> ({t('plants.zoneLegend.selected')})</span>}
                    </th>
                    <td className="py-1.5 px-5 text-right tabular-nums">
                      {format.celsius(range.min)} … {format.celsius(range.max)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {isOpen && farmPoints.length > 0 && (
          <div className="px-5 pt-4 border-t border-line-subtle">
            <h3 className="text-xs font-semibold text-ink-soft mb-2">{t('plants.zoneLegend.mapTitle')}</h3>
            <Suspense fallback={<div className="h-56 rounded border border-line bg-surface-muted animate-pulse" />}>
              <FarmZoneMap farms={farmPoints} />
            </Suspense>
            <p className="mt-1 text-[11px] text-ink-muted">{t('plants.zoneLegend.mapHint')}</p>
          </div>
        )}
        <p className="p-5 pt-3 border-t border-line-subtle text-[11px] text-ink-muted">{t('plants.zoneLegend.note')}</p>
      </dialog>
    </>
  );
}
