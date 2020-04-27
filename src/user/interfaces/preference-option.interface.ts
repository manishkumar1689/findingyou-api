/*
Services to associate payment options with countries
*/

export interface PreferenceOption {
  readonly key: string;
  readonly prompt: string;
  readonly type: string;
  readonly options?: any[];
  readonly rules?: any[];
}
