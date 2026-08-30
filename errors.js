import { Alert } from 'react-native';
import strings from './LocalizedStrings';

export const ERRORS = {
    MISSING_OFFLINE_DATA: "Missing offline data",
    CANT_GET_SECTION_FROM_DATA: "Couldn't find section in depth 3+ text",
    OFFLINE_LIBRARY_NOT_COMPATIBLE_WITH_V7: "not compat v7",
};

/**
 * The catch-all alert shown when the app's error boundary trips.
 *
 * It lives here rather than in index.js so it can be imported — and therefore tested — on
 * its own. index.js is the entry point: importing it registers the app with AppRegistry and
 * pulls in the whole component tree.
 */
export const generalAppErrorAlert = () => {
  Alert.alert(
      strings.errors.general_error_alert_title,
      strings.errors.general_error_alert_message,
      [
        {text: strings.common.ok, style: 'cancel'},
      ]
  );
};
