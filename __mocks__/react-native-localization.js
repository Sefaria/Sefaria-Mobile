import LocalizedStringsCore from 'react-localization';

function getInterfaceLanguage() { return 'en-US'; };

export default class LocalizedStrings extends LocalizedStringsCore{
  constructor(props){
    super(props, getInterfaceLanguage);
  }
}
