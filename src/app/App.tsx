import {StatusBar, Text, View} from 'react-native';
import {
  SafeAreaProvider,
  SafeAreaView,
} from 'react-native-safe-area-context';

import {appNativeStyles, appStyles} from './App.styles';

function App() {
  return (
    <SafeAreaProvider>
      <StatusBar barStyle="light-content" />
      <SafeAreaView style={appNativeStyles.screen}>
        <View className={appStyles.content}>
          <Text className={appStyles.eyebrow}>Radio and podcasts</Text>
          <Text className={appStyles.title}>Radio</Text>
          <Text className={appStyles.subtitle}>
            Your stations, podcasts, and offline episodes in one place.
          </Text>
        </View>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default App;
