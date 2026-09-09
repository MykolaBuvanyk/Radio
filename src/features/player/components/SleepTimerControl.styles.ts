export const sleepTimerControlStyles = {
  trigger:
    'mt-3 self-start rounded-full border border-app-border bg-app-surface px-3 py-2 active:opacity-80',
  triggerActive: 'border-app-primary bg-cyan-950',
  triggerText: 'text-xs font-bold text-app-text',
  triggerTextActive: 'text-app-primary',
  modalContainer: 'flex-1 items-center justify-center px-6',
  modalBackdrop: 'absolute inset-0 bg-black/75',
  modalCard:
    'w-full max-w-md rounded-3xl border border-app-border bg-app-elevated p-5',
  eyebrow: 'text-xs font-bold uppercase tracking-widest text-app-primary',
  title: 'mt-2 text-2xl font-bold text-app-text',
  description: 'mt-2 text-sm leading-5 text-app-muted',
  options: 'mt-5 flex-row flex-wrap gap-2',
  option:
    'min-w-20 flex-1 items-center rounded-full bg-app-primary px-4 py-3 active:opacity-80',
  optionText: 'text-sm font-bold text-slate-950',
  cancel:
    'mt-4 items-center rounded-full border border-app-border px-4 py-3 active:opacity-80',
  cancelText: 'text-sm font-bold text-app-text',
  close: 'mt-3 items-center px-4 py-2 active:opacity-80',
  closeText: 'text-sm font-semibold text-app-muted',
} as const;

export function getSleepTimerTriggerClassName(isActive: boolean) {
  return [
    sleepTimerControlStyles.trigger,
    isActive ? sleepTimerControlStyles.triggerActive : '',
  ]
    .filter(Boolean)
    .join(' ');
}

export function getSleepTimerTriggerTextClassName(isActive: boolean) {
  return [
    sleepTimerControlStyles.triggerText,
    isActive ? sleepTimerControlStyles.triggerTextActive : '',
  ]
    .filter(Boolean)
    .join(' ');
}
