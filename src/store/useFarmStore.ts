import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { DEMO_USER } from '@farm/data/mockData';
import { polygonAreaM2 } from '@farm/lib/geo';
import type { BaseLayerId, Farm, Field, Language, ThemePreference, User } from '@farm/types';
import {
  STORE_VERSION,
  initialPersistedState,
  migratePersistedState,
  type PersistedFarmState,
} from '@farm/store/migrations';

type FarmPatch = Partial<Pick<Farm, 'name' | 'location' | 'climateZone' | 'notes' | 'boundary'>>;
type FieldPatch = Partial<Pick<Field, 'name' | 'soilType' | 'soilPh' | 'geometry' | 'excludedZones'>>;

export type DataSnapshot = Pick<PersistedFarmState, 'farms' | 'fields' | 'plans' | 'activeFarmId'>;

interface FarmStoreState extends PersistedFarmState {
  currentUser: User;

  addFarm: (farm: Farm, fields: Field[]) => void;
  updateFarm: (id: string, patch: FarmPatch) => void;
  
  deleteFarm: (id: string) => void;
  addFields: (fields: Field[]) => void;
  
  updateField: (id: string, patch: FieldPatch) => void;
  
  deleteField: (id: string) => void;
  snapshot: () => DataSnapshot;
  restore: (snapshot: DataSnapshot) => void;
  setActiveFarmId: (id: string | null) => void;
  setLanguage: (language: Language) => void;
  setTheme: (theme: ThemePreference) => void;
  setBaseLayer: (baseLayer: BaseLayerId) => void;
  resetData: () => void;
}

const touch = (farms: Farm[], farmId: string) =>
  farms.map((f) => (f.id === farmId ? { ...f, updatedAt: new Date().toISOString() } : f));

export const useFarmStore = create<FarmStoreState>()(
  persist(
    (set, get) => ({
      ...initialPersistedState(),
      currentUser: DEMO_USER,

      addFarm: (farm, fields) =>
        set((state) => ({
          farms: [farm, ...state.farms],
          fields: [...fields, ...state.fields],
          activeFarmId: farm.id,
        })),

      updateFarm: (id, patch) =>
        set((state) => ({
          farms: state.farms.map((f) => (f.id === id ? { ...f, ...patch, updatedAt: new Date().toISOString() } : f)),
        })),

      deleteFarm: (id) =>
        set((state) => {
          const farms = state.farms.filter((f) => f.id !== id);
          const removedFieldIds = new Set(state.fields.filter((f) => f.farmId === id).map((f) => f.id));
          return {
            farms,
            fields: state.fields.filter((f) => !removedFieldIds.has(f.id)),
            plans: state.plans.filter((p) => !removedFieldIds.has(p.fieldId)),
            activeFarmId: state.activeFarmId === id ? (farms[0]?.id ?? null) : state.activeFarmId,
          };
        }),

      addFields: (fields) =>
        set((state) => ({
          fields: [...state.fields, ...fields],
          farms: fields.reduce((farms, field) => touch(farms, field.farmId), state.farms),
        })),

      updateField: (id, patch) =>
        set((state) => {
          const field = state.fields.find((f) => f.id === id);
          if (!field) return {};
          const next: Field = { ...field, ...patch };
          if (patch.geometry !== undefined) next.areaM2 = patch.geometry ? polygonAreaM2(patch.geometry) : 0;
          return {
            fields: state.fields.map((f) => (f.id === id ? next : f)),
            farms: touch(state.farms, field.farmId),
          };
        }),

      deleteField: (id) =>
        set((state) => {
          const field = state.fields.find((f) => f.id === id);
          if (!field) return {};
          return {
            fields: state.fields.filter((f) => f.id !== id),
            plans: state.plans.filter((p) => p.fieldId !== id),
            farms: touch(state.farms, field.farmId),
          };
        }),

      snapshot: () => {
        const { farms, fields, plans, activeFarmId } = get();
        return { farms, fields, plans, activeFarmId };
      },
      restore: (snapshot) => set({ ...snapshot }),

      setActiveFarmId: (activeFarmId) => set({ activeFarmId }),
      setLanguage: (language) => set({ language }),
      setTheme: (theme) => set({ theme }),
      setBaseLayer: (baseLayer) => set({ baseLayer }),
      resetData: () => {
        const { language, theme, baseLayer } = get();
        set({ ...initialPersistedState(), language, theme, baseLayer });
      },
    }),
    {
      name: 'farmplan-storage',
      version: STORE_VERSION,
      storage: createJSONStorage(() => localStorage),
      migrate: migratePersistedState,
      partialize: (state): PersistedFarmState => ({
        farms: state.farms,
        fields: state.fields,
        plans: state.plans,
        activeFarmId: state.activeFarmId,
        language: state.language,
        theme: state.theme,
        baseLayer: state.baseLayer,
      }),
    },
  ),
);

/
export const useActiveFarm = () =>
  useFarmStore((s) => s.farms.find((f) => f.id === s.activeFarmId) ?? s.farms[0] ?? null);
