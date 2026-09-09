export type PlayerPhase =
  | 'idle'
  | 'ready'
  | 'buffering'
  | 'ended'
  | 'error';

export type PlayerSnapshot = {
  mediaId: string | null;
  mediaType: 'episode' | 'radio' | null;
  title: string | null;
  subtitle: string | null;
  isPlaying: boolean;
  phase: PlayerPhase;
};
