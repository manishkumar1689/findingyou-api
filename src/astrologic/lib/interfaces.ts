export interface KeyLabel {
  key: string;
  label: string;
}

export interface KeyName {
  key: string;
  name: string;
}

export interface KeyNameMax {
  key: string;
  name: string;
  maxScore?: number;
}

export interface KeyNumValue {
  key: string;
  value: number;
}

export interface LngLat {
  lat: number;
  lng: number;
  alt?: number;
}

export interface SurfaceTSData {
  geo: LngLat;
  ascendant: number;
  tzOffset: number;
}

export interface AyanamshaItem {
  num: number;
  key: string;
  value: number;
  name: string;
}

export const DefaultAyanamshaItem: AyanamshaItem = {
  num: 27,
  key: 'true_citra',
  value: 23.3,
  name: 'True Citra',
};


export interface Toponym {
  name: string;
  fullName: string;
  lat: number;
  lng: number;
  type: string;
}