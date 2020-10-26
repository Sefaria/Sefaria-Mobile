'use strict';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

export const useAsyncVariable = (initIsLoaded, loadVariable, onLoad) => {
  /*
  Loads a variable asynchronously and returns status of load
  Useful for determining when a variable from the Sefaria object is available, e.g. Sefaria.calendar
  */
  const [isLoaded, setIsLoaded] = useState(initIsLoaded);
  const setup = async (isLoaded) => {
    if (!isLoaded) {
      await loadVariable();
      setIsLoaded(true);
    }
  };
  setup(isLoaded).then(onLoad);

  return isLoaded;
};
