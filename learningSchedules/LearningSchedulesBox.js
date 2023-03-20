import React from 'react';
import {View} from "react-native";
import {
    ContentTextWithFallback,
    FlexFrame,
    GreyBoxFrame, InterfaceText,
    LoadingView,
    SefariaPressable,
} from "../Misc";
import {useGlobalState} from "../Hooks";
import {useCalendarItems} from "./useCalendarItems";
import styles from "../Styles";

/**
 * Learning schedules box to insert wherever a sidebar element can go on the site. A bit more modular than BasicLearningSchedulesBox.
 * @param openRef
 * @param desiredCalendarTitles: list of calendar titles to display
 * @param children: element to display above the learning schedules
 * @returns {JSX.Element}
 * @constructor
 */
export const LearningSchedulesBox = ({openRef, desiredCalendarTitles, children}) => {
    const { theme } = useGlobalState();
    const { calendarLoaded } = useCalendarItems();
    const loadedLearningSchedules = (
        <View>
            <View style={[styles.learningSchedulesBorder, theme.lightGreyBorder]}>
                { children }
            </View>
            <LearningScheduleTable desiredCalendarTitles={desiredCalendarTitles} openRef={openRef} />
        </View>
    );
    return (
        <View style={{marginHorizontal: -15}}>
            <GreyBoxFrame>
                { calendarLoaded ? loadedLearningSchedules : <LoadingView />}
            </GreyBoxFrame>
        </View>
    );
};

/**
 * Simple learning schedule box to insert wherever a sidebar element can go on the site
 * @param openRef
 * @param desiredCalendarTitles: list of calendar titles to display
 * @param titleKey: key for LocalizedStrings.js
 * @returns {JSX.Element}
 * @constructor
 */
const BasicLearningScheduleBox = ({ openRef, desiredCalendarTitles, titleKey }) => {
    const { theme } = useGlobalState();
    return (
        <LearningSchedulesBox openRef={openRef} desiredCalendarTitles={desiredCalendarTitles}>
            <FlexFrame dir={"row"} justifyContent={"flex-start"}>
                <InterfaceText stringKey={titleKey} extraStyles={[styles.fontSize16, styles.fontBold, theme.tertiaryText]} />
            </FlexFrame>
        </LearningSchedulesBox>
    );
};

const WeeklyTorahPortion = ({ openRef }) => <BasicLearningScheduleBox openRef={openRef} desiredCalendarTitles={['Parashat Hashavua', 'Haftarah']} titleKey={"weeklyTorahPortion"} />;
const DafYomi = ({ openRef }) => <BasicLearningScheduleBox openRef={openRef} desiredCalendarTitles={['Daf Yomi']} titleKey={"dafYomi"} />;

const getLearningSchedulesBoxComponent = categories => {
    const path = categories.join("|");
    const components = {
        "Tanakh": WeeklyTorahPortion,
        "Talmud|Bavli":  DafYomi,
    };

    return components[path];
}

export const LearningSchedulesBoxFactory = ({ categories, openRef, extraStyles=[]}) => {
    const Component = getLearningSchedulesBoxComponent(categories);
    if (!Component) { return null; }
    return (
        <View style={extraStyles}>
            <Component openRef={openRef} />
        </View>
    );
};

const LearningScheduleTable = ({ desiredCalendarTitles, openRef }) => {
    const { calendarItems } = useCalendarItems();
    const filteredCalendarItems = getFilteredCalendarItems(calendarItems, desiredCalendarTitles);
    return (
        <FlexFrame dir={"column"}>
            {filteredCalendarItems.map(item => (
                <LearningScheduleRow key={item.title.en} calendarItem={item} openRef={openRef} />
            ))}
        </FlexFrame>
    );
};

const LearningScheduleRow = ({ calendarItem, openRef }) => {
    const { theme, interfaceLanguage } = useGlobalState();
    const onPress = () => openRef(calendarItem.refs[0]);
    const displayTitle = calendarItem.title.en === "Parashat Hashavua" ? {en: "Torah", he: "תורה"} : calendarItem.title
    return (
        <SefariaPressable onPress={onPress}>
            <FlexFrame dir={"row"} justifyContent={"space-between"}>
                <InterfaceText {...displayTitle} extraStyles={[styles.flex1, styles.fontSize16, theme.tertiaryText]} />
                <ContentTextWithFallback {...calendarItem.subs[0]} extraStyles={[styles.flex1, {marginTop: interfaceLanguage === "english" ? 5 : 0}, theme.text]} />
            </FlexFrame>
        </SefariaPressable>
    );
};

const getFilteredCalendarItems = (calendarItems, desiredCalendarTitles) => {
    const desiredCalendarTitlesSet = new Set(desiredCalendarTitles);
    return calendarItems.filter(item => desiredCalendarTitlesSet.has(item.title.en));
};
