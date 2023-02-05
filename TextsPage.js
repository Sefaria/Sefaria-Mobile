import React, {useCallback, useState} from 'react';
import {View, FlatList, Text} from "react-native";
import Sefaria from "./sefaria";
import {CategoryButton, CategoryColorLine, FlexFrame, GreyBoxFrame, LoadingView, SefariaPressable} from "./Misc";
import {useAsyncVariable, useGlobalState} from "./Hooks";
import styles from "./Styles";

const useCategoryButtonProps = (tocItem, setCategories) => {
    const {category, heCategory, enDesc, heDesc, enShortDesc, heShortDesc} = tocItem;
    const title = {
        en: category,
        he: heCategory,
    };
    const description = {
        en: enShortDesc || enDesc,
        he: heShortDesc || heDesc,
    };
    const onPress = useCallback(() => {
        setCategories([category]);
    }, [category]);
    return {
        title, description, onPress,
    }
}

const TopLevelCategoryOrLearningSchedulesBox = ({item, setCategories, openRef}) => (
    item.isSplice ?
        (<LearningSchedulesBox openRef={openRef} />) :
        (<TopLevelCategory item={item} setCategories={setCategories}/>)
);

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
}

const getCalendarItemsForTextsPage = calendarItems => {
    const textsPageCalendarTitles = new Set(['Parashat Hashavua', 'Haftarah (S)', 'Haftarah (A)','Daf Yomi']);
    return calendarItems.filter(item => textsPageCalendarTitles.has(item.title.en));
};

const LearningSchedulesBox = ({item, openRef}) => {
    const { calendarLoaded, calendarItems } = useCalendarItems();
    const textsPageCalendarItems = getCalendarItemsForTextsPage(calendarItems);
    return (
        <GreyBoxFrame>
            <Text>{"Learning Schedules"}</Text>
            { calendarLoaded ?
                <LearningScheduleTable calendarItems={textsPageCalendarItems} openRef={openRef} />
                :
                <LoadingView />
            }
        </GreyBoxFrame>
    );
};

const LearningScheduleTable = ({ calendarItems, openRef }) => {
    return (
        <FlexFrame dir={"column"}>
            {calendarItems.map(item => (
                <LearningScheduleRow calendarItem={item} openRef={openRef} />
            ))}
        </FlexFrame>
    );
};

const LearningScheduleRow = ({ calendarItem, openRef }) => {
    const onPress = () => openRef(calendarItem.refs[0]);
    return (
        <SefariaPressable onPress={onPress}>
            <FlexFrame dir={"row"} justifyContent={"space-between"}>
                <Text style={[styles.flex1]}>{calendarItem.title.en}</Text>
                <Text style={[styles.flex1]}>{calendarItem.refs[0]}</Text>
            </FlexFrame>
        </SefariaPressable>
    );
};

const TopLevelCategory = ({item: tocItem, setCategories}) => {
    const categoryButtonProps = useCategoryButtonProps(tocItem, setCategories);
    return (
        <View>
            <CategoryColorLine category={tocItem.category} thickness={4}/>
            <CategoryButton {...categoryButtonProps} />
        </View>
    );
};

const TextsPageHeader = () => {
    return (
        <View>
            <Text>{"Browse the Library"}</Text>
        </View>
    );
};

export const TextsPage = ({setCategories, openRef}) => {
    const { theme } = useGlobalState();
    const tocItems = Sefaria.tocItemsByCategories([]);
    const data = [...tocItems];
    data.splice(3, 0, {isSplice: true});
    return (
        <FlatList
            data={data}
            contentContainerStyle={[{paddingHorizontal: 15}, theme.mainTextPanel]}
            ListHeaderComponent={TextsPageHeader}
            keyExtractor={item => item.isSplice ? 'splice' : item.category}
            renderItem={props => (
                <TopLevelCategoryOrLearningSchedulesBox
                    {...props}
                    setCategories={setCategories}
                    openRef={openRef}
                />
            )}
        />
    );
};