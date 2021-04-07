import React from 'react';
import { Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import strings from '../LocalizedStrings';
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

  Sefaria.isGettinToBePurimTime = jest.fn(() => false);
  const inst = renderer.create(
    <TestContextWrapper child={SettingsPage} childProps={{
        close: () => {},
        logout: () => {},
        openUri: () => {},
      }}
    />
  );
  const yo = inst.root.findAllByType(ButtonToggleSetNew);
  expect(yo.length).toBe(6);

  let counter = 1;
  for (let y of yo) {
    const stateKey = y.parent.props.stateKey;
    if (stateKey === 'textLanguage' || stateKey === 'downloadNetworkSetting' || stateKey === 'readingHistory') { continue; }
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

test('settings buttons with grogger', () => {
  Sefaria.isGettinToBePurimTime = jest.fn(() => true);
  const inst = renderer.create(
    <TestContextWrapper child={SettingsPage} childProps={{
        close: () => {},
        logout: () => {},
        openUri: () => {},
      }}
    />
  );
  const yo = inst.root.findAllByType(ButtonToggleSetNew);
  expect(yo.length).toBe(7);
});

test('press reading history button', async () => {
  jest.spyOn(Alert, 'alert');
  jest.spyOn(Sefaria.history, 'deleteHistory');

  Sefaria.util.epoch_time = jest.fn()
    .mockReturnValueOnce(1);
  const inst = renderer.create(
    <TestContextWrapper child={SettingsPage} childProps={{
      close: () => {},
      logout: () => {},
      openUri: () => {},
      }}
    />
  );
  const readingHistBtn = inst.root.findAllByType(ButtonToggleSetNew).find(btn => btn.parent.props.stateKey === 'readingHistory');
  const offOption = readingHistBtn.props.options.find(o => o.name === 'offFem');

  // press off button to open popup
  offOption.onPress();

  // check that popup is open
  expect(Alert.alert).toHaveBeenCalledTimes(1);
  expect(Alert.alert.mock.calls[0][0]).toBe(strings.delete);

  // press delete button on popup
  const deleteButton = Alert.alert.mock.calls[0][2].find(btn => btn.text === strings.delete);
  act(deleteButton.onPress);

  // check that value of globalState is 'off'
  expect(inst.root.children[0].props._globalState['readingHistory']).toBe(false);
  expect((await AsyncStorage.getItem('lastSettingsUpdateTime'))).toBe(''+1);

  // check that delete historyFunction was called
  expect(Sefaria.history.deleteHistory).toHaveBeenCalledTimes(1);
  expect(Sefaria.history.deleteHistory).toHaveBeenCalledWith(false);
});
