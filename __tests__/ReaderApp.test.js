import React from 'react';
import renderer, { act } from 'react-test-renderer';
import TestContextWrapper from '../TestContextWrapper';
import ReaderApp from '../ReaderApp';
import BackgroundFetch from 'react-native-background-fetch';
import { DEFAULT_STATE } from '../StateManager';

const settingsObject = {
  interface_language: DEFAULT_STATE.interfaceLanguage,
  email_notifications: DEFAULT_STATE.emailFrequency,
  textual_custom: DEFAULT_STATE.preferredCustom,
};
describe('ReaderApp history', () => {
  test('loadNewText addHistory', () => {

  });
  test('getSettingsObject', () => {
    // children prop passed explicitly in order to avoid failed prop type warnings
    // see: https://github.com/facebook/react/issues/6653
    const inst = renderer.create(<TestContextWrapper passContextToChildren child={ReaderApp} />);
    const readerApp = inst.root.findByType(ReaderApp);
    expect(readerApp.instance.getSettingsObject()).toEqual(settingsObject);
  });
  test('onBackgroundSync', async () => {
    Sefaria.history.syncHistory = jest.fn();
    const inst = renderer.create(<TestContextWrapper passContextToChildren child={ReaderApp} />);
    const readerApp = inst.root.findByType(ReaderApp);
    await readerApp.instance.onBackgroundSync();
    expect(Sefaria.history.syncHistory).toBeCalledWith(expect.objectContaining(settingsObject));
    expect(BackgroundFetch.finish).toBeCalledWith(BackgroundFetch.FETCH_RESULT_NEW_DATA);
  });
});
