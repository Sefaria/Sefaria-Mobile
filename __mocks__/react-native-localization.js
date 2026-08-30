// `react-native-localization` reads the device language from a native module, which does
// not exist under Jest. This mock swaps in a fixed interface language.
//
// It extends `localized-strings` rather than `react-localization`: the latter is installed
// nested inside react-native-localization/node_modules, so Jest cannot resolve it from the
// repo root and every test importing LocalizedStrings failed to load. `react-localization`
// is only a thin wrapper over `localized-strings`, which is the class the real runtime ends
// up using anyway, so behaviour is unchanged. Passing a bare function as the second
// constructor argument is explicitly supported by localized-strings.
import LocalizedStringsCore from 'localized-strings';

function getInterfaceLanguage() { return 'en-US'; };

export default class LocalizedStrings extends LocalizedStringsCore{
  constructor(props){
    super(props, getInterfaceLanguage);
  }
}
