import {Text, View} from 'react-native';

import {sectionScreenStyles} from './SectionScreen.styles';

type SectionScreenProps = {
  description: string;
  eyebrow: string;
  title: string;
};

export function SectionScreen({
  description,
  eyebrow,
  title,
}: SectionScreenProps) {
  return (
    <View className={sectionScreenStyles.container}>
      <Text className={sectionScreenStyles.eyebrow}>{eyebrow}</Text>
      <Text className={sectionScreenStyles.title}>{title}</Text>
      <Text className={sectionScreenStyles.description}>{description}</Text>
    </View>
  );
}
