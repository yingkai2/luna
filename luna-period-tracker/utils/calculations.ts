
import { addDays, differenceInDays, format, isSameDay, parseISO, startOfDay, subDays } from 'date-fns';
import { PeriodLog, DayPrediction, UserSettings } from '../types';
import { DEFAULT_CYCLE_LENGTH, DEFAULT_PERIOD_LENGTH } from '../constants';

export const getPredictions = (logs: PeriodLog[], settings: UserSettings): DayPrediction[] => {
  const predictions: DayPrediction[] = [];
  const sortedStarts = logs
    .filter(l => l.isStart)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  if (sortedStarts.length === 0) return [];

  const lastStart = parseISO(sortedStarts[0].date);
  const cycleLen = settings.averageCycleLength || DEFAULT_CYCLE_LENGTH;
  const periodLen = settings.averagePeriodLength || DEFAULT_PERIOD_LENGTH;

  // Predict for next 3 cycles
  for (let i = 1; i <= 3; i++) {
    const nextStart = addDays(lastStart, cycleLen * i);
    
    // Period Days
    for (let p = 0; p < periodLen; p++) {
      predictions.push({
        date: addDays(nextStart, p),
        type: 'period'
      });
    }

    // Ovulation (roughly 14 days before next period)
    const ovulationDay = subDays(nextStart, 14);
    predictions.push({
      date: ovulationDay,
      type: 'ovulation'
    });

    // Fertile window (5 days before ovulation + 1 day after)
    for (let f = -5; f <= 1; f++) {
      if (f === 0) continue; // Skip ovulation day as it's already marked
      predictions.push({
        date: addDays(ovulationDay, f),
        type: 'fertile'
      });
    }
  }

  return predictions;
};

export const calculateStats = (logs: PeriodLog[]) => {
  const starts = logs
    .filter(l => l.isStart)
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  
  const cycleLengths: number[] = [];
  for (let i = 1; i < starts.length; i++) {
    const diff = differenceInDays(parseISO(starts[i].date), parseISO(starts[i-1].date));
    if (diff > 15 && diff < 50) { // Filter unrealistic values
       cycleLengths.push(diff);
    }
  }

  const periodDurations: number[] = [];
  const startsArr = logs.filter(l => l.isStart);
  const endsArr = logs.filter(l => l.isEnd);

  startsArr.forEach(s => {
    const matchingEnd = endsArr.find(e => {
        const diff = differenceInDays(parseISO(e.date), parseISO(s.date));
        return diff >= 0 && diff < 15;
    });
    if (matchingEnd) {
        periodDurations.push(differenceInDays(parseISO(matchingEnd.date), parseISO(s.date)) + 1);
    }
  });

  const avgCycle = cycleLengths.length > 0 
    ? Math.round(cycleLengths.reduce((a, b) => a + b, 0) / cycleLengths.length) 
    : DEFAULT_CYCLE_LENGTH;
    
  const avgPeriod = periodDurations.length > 0
    ? Math.round(periodDurations.reduce((a, b) => a + b, 0) / periodDurations.length)
    : DEFAULT_PERIOD_LENGTH;

  return {
    avgCycle,
    avgPeriod,
    minCycle: cycleLengths.length > 0 ? Math.min(...cycleLengths) : avgCycle,
    maxCycle: cycleLengths.length > 0 ? Math.max(...cycleLengths) : avgCycle,
    history: cycleLengths
  };
};
