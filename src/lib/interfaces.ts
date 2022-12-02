export interface KeyNum {
  key: string;
  num: number;
}

export interface KeyNumValue {
  key: string;
  value: number;
}

export interface KeyValueNum {
  key: string;
  num?: number;
  value: number;
}

export interface TimeItem {
  un?: number;
  jd: number;
  dt: string;
}

export interface KeyNameCount {
  key: string;
  name: string;
  count?: number;
}
