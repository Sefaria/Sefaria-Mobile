import React from 'react';
import AsyncStorage from '@react-native-community/async-storage';
import renderer, { act } from 'react-test-renderer';
import {
  DEFAULT_STATE,
} from '../StateManager';
import SettingsPage from '../SettingsPage';
import { ButtonToggleSetNew } from '../Misc';
import TestContextWrapper from '../TestContextWrapper';

test('settings buttons', async () => {
  // Sefaria.packages.available = [];  // todo: download refactor check how this is used and adapt
  Sefaria.util.epoch_time = jest.fn()
    .mockReturnValueOnce(1)
    .mockReturnValueOnce(2)
    .mockReturnValueOnce(3)
    .mockReturnValueOnce(4);
  const inst = renderer.create(
    <TestContextWrapper child={SettingsPage} childProps={{
        close: () => {},
        logout: () => {},
        openUri: () => {},
      }}
    />
  );
  const yo = inst.root.findAllByType(ButtonToggleSetNew);
  expect(yo.length).toBe(4);

  let counter = 1;
  for (let y of yo) {
    const stateKey = y.parent.props.stateKey;
    if (stateKey === 'textLanguage') { continue; }
    for (let o of y.props.options) {
      if (o.name !== y.props.active) {
        expect(inst.root.children[0].props._globalState[stateKey]).toBe(DEFAULT_STATE[stateKey]);
        act(o.onPress);
        expect(inst.root.children[0].props._globalState[stateKey]).toBe(o.name);
        expect((await AsyncStorage.getItem('lastSettingsUpdateTime'))).toBe(''+counter);
        break;
      }
    }
    counter++;
  }
});
