'use strict';
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';

export const useAsyncVariable = (initIsLoaded, loadVariable, onLoad) => {
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
