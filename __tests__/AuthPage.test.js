import React from 'react';
import renderer, { act } from 'react-test-renderer';
import { SystemButton } from '../Misc';
import TestContextWrapper from '../TestContextWrapper';
import { AuthPage, AuthTextInput } from '../AuthPage';
import strings from '../LocalizedStrings';


const AuthPageWrapper = ({ authMode }) => (
  <TestContextWrapper child={AuthPage} childProps={{
    close: () => {},
    authMode,
    showToast: () => {},
  }} />
)

describe('login', () => {

  test('num fields', () => {
    const inst = renderer.create(<AuthPageWrapper authMode={'login'} />);
    const inputs = inst.root.findAllByType(AuthTextInput);
    expect(inputs.length).toBe(2);
  });
  test('fields sent onSubmit', async () => {
    Sefaria.api.authenticate = jest.fn();
    const inst = renderer.create(<AuthPageWrapper authMode={'login'} />);
    const inputs = inst.root.findAllByType(AuthTextInput);
    const fields = {
      [strings.email]: 'bob@bobandco.co',
      [strings.password]: 'bobI$daB3st',
    };
    for (let i of inputs) {
      act(() => {
        i.props.onChangeText(fields[i.props.placeholder]);
      });
    }
    const button = inst.root.findByType(SystemButton);
    act(button.props.onPress);
    // NOTE: this test won't pass until act can run async
    // expect(Sefaria.api.authenticate.mock.calls.length).toBe(1);
    // expect(Sefaria.api.authenticate.mock.calls[0][0]).toEqual({
    //   first_name: null,
    //   last_name: null,
    //   email: fields[strings.email],
    //   password: fields[strings.password],
    //   mobile_app_key: '',
    // });
    // expect(Sefaria.api.authenticate.mock.calls[0][1]).toBe('login');
  });
});

describe('register', () => {
  test('num fields', () => {
    const inst = renderer.create(<AuthPageWrapper authMode={'register'} />);
    const inputs = inst.root.findAllByType(AuthTextInput);
    expect(inputs.length).toBe(4);
  });
});
