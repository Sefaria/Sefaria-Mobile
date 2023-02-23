import React, {useState} from 'react';
import Sefaria from "../sefaria";
import {useAsyncVariable, useGlobalState} from "../Hooks";

export const useCalendarItems = () => {
    const {interfaceLanguage, preferredCustom} = useGlobalState();
    const calendarLoaded = useAsyncVariable(!!Sefaria.calendar, Sefaria._loadCalendar);
    const [galusOrIsrael, setGalusOrIsrael] = useState(Sefaria.getDefaultGalusStatus(interfaceLanguage));
    useAsyncVariable(!!Sefaria.galusOrIsrael, Sefaria.getGalusStatus, setGalusOrIsrael, Sefaria.galusOrIsrael);
    const calendarItems = Sefaria.getCalendars(preferredCustom, galusOrIsrael === 'diaspora');
    return {
        calendarLoaded,
        calendarItems,
    };
};
