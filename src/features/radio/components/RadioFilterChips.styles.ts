import {StyleSheet} from 'react-native';

export const radioFilterChipsStyles = {
  container: 'mt-4',
  label: 'mb-2 text-xs font-semibold uppercase tracking-wider text-app-muted',
  chip: 'rounded-full border border-app-border bg-app-surface px-4 py-2',
  chipSelected: 'border-app-primary bg-cyan-950',
  chipText: 'text-sm font-medium text-app-muted',
  chipTextSelected: 'text-app-primary',
} as const;

export const radioFilterChipsNativeStyles = StyleSheet.create({
  content: {
    columnGap: 8,
    paddingRight: 24,
  },
});

export function getRadioFilterChipClassName(isSelected: boolean) {
  return isSelected
    ? `${radioFilterChipsStyles.chip} ${radioFilterChipsStyles.chipSelected}`
    : radioFilterChipsStyles.chip;
}

export function getRadioFilterChipTextClassName(isSelected: boolean) {
  return isSelected
    ? `${radioFilterChipsStyles.chipText} ${radioFilterChipsStyles.chipTextSelected}`
    : radioFilterChipsStyles.chipText;
}
