import { DEFAULT_VEHICLE, type VehicleConfig } from './VehicleModel';

/**
 * Hand-tuned car makes/models (NOT procedurally generated — we tune these by
 * feel). A profile is the physics config (the 12 VehicleModel fields) plus
 * identity (manufacturer + model + class) and the body silhouette it drives.
 * `stepVehicle` already takes a config, so the car you're driving just steps
 * with ITS profile — carjack a truck and it's a sluggish barge; a sports car is
 * nimble. GTA-style names so we can talk about them. One source of truth here.
 */
export type VehicleClass =
  | 'sedan'
  | 'compact'
  | 'sports'
  | 'super'
  | 'muscle'
  | 'truck'
  | 'van'
  | 'interceptor';

export interface CarProfile extends VehicleConfig {
  id: string;
  manufacturer: string;
  model: string;
  class: VehicleClass;
  shapeId: string; // a CAR_SHAPES id (the body silhouette)
  mass: number; // kg — drives mass-weighted car-vs-car collision (heavy shoves light)
}

/** Spread the baseline sedan config, override the fields that give a model its feel. */
const tune = (over: Partial<VehicleConfig>): VehicleConfig => ({ ...DEFAULT_VEHICLE, ...over });

/** The seven civilian makes/models you'll find on the street. */
export const PROFILES: CarProfile[] = [
  {
    id: 'crown-vantage', manufacturer: 'Crown', model: 'Vantage', class: 'sedan', shapeId: 'sedan', mass: 1400,
    ...tune({}), // the balanced baseline
  },
  {
    id: 'komuter-bean', manufacturer: 'Komuter', model: 'Bean', class: 'compact', shapeId: 'compact', mass: 1000,
    ...tune({ enginePower: 7.5, maxSpeed: 34, turnRate: 2.9, gripNormal: 12 }), // zippy, low top end
  },
  {
    id: 'velocci-strada', manufacturer: 'Velocci', model: 'Strada', class: 'sports', shapeId: 'sports', mass: 1200,
    ...tune({ enginePower: 9.5, maxSpeed: 47, turnRate: 2.8, gripNormal: 12.5, gripSpeed: 8 }),
  },
  {
    id: 'velocci-furia', manufacturer: 'Velocci', model: 'Furia', class: 'super', shapeId: 'sports', mass: 1300,
    ...tune({ enginePower: 11, brakePower: 32, maxSpeed: 53, turnRate: 2.8, gripNormal: 13, gripSpeed: 9 }),
  },
  {
    id: 'mosca-brute', manufacturer: 'Mosca', model: 'Brute', class: 'muscle', shapeId: 'sedan', mass: 1650,
    ...tune({ enginePower: 10, maxSpeed: 45, turnRate: 2.3, gripNormal: 9, gripHandbrake: 0.6 }), // power, loose tail
  },
  {
    id: 'delivr-boxer', manufacturer: 'Delivr', model: 'Boxer', class: 'van', shapeId: 'van', mass: 2400,
    ...tune({ enginePower: 6, maxSpeed: 31, turnRate: 2.0, gripNormal: 9 }),
  },
  {
    id: 'bunker-hauler', manufacturer: 'Bunker', model: 'Hauler', class: 'truck', shapeId: 'pickup', mass: 4500,
    ...tune({ enginePower: 5, brakePower: 20, maxSpeed: 27, turnRate: 1.8, gripNormal: 8, gripSpeed: 8 }),
  },
];

/** Police interceptor — fast and planted, what cruisers (and a carjacked cop car) drive. */
export const INTERCEPTOR: CarProfile = {
  id: 'crown-interceptor', manufacturer: 'Crown', model: 'Interceptor', class: 'interceptor', shapeId: 'sports', mass: 1700,
  ...tune({ enginePower: 8.5, maxSpeed: 42, turnRate: 2.6, gripNormal: 11 }),
};

/** The car you spawn in. */
export const PLAYER_PROFILE: CarProfile = PROFILES[0];
