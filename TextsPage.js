import React, {useCallback} from 'react';
import {View, FlatList, Text} from "react-native";
import Sefaria from "./sefaria";
import {CategoryButton, CategoryColorLine} from "./Misc";

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

export const TextsPage = ({setCategories}) => {
    const tocItems = Sefaria.tocItemsByCategories([]);
    return (
        <FlatList
            data={tocItems}
            contentContainerStyle={{paddingHorizontal: 15}}
            ListHeaderComponent={TextsPageHeader}
            renderItem={props => <TopLevelCategory {...props} setCategories={setCategories}/>}
        />
    );
};