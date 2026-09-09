/**
 * @format
 */

import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import App from '../App';

jest.mock('../src/app/bootstrap/useAppBootstrap', () => ({
  useAppBootstrap: () => ({errorMessage: null, setupStatus: 'ready'}),
}));

jest.mock('../src/app/navigation/RootNavigator', () => ({
  RootNavigator: () => null,
}));

jest.mock('../src/features/player/components/MiniPlayer', () => ({
  MiniPlayer: () => null,
}));

jest.mock('../src/app/providers/AppProviders', () => ({
  AppProviders: ({children}: {children: React.ReactNode}) => children,
}));

test('renders correctly', async () => {
  await ReactTestRenderer.act(() => {
    ReactTestRenderer.create(<App />);
  });
});
