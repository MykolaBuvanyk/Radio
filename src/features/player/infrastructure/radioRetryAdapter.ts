import {
  addRadioNetworkChangedListener,
  addRadioRetryExhaustedListener,
  addRadioRetryRequestedListener,
  getRadioRetryStats,
  reportRadioPlaybackError,
  reportRadioPlaybackState,
  setRadioRetryEnabled,
  startRadioRetrySession,
  stopRadioRetrySession,
  type RadioNetworkChange,
  type RadioRetryExhausted,
  type RadioRetryRequest,
} from '@radio/radio-system';

type RadioRetryCallbacks = {
  onNetworkChanged: (event: RadioNetworkChange) => void;
  onRetryExhausted: (event: RadioRetryExhausted) => void;
  onRetryRequested: (request: RadioRetryRequest) => void;
};

export function registerRadioRetryCallbacks(callbacks: RadioRetryCallbacks) {
  const subscriptions = [
    addRadioNetworkChangedListener(callbacks.onNetworkChanged),
    addRadioRetryExhaustedListener(callbacks.onRetryExhausted),
    addRadioRetryRequestedListener(callbacks.onRetryRequested),
  ];

  return () => {
    subscriptions.forEach(subscription => subscription.remove());
  };
}

export {
  getRadioRetryStats,
  reportRadioPlaybackError,
  reportRadioPlaybackState,
  setRadioRetryEnabled,
  startRadioRetrySession,
  stopRadioRetrySession,
};
