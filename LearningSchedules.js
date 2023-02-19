import React, {useState} from 'react';
import {View, Text, SectionList} from "react-native";
import Sefaria from "./sefaria";
import {
    CategoryColorLine, CategoryDescription,
    CategoryTitle, ContentTextWithFallback,
    FlexFrame,
    GreyBoxFrame, Icon, InterfaceText,
    LoadingView,
    SefariaPressable, BackButtonRow,
} from "./Misc";
import {useAsyncVariable, useGlobalState} from "./Hooks";
import styles from "./Styles";

const useCalendarItems = () => {
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

const useCalendarItemsBySection = () => {
    const { calendarItems } = useCalendarItems();
    const makeListings = enTitleList => calendarItems.filter(c => enTitleList.indexOf(c.title.en) !== -1);
    const calendarTitleSections = [
        {
            sectionTitle: "Weekly Torah Portion",
            calendarTitles: [
                "Parashat Hashavua", "Haftarah (A)", "Haftarah (S)", "Haftarah"
            ],
        },
        {
            sectionTitle: "Daily Learning",
            calendarTitles: [
                "Daf Yomi", "929", "Daily Mishnah", "Daily Rambam", "Daily Rambam (3 Chapters)", "Halakhah Yomit",
                "Arukh HaShulchan Yomi", "Tanakh Yomi", "Zohar for Elul", "Chok LeYisrael", "Tanya Yomi"
            ],
        },
        {
            sectionTitle: "Weekly Learning",
            calendarTitles: ["Daf a Week"],
        },
    ];
    const calendarItemSections = calendarTitleSections.map(({sectionTitle, calendarTitles}) => ({
        sectionTitle,
        data: makeListings(calendarTitles),
    }));
    return calendarItemSections;
};

const getFilteredCalendarItems = (calendarItems, desiredCalendarTitles) => {
    const desiredCalendarTitlesSet = new Set(desiredCalendarTitles);
    return calendarItems.filter(item => desiredCalendarTitlesSet.has(item.title.en));
};

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
    const { theme } = useGlobalState();
    const onPress = () => openRef(calendarItem.refs[0]);
    const displayTitle = calendarItem.title.en === "Parashat Hashavua" ? {en: "Torah", he: "תורה"} : calendarItem.title
    return (
        <SefariaPressable onPress={onPress}>
            <FlexFrame dir={"row"} justifyContent={"space-between"}>
                <InterfaceText {...displayTitle} extraStyles={[styles.flex1, styles.fontSize16, theme.tertiaryText]} />
                <ContentTextWithFallback {...calendarItem.subs[0]} extraStyles={[styles.flex1, {marginTop: 5}]} />
            </FlexFrame>
        </SefariaPressable>
    );
};

export const LearningSchedulesPage = ({ openRef, openUri, onBack }) => {
    const { theme } = useGlobalState();
    const calendarItemsBySection = useCalendarItemsBySection();
    return (
        <SectionList
            contentContainerStyle={[{paddingHorizontal: 15}, theme.mainTextPanel]}
            sections={calendarItemsBySection}
            ListHeaderComponent={() => <BackButtonRow onPress={onBack} />}
            renderSectionHeader={({ section: { sectionTitle } }) => <Text>{sectionTitle}</Text>}
            renderItem={({ item }) => (<LearningSchedule calendarItem={item} openRef={openRef} openUri={openUri} />)}
        />
    );
};

const useOpenNthRefOrUrl = (n, calendarItem, openRef, openUri) => {
    /**
     * Returns function to either open the nth ref of calendarItem or its url (there can only be one url).
     */
    return () => {
        if (typeof calendarItem.refs == 'undefined') {
            if (n > 0) {
                throw new Error("There is only one URL on calendarItem but `n`= " + n);
            }
            openUri(`${Sefaria.api._baseHost}${calendarItem.url}`);
        } else {
            openRef(calendarItem.refs[n]);
        }
    };
};

const LearningSchedule = ({ calendarItem, openRef, openUri }) => {
    const { category, description } = calendarItem;
    return (
        <View style={{paddingVertical: 17}}>
            <FlexFrame dir={"column"}>
                <CategoryColorLine category={category} thickness={4}/>
                <LearningScheduleTitleRow calendarItem={calendarItem} openRef={openRef} openUri={openUri} />
                <LearningScheduleSubtitleRow calendarItem={calendarItem} openRef={openRef} openUri={openUri}  />
                <CategoryDescription description={description} />
            </FlexFrame>
        </View>
    )
};

const useLearningScheduleDisplayTitles = (title, scheduleSubtitle, itemSubtitles) => {
    /**
     * @param title
     * @param scheduleSubtitle: str, generic subtitle for the schedule as a whole
     * @param itemSubtitles: list[str], list of learnings for this schedule on this day
     */
    const displayTitle = title.en === "Parashat Hashavua" ? itemSubtitles[0] : title;
    const getWrapped = text => text && `(${text})`;
    const displaySubtitle = {en: getWrapped(scheduleSubtitle.en), he: getWrapped(scheduleSubtitle.he)};
    return { displayTitle, displaySubtitle };
};

const LearningScheduleTitleRow = ({ calendarItem, openRef, openUri }) => {
    const { theme } = useGlobalState();
    const openMainRef = useOpenNthRefOrUrl(0, calendarItem, openRef, openUri);
    const { title, subtitle, subs } = calendarItem;
    const { displayTitle, displaySubtitle } = useLearningScheduleDisplayTitles(title, subtitle, subs);
    return (
        <SefariaPressable onPress={openMainRef}>
            <FlexFrame dir={"row"}>
                <CategoryTitle title={displayTitle} />
                <CategoryTitle title={displaySubtitle} extraStyles={[theme.tertiaryText]}/>
            </FlexFrame>
        </SefariaPressable>
    );
};

const LearningScheduleSubtitleRow = ({ calendarItem, openRef, openUri }) => {
    const subtitles = calendarItem.title.en === "Parashat Hashavua" ? [{en: calendarItem.refs, he: calendarItem.heRef}] : calendarItem.subs;
    return (
        <FlexFrame dir={"row"} flexWrap={"wrap"}>
            <Icon name={"book"} length={16} />
            { subtitles.map((subtitle, n) => (
                <LearningScheduleSubtitle
                    key={subtitle.en}
                    n={n}
                    subtitle={subtitle}
                    calendarItem={calendarItem}
                    openRef={openRef}
                    openUri={openUri}
                />
            ))}
        </FlexFrame>
    )
};

const LearningScheduleSubtitle = ({ n, subtitle, calendarItem, openRef, openUri }) => {
    const onPress = useOpenNthRefOrUrl(n, calendarItem, openRef, openUri);
    return (
        <FlexFrame dir={"row"}>
            { n > 0 && <ContentTextWithFallback en={", "} he={", "}/>}
            <SefariaPressable onPress={onPress}>
                <ContentTextWithFallback {...subtitle} />
            </SefariaPressable>
        </FlexFrame>
    );
};
