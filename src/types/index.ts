import type { LineString, MultiPolygon, Point, Polygon } from 'geojson';

export type Language = 'de' | 'en';

export type ThemePreference = 'system' | 'light' | 'dark';

export type BaseLayerId = 'osm' | 'satellite' | 'topo';

export type StrataLayer = 'EMERGENT' | 'HIGH' | 'MEDIUM' | 'LOW';

export type PlantUse = 'nut' | 'fruit' | 'berry' | 'timber' | 'biomass' | 'ecology';

export interface NumericRange {
  min: number;
  max: number;
}

export interface User {
  id: string;
  username: string;
  email: string;
  role: 'admin' | 'farmer';
  createdAt: string;
}

export interface Farm {
  id: string;
  ownerId: string;
  name: string;
  ownerName: string;
  contactEmail: string;
  location: string;
  climateZone: string | null;
  boundary: Polygon | null;
  /** Server-computed (WGS84) area and perimeter of the boundary; null without boundary or while saving. */
  boundaryAreaM2: number | null;
  boundaryPerimeterM: number | null;
  notes: string;
  createdAt: string;
  updatedAt: string;
}

export type Irrigation = 'none' | 'drip' | 'sprinkler' | 'flood' | 'other';

export interface Field {
  id: string;
  farmId: string;
  name: string;
  geometry: Polygon | null;
  areaM2: number;
  soilType: string | null;
  soilPh: number | null;
  excludedZones: MultiPolygon | null;
  cropType: string | null;
  irrigation: Irrigation;
  /** Let planning choose plant spacing automatically (legacy "auto spacing" toggle). */
  autoSpacing: boolean;
}

export type PlanStatus = 'draft' | 'active';

export interface PlantingPlan {
  id: string;
  fieldId: string;
  revisionNumber: number;
  status: PlanStatus;
  totalExpectedCalories: number;
  generatedAt: string;
  algorithmVersion: string;
}

export interface Treeline {
  id: string;
  planId: string;
  geometry: LineString;
  lineIndex: number;
  orientationDegrees: number;
  interRowSpacingM: number;
  rowLengthM: number;
}

export interface PlantPlacement {
  id: string;
  treelineId: string;
  plantId: string;
  position: Point;
  distanceAlongLineM: number;
  plantingYear: number;
  expectedRemovalYear: number | null;
  isLocked: boolean;
}

export interface PlantTaxon {
  id: string;
  scientificName: string;
  commonNameDe: string;
  commonNameEn: string;
  descriptionDe: string;
  descriptionEn: string;
  uses: PlantUse[];
  stratum: StrataLayer;
  endHeightM: NumericRange;
  minSpacingM: NumericRange;
  crownDiameterM: number | null;
  growthRateCmYear: number | null;
  caloriesPerKg: number;
  typicalYieldKgYear: NumericRange | null;
  hardinessZones: string[];
  isPioneer: boolean;
  isNitrogenFixer: boolean;
  nativeStatus: 'NATIVE' | 'EXOTIC';
  switchboardId: string | null;
  imageUrl: string | null;
}
