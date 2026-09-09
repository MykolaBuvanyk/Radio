import type {PlaybackSpeed} from '../domain/playbackSpeed';
import {setNativePlaybackSpeed} from '../infrastructure/trackPlayerAdapter';

let preferredEpisodePlaybackSpeed: PlaybackSpeed = 1;

export function setEpisodePlaybackSpeed(speed: PlaybackSpeed) {
  preferredEpisodePlaybackSpeed = speed;
  setNativePlaybackSpeed(speed);
}

export function applyPreferredEpisodePlaybackSpeed() {
  setNativePlaybackSpeed(preferredEpisodePlaybackSpeed);
}

export function resetLiveRadioPlaybackSpeed() {
  setNativePlaybackSpeed(1);
}

export function getPreferredEpisodePlaybackSpeed() {
  return preferredEpisodePlaybackSpeed;
}
