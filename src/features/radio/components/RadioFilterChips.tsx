import {Pressable, ScrollView, Text, View} from 'react-native';

import type {RadioFilterOption} from '../domain/radioCatalog';
import {
  getRadioFilterChipClassName,
  getRadioFilterChipTextClassName,
  radioFilterChipsNativeStyles,
  radioFilterChipsStyles,
} from './RadioFilterChips.styles';

type RadioFilterChipsProps = {
  label: string;
  options: readonly RadioFilterOption[];
  selectedValue: string;
  onChange: (value: string) => void;
};

export function RadioFilterChips({
  label,
  options,
  selectedValue,
  onChange,
}: RadioFilterChipsProps) {
  return (
    <View className={radioFilterChipsStyles.container}>
      <Text className={radioFilterChipsStyles.label}>{label}</Text>
      <ScrollView
        horizontal
        contentContainerStyle={radioFilterChipsNativeStyles.content}
        showsHorizontalScrollIndicator={false}>
        {options.map(option => {
          const isSelected = option.value === selectedValue;

          return (
            <Pressable
              key={option.value || 'all'}
              accessibilityRole="button"
              accessibilityState={{selected: isSelected}}
              className={getRadioFilterChipClassName(isSelected)}
              onPress={() => onChange(option.value)}>
              <Text
                className={getRadioFilterChipTextClassName(isSelected)}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}
