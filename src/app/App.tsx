import {StatusBar} from 'react-native';

import {MiniPlayer} from '../features/player/components/MiniPlayer';
import {AppBootstrapScreen} from './bootstrap/AppBootstrapScreen';
import {useAppBootstrap} from './bootstrap/useAppBootstrap';
import {RootNavigator} from './navigation/RootNavigator';
import {AppProviders} from './providers/AppProviders';

function App() {
  const {setupStatus, errorMessage} = useAppBootstrap();

  return (
    <AppProviders>
      <StatusBar barStyle="light-content" />
      {setupStatus === 'ready' ? (
        <>
          <RootNavigator />
          <MiniPlayer />
        </>
      ) : (
        <AppBootstrapScreen errorMessage={errorMessage} />
      )}
    </AppProviders>
  );
}

export default App;
