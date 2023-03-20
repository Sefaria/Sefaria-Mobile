import React from 'react';
import {View, Text, SectionList} from "react-native";
import Sefaria from "../sefaria";
import {
    CategoryColorLine, CategoryDescription,
    CategoryTitle, ContentTextWithFallback,
    FlexFrame, Icon,
    SefariaPressable, BackButtonRow, InterfaceText, Header,
} from "../Misc";
import {useGlobalState} from "../Hooks";
import styles from "../Styles";
import {useCalendarItems} from "./useCalendarItems";

const useCalendarItemsBySection = () => {
    const { calendarItems } = useCalendarItems();
    const makeListings = enTitleList => calendarItems.filter(c => enTitleList.indexOf(c.title.en) !== -1);
    const calendarTitleSections = [
        {
            sectionTitleKey: "weeklyTorahPortion",
            calendarTitles: [
                "Parashat Hashavua", "Haftarah (A)", "Haftarah (S)", "Haftarah"
            ],
        },
        {
            sectionTitleKey: "dailyLearning",
            calendarTitles: [
                "Daf Yomi", "929", "Daily Mishnah", "Daily Rambam", "Daily Rambam (3 Chapters)", "Halakhah Yomit",
                "Arukh HaShulchan Yomi", "Tanakh Yomi", "Zohar for Elul", "Chok LeYisrael", "Tanya Yomi", "Yerushalmi Yomi"
            ],
        },
        {
            sectionTitleKey: "weeklyLearning",
            calendarTitles: ["Daf a Week"],
        },
    ];
    const calendarItemSections = calendarTitleSections.map(({sectionTitleKey, calendarTitles}) => ({
        sectionTitleKey,
        data: makeListings(calendarTitles),
    }));
    return calendarItemSections;
};

export const LearningSchedulesPage = ({ openRef, openUri, onBack }) => {
    const { theme } = useGlobalState();
    const calendarItemsBySection = useCalendarItemsBySection();
    return (
        <SectionList
            contentContainerStyle={[{paddingHorizontal: 15}, theme.mainTextPanel]}
            sections={calendarItemsBySection}
            stickySectionHeadersEnabled={false}
            ListHeaderComponent={() => <LearningSchedulesPageHeader onBack={onBack} />}
            renderSectionHeader={({ section: { sectionTitleKey } }) => <Header titleKey={sectionTitleKey} />}
            renderItem={({ item }) => (<LearningSchedule calendarItem={item} openRef={openRef} openUri={openUri} />)}
        />
    );
};

const LearningSchedulesPageHeader = ({ onBack }) => {
    const { theme } = useGlobalState();
    return (
        <FlexFrame dir={"column"}>
            <BackButtonRow onPress={onBack} />
            <Header titleKey={"learningSchedules"} />
            <CurrentDate />
            <InterfaceText
                en={"Since biblical times, the Torah has been divided into sections which are read each week on a set yearly calendar. Following this practice, many other calendars have been created to help communities of learners work through specific texts together."}
                he={"מימי קדם חולקה התורה לקטעי קריאה שבועיים שנועדו לסיום הספר כולו במשך תקופת זמן של שנה. בעקבות המנהג הזה התפתחו לאורך השנים סדרי לימוד תקופתיים רבים נוספים, ובעזרתם יכולות קהילות וקבוצות של לומדים ללמוד יחד טקסטים שלמים."}
                extraStyles={[{marginTop: 15, marginBottom: 30}, theme.tertiaryText]}
            />
        </FlexFrame>

    );
};

const CurrentDate = () => {
    const { theme } = useGlobalState();
    const todaysDate = new Date();
    const gregDate = {
        en: Sefaria.util.localeDate(todaysDate, "english"),
        he: Sefaria.util.localeDate(todaysDate, "hebrew"),
    };
    const hebrewDate = {
        en: Sefaria.util.hebrewLocaleDate("english"),
        he: Sefaria.util.hebrewLocaleDate("hebrew"),
    }
    return (
        <View style={{marginTop: 15}}>
            <FlexFrame dir={"row"}>
                <InterfaceText {...gregDate} extraStyles={[{fontStyle: "italic"}, theme.tertiaryText]}/>
                <Text style={[styles.separator, theme.tertiaryText]}> · </Text>
                <InterfaceText {...hebrewDate} extraStyles={[{fontStyle: "italic"}, theme.tertiaryText]}/>
            </FlexFrame>
        </View>
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
    const displaySubtitle = {en: getWrapped(scheduleSubtitle?.en), he: getWrapped(scheduleSubtitle?.he)};
    return { displayTitle, displaySubtitle };
};

const LearningScheduleTitleRow = ({ calendarItem, openRef, openUri }) => {
    const { theme } = useGlobalState();
    const openMainRef = useOpenNthRefOrUrl(0, calendarItem, openRef, openUri);
    const { title, subtitle, subs } = calendarItem;
    const { displayTitle, displaySubtitle } = useLearningScheduleDisplayTitles(title, subtitle, subs);
    return (
        <SefariaPressable onPress={openMainRef} extraStyles={[{marginVertical: 15}]}>
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
            <View style={{marginHorizontal: 8}}>
                <FlexFrame dir={"row"}>
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
            </View>
        </FlexFrame>
    )
};

const LearningScheduleSubtitle = ({ n, subtitle, calendarItem, openRef, openUri }) => {
    const { theme, interfaceLanguage } = useGlobalState();
    const onPress = useOpenNthRefOrUrl(n, calendarItem, openRef, openUri);
    const displaySubtitle = {...subtitle};
    if (n > 0) {
        displaySubtitle.en = `, ${displaySubtitle.en}`;
        displaySubtitle.he = `, ${displaySubtitle.he}`;
    }
    return (
        <View style={{marginTop: interfaceLanguage === "hebrew" ? -5 : 0}}>
            <SefariaPressable onPress={onPress}>
                <ContentTextWithFallback {...displaySubtitle} extraStyles={[theme.tertiaryText]}/>
            </SefariaPressable>
        </View>
    );
};
