
export enum FlowIntensity {
  LIGHT = '少量',
  MEDIUM = '中量',
  HEAVY = '大量',
  NONE = '无'
}

export interface PeriodLog {
  id: string;
  date: string; // ISO String (YYYY-MM-DD)
  isStart: boolean;
  isEnd: boolean;
  flow?: FlowIntensity;
  symptoms: string[];
  note?: string;
}

export interface UserSettings {
  averageCycleLength: number;
  averagePeriodLength: number;
}

export type ViewType = 'today' | 'calendar' | 'stats' | 'settings';

export interface DayPrediction {
  date: Date;
  type: 'period' | 'ovulation' | 'fertile' | 'none';
}
