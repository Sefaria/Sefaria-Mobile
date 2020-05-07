import React from 'react';
import renderer, { act } from 'react-test-renderer';
import AsyncStorage from '@react-native-community/async-storage';
import TestContextWrapper from '../TestContextWrapper';
import ReaderApp from '../ReaderApp';
import BackgroundFetch from 'react-native-background-fetch';
import { DEFAULT_STATE } from '../StateManager';

const settingsObject = {
  interface_language: DEFAULT_STATE.interfaceLanguage,
  email_notifications: DEFAULT_STATE.emailFrequency,
  textual_custom: DEFAULT_STATE.preferredCustom,
  time_stamp: 613,
};
describe('ReaderApp history', () => {
  test('loadNewText addHistory', () => {

  });
  test('getSettingsObject', async () => {
    // children prop passed explicitly in order to avoid failed prop type warnings
    // see: https://github.com/facebook/react/issues/6653
    await AsyncStorage.setItem('lastSettingsUpdateTime', '613');
    const inst = renderer.create(<TestContextWrapper passContextToChildren child={ReaderApp} />);
    const readerApp = inst.root.findByType(ReaderApp);
    expect(await readerApp.instance.getSettingsObject()).toEqual(settingsObject);
  });
  test('onBackgroundSync', async () => {
    Sefaria.history.syncHistory = jest.fn();
    const inst = renderer.create(<TestContextWrapper passContextToChildren child={ReaderApp} />);
    const readerApp = inst.root.findByType(ReaderApp);
    const taskId = "stam-id";
    await readerApp.instance.onBackgroundSync(taskId);
    expect(Sefaria.history.syncHistory.mock.calls[0][1]).toEqual(settingsObject);
    expect(BackgroundFetch.finish).toBeCalledWith(taskId);
  });
});

describe('ReaderApp noInternet', () =>{
  // todo: finish this test (xtest skips the test)
  xtest('loadNewText', async () => {
    // fetch = jest.fn(() => Promise.reject(e => null));
    fetch = jest.fn(() => Promise.resolve({
      status: 200,
      json() {
        return Promise.resolve({
          user_history: webHistory,
          last_sync: 11,
          settings: {
            time_stamp: 11,
          },
        })
      }
    }));
    const inst = renderer.create(<TestContextWrapper passContextToChildren child={ReaderApp} />);
    const readerApp = inst.root.findByType(ReaderApp);
    const resolve = jest.fn();
    readerApp.instance.setState = jest.fn();
    readerApp.props.dispatch = jest.fn();
    const loadNewText = () => {
      return readerApp.instance.loadNewText({ref: 'Genesis 1', versions: null, overwriteVersions: false});
    }
    // await act(loadNewText);
    // return readerApp.loadNewText({ref: 'Genesis 1', versions: null, overwriteVersions: false})
    // .then(data => expect(data).toBe('foo'));
    await loadNewText().then(resolve);
    expect(resolve.mock.calls.length).toBe(1);
  })
});
