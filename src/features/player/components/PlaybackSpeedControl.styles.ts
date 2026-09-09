export const playbackSpeedControlStyles = {
  trigger:
    'mt-3 min-w-16 items-center rounded-full border border-app-border bg-app-surface px-3 py-2 active:opacity-80',
  triggerText: 'text-xs font-bold text-app-text',
  modalContainer: 'flex-1 items-center justify-center px-6',
  modalBackdrop: 'absolute inset-0 bg-black/75',
  modalCard:
    'w-full max-w-md rounded-3xl border border-app-border bg-app-elevated p-5',
  eyebrow: 'text-xs font-bold uppercase tracking-widest text-app-primary',
  title: 'mt-2 text-2xl font-bold text-app-text',
  description: 'mt-2 text-sm leading-5 text-app-muted',
  options: 'mt-5 flex-row flex-wrap gap-2',
  option:
    'min-w-20 items-center rounded-full border border-app-border bg-app-surface px-4 py-3 active:opacity-80',
  optionSelected: 'border-app-primary bg-app-primary',
  optionText: 'text-sm font-bold text-app-text',
  optionTextSelected: 'text-sm font-bold text-app-text',
  close: 'mt-4 items-center px-4 py-2 active:opacity-80',
  closeText: 'text-sm font-semibold text-app-muted',
} as const;

export function getPlaybackSpeedOptionClassName(isSelected: boolean) {
  return [
    playbackSpeedControlStyles.option,
    isSelected ? playbackSpeedControlStyles.optionSelected : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function getPlaybackSpeedOptionTextClassName(isSelected: boolean) {
  return [
    playbackSpeedControlStyles.optionText,
    isSelected ? playbackSpeedControlStyles.optionTextSelected : '',
  ]
    .filter(Boolean)
    .join(' ');
}
