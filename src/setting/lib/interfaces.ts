export interface Big5ScaleMap {
  openness: number;
  conscientiousness: number;
  extraversion: number;
  agreeableness: number;
  neuroticism: number;
}

export interface JungianScaleMap {
  extrovert_introvert: number;
  sensing_intuiting: number;
  thinking_feeling: number;
  judging_perceiving: number;
}

export interface ScalePreferenceAnswer {
  readonly key: string;
  readonly value: number;
  readonly type?: string;
}

export interface FacetedBig5Set {
  readonly key: string;
  readonly score: number;
  readonly domain: string;
  readonly facet: number;
}

export type ScaleScores = Big5ScaleMap[] | JungianScaleMap[];
