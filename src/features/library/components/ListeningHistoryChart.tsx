import {Text, View} from 'react-native';

import type {DailyListeningSummary} from '../../player/domain/persistence';
import {listeningHistoryChartStyles} from './ListeningHistoryChart.styles';

type ListeningHistoryChartProps = {
  summary: DailyListeningSummary[];
};

function getLocalDateKey(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildChartDays(summary: DailyListeningSummary[]) {
  const byDay = new Map(summary.map(item => [item.day, item]));

  return Array.from({length: 7}, (_, index) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - index));
    const value = byDay.get(getLocalDateKey(date));

    return {
      day: date.toLocaleDateString('en-US', {weekday: 'narrow'}),
      listenedSeconds: value?.listenedSeconds ?? 0,
    };
  });
}

export function ListeningHistoryChart({summary}: ListeningHistoryChartProps) {
  const days = buildChartDays(summary);
  const maximum = Math.max(...days.map(day => day.listenedSeconds), 1);
  const totalMinutes = Math.round(
    days.reduce((total, day) => total + day.listenedSeconds, 0) / 60,
  );

  return (
    <View className={listeningHistoryChartStyles.container}>
      <Text className={listeningHistoryChartStyles.eyebrow}>Last 7 days</Text>
      <Text className={listeningHistoryChartStyles.total}>
        {totalMinutes} min listened
      </Text>
      <View className={listeningHistoryChartStyles.chart}>
        {days.map((day, index) => (
          <View
            className={listeningHistoryChartStyles.column}
            key={`${day.day}-${index}`}>
            <View className={listeningHistoryChartStyles.barTrack}>
              <View
                className={listeningHistoryChartStyles.bar}
                style={{
                  height: `${Math.max(
                    5,
                    (day.listenedSeconds / maximum) * 100,
                  )}%`,
                }}
              />
            </View>
            <Text className={listeningHistoryChartStyles.day}>{day.day}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}
