import {useEffect, useRef, useState} from 'react';

import type {PodcastSubscription} from '../domain/podcast';
import {observePodcastSubscriptions} from '../infrastructure/podcastRepository';
import {subscribeToPodcast} from '../services/podcastSubscriptionService';

function getErrorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'The podcast feed could not be added.';
}

export function usePodcastSubscriptions() {
  const [subscriptions, setSubscriptions] = useState<PodcastSubscription[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const activeRequest = useRef<AbortController | null>(null);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const unsubscribe = observePodcastSubscriptions(
      nextSubscriptions => {
        setSubscriptions(nextSubscriptions);
        setIsLoading(false);
      },
      () => {
        setErrorMessage('Podcast subscriptions could not be loaded.');
        setIsLoading(false);
      },
    );

    return () => {
      isMounted.current = false;
      activeRequest.current?.abort();
      unsubscribe();
    };
  }, []);

  const addSubscription = async (feedUrl: string) => {
    if (isSubmitting) {
      return false;
    }

    const controller = new AbortController();

    activeRequest.current?.abort();
    activeRequest.current = controller;
    setIsSubmitting(true);
    setErrorMessage(null);

    try {
      await subscribeToPodcast(feedUrl, controller.signal);
      return true;
    } catch (error) {
      if (!isMounted.current) {
        return false;
      }

      if (error instanceof Error && error.name === 'AbortError') {
        return false;
      }

      setErrorMessage(getErrorMessage(error));
      return false;
    } finally {
      if (isMounted.current && activeRequest.current === controller) {
        activeRequest.current = null;
        setIsSubmitting(false);
      }
    }
  };

  return {
    addSubscription,
    errorMessage,
    isLoading,
    isSubmitting,
    subscriptions,
  };
}
