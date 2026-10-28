import { GeodeticLocation, SatelliteRecord } from '../../types';

export interface IDataProvider {
  readonly name: string;
  getCatalog(category?: string): Promise<SatelliteRecord[]>;
  getOrbitalData(noradId: number): Promise<SatelliteRecord | null>;
  getValidationPosition?(noradId: number): Promise<GeodeticLocation | null>;
}
