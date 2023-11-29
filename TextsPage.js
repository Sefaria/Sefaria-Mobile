import React, {useCallback}  from 'react';
import {View, FlatList} from "react-native";
import Sefaria from "./sefaria";
import {
    CategoryButton,
    CategoryColorLine,
    FlexFrame,
    LanguageToggleButton,
    PageHeader,
    InterfaceText,
    SefariaPressable, Header,
} from "./Misc";
import styles from "./Styles";
import {LearningSchedulesBox} from "./learningSchedules/LearningSchedulesBox";
import {useGlobalState} from "./Hooks";
import {TextCategoryPage} from "./TextCategoryPage";
import {ShortDedication} from "./Dedication";

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

const TextsPageLearningSchedulesBox = ({ openRef, openLearningSchedules }) => {
    const { theme } = useGlobalState();
    return (
        <View style={{marginBottom: 20}}>
            <LearningSchedulesBox openRef={openRef} desiredCalendarTitles={['Parashat Hashavua', 'Haftarah', 'Daf Yomi']}>
                <FlexFrame dir={"row"} justifyContent={"space-between"}>
                    <InterfaceText stringKey={"learningSchedules"} extraStyles={[styles.fontSize16, styles.fontBold, theme.tertiaryText]}/>
                    <SefariaPressable onPress={openLearningSchedules}>
                        <InterfaceText stringKey={"seeAll"} extraStyles={[styles.fontSize16, theme.secondaryText]}/>
                    </SefariaPressable>
                </FlexFrame>
            </LearningSchedulesBox>
        </View>
    );
};

const TopLevelCategoryOrLearningSchedulesBox = ({item, setCategories, openRef, openLearningSchedules}) => (
    item.isSplice ?
        (<TextsPageLearningSchedulesBox openRef={openRef} openLearningSchedules={openLearningSchedules}/>) :
        (<TopLevelCategory item={item} setCategories={setCategories}/>)
);

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
        <FlexFrame dir={"row"} justifyContent={"space-between"} alignItems={"center"}>
            <PageHeader><Header titleKey={"browseTheLibrary"}/></PageHeader>
            <LanguageToggleButton />
        </FlexFrame>
    );
};

export const TextsPage = ({categories, setCategories, openRef, openLearningSchedules, onBack, openDedication}) => {
    const { theme } = useGlobalState();

    if (categories.length) {
        return (
            <TextCategoryPage
                categories={categories}
                setCategories={setCategories}
                openRef={openRef}
                onBack={onBack}
            />
        )
    }

    const data = Sefaria.getRootTocItems();
    data.splice(3, 0, {isSplice: true});
    return (
        // outer view with flexDirection row properly bounds the FlatList so it doesn't overflow horizontally on some displays.
        <View style={{flex: 1, flexDirection: "row"}}>
            <FlatList
                data={data}
                contentContainerStyle={[{paddingHorizontal: 15, alignSelf: "stretch"}, theme.mainTextPanel]}
                ListHeaderComponent={TextsPageHeader}
                ListFooterComponent={
                    <ShortDedication
                        openDedication={openDedication}
                    />
                }
                keyExtractor={item => item.isSplice ? 'splice' : item.category}
                renderItem={({ item }) => (
                    <TopLevelCategoryOrLearningSchedulesBox
                        item={item}
                        setCategories={setCategories}
                        openRef={openRef}
                        openLearningSchedules={openLearningSchedules}
                    />
                )}
            />
        </View>
    );
};
