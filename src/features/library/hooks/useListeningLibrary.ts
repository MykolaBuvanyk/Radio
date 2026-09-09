import {useEffect, useState} from 'react';

import type {
  DailyListeningSummary,
  ListeningHistoryEntry,
} from '../../player/domain/persistence';
import {
  observeDailyListeningSummary,
  observeListeningHistory,
} from '../../player/infrastructure/playbackPersistenceRepository';

const HISTORY_LIMIT = 100;
const SUMMARY_DAY_COUNT = 7;

function getSummaryStartTimestamp() {
  const start = new Date();

  start.setHours(0, 0, 0, 0);
  start.setDate(start.getDate() - (SUMMARY_DAY_COUNT - 1));

  return start.getTime();
}

export function useListeningLibrary() {
  const [history, setHistory] = useState<ListeningHistoryEntry[]>([]);
  const [dailySummary, setDailySummary] = useState<DailyListeningSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    const handleError = () => {
      setErrorMessage('Listening history could not be loaded.');
      setIsLoading(false);
    };
    const unsubscribeHistory = observeListeningHistory(
      HISTORY_LIMIT,
      entries => {
        setHistory(entries);
        setIsLoading(false);
      },
      handleError,
    );
    const unsubscribeSummary = observeDailyListeningSummary(
      getSummaryStartTimestamp(),
      setDailySummary,
      handleError,
    );

    return () => {
      unsubscribeHistory();
      unsubscribeSummary();
    };
  }, []);

  return {dailySummary, errorMessage, history, isLoading};
}
