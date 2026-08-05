import DeepLinkRouter from '../DeepLinkRouter';

const makeProps = () => ({
  openNav: jest.fn(),
  openMenu: jest.fn(),
  openRef: jest.fn(),
  openUri: jest.fn(),
  openTextTocDirectly: jest.fn(),
  openSearch: jest.fn(),
  openTopic: jest.fn(),
  setSearchOptions: jest.fn(),
  setTextLanguage: jest.fn(),
  setNavigationCategories: jest.fn(),
});

beforeAll(() => {
  global.Sefaria = { api: { _baseHost: 'https://www.sefaria.org/' } };
});

describe('DeepLinkRouter interface language switching', () => {
  test('hands a cross-domain language switch back to the browser', () => {
    const props = makeProps();
    const router = new DeepLinkRouter(props);
    router.route('https://www.sefaria.org/texts?set-language-cookie=', true);
    expect(props.openUri).toHaveBeenCalledWith('https://www.sefaria.org/texts?set-language-cookie=');
    expect(props.openNav).not.toHaveBeenCalled();
  });

  test('hands a language switch to the Hebrew domain back to the browser', () => {
    const props = makeProps();
    const router = new DeepLinkRouter(props);
    const url = 'https://www.sefaria.org.il/Genesis.1?set-language-cookie=';
    router.route(url, true);
    expect(props.openUri).toHaveBeenCalledWith(url);
    expect(props.openRef).not.toHaveBeenCalled();
  });

  test('still opens ordinary deep links in the app', () => {
    const props = makeProps();
    const router = new DeepLinkRouter(props);
    router.route('https://www.sefaria.org/texts', true);
    expect(props.openNav).toHaveBeenCalled();
    expect(props.openUri).not.toHaveBeenCalled();
  });
});
