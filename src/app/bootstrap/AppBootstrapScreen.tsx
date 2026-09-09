import {Text, View} from 'react-native';

import {appBootstrapScreenStyles} from './AppBootstrapScreen.styles';

type AppBootstrapScreenProps = {
  errorMessage: string | null;
};

export function AppBootstrapScreen({errorMessage}: AppBootstrapScreenProps) {
  return (
    <View className={appBootstrapScreenStyles.container}>
      <Text className={appBootstrapScreenStyles.eyebrow}>
        Radio and podcasts
      </Text>
      <Text className={appBootstrapScreenStyles.title}>
        {errorMessage ? 'The app is unavailable' : 'Preparing your library'}
      </Text>
      <Text className={appBootstrapScreenStyles.description}>
        {errorMessage
          ? 'The application could not initialize a required service.'
          : 'Setting up audio and local storage. This should only take a moment.'}
      </Text>
      {errorMessage ? (
        <Text className={appBootstrapScreenStyles.error}>{errorMessage}</Text>
      ) : null}
    </View>
  );
}
