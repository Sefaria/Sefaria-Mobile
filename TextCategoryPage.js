import React from "react";
import {SectionList, View} from "react-native";
import {useGlobalState} from "./Hooks";
import {
    BackButtonRow,
    CategoryButton, CategoryColorLine,
    ContentTextWithFallback,
    FlexFrame,
    InterfaceText,
    LanguageToggleButton, SefariaPressable
} from "./Misc";
import Sefaria from "./sefaria";
import {LearningSchedulesBoxFactory} from "./learningSchedules/LearningSchedulesBox";

/**
 * Return modified categories for cases with category toggles
 * @param categories
 * @returns {string[]|*}
 */
const getDisplayCategories = (categories) => {
    return categories[0] === "Talmud" && categories.length === 1 ?
        ["Talmud", "Bavli"]
        : (categories[0] === "Tosefta" && categories.length === 1) ?
            ["Tosefta", "Vilna Edition"]
            : categories;
};

const getCategoryTitle = (displayCategories) => {
    if ((displayCategories[0] === "Talmud" || displayCategories[0] === "Tosefta") && displayCategories.length === 2) {
        const tocItem = Sefaria.tocObjectByCategories([displayCategories[0]]);
        return {
            en: tocItem.category.toUpperCase(),
            he: tocItem.heCategory,
        };
    } else {
        const lastCat = displayCategories.slice(-1)[0];
        if (lastCat === "Commentary") {
            const tocItem = Sefaria.tocObjectByCategories(displayCategories.slice(0, -1));
            return {
                en: `${tocItem.category} Commentary`.toUpperCase(),
                he: `${tocItem.heCategory} מפרשים`,
            };
        } else {
            const tocItem = Sefaria.tocObjectByCategories(displayCategories);
            return {
                en: tocItem.category.toUpperCase(),
                he: tocItem.heCategory,
            };
        }
    }
}

const getCategoryDescription = categories => {
    const aboutCategories = categories[0] === "Talmud" && categories.length === 2 ?
        ["Talmud"] : categories;
    const tocItem = Sefaria.tocObjectByCategories(aboutCategories);
    return {
        en: tocItem.enDesc,
        he: tocItem.heDesc,
    };
};

const hebrewContentSort = (enCats) => {
    // Sorts contents of this category by Hebrew Alphabetical
    //console.log(cats);
    const heCats = enCats.slice().map(function(item, indx) {
        item.enOrder = indx;
        return item;
    });

    // If all of the cats have a base_text_order, don't re-sort.
    if (heCats.every(c => !!c.base_text_order))   {
        return heCats;
    }
    heCats.sort(function(a, b) {
        if ("order" in a || "order" in b) {
            //positive order first, then no order, negative order last
            const aOrder = "order" in a ? -1/a.order : 0;
            const bOrder = "order" in b ? -1/b.order : 0;
            return aOrder > bOrder ? 1 : -1;

        } else if (("category" in a) !== ("category" in b)) {
            return a.enOrder > b.enOrder ? 1 : -1;

            //} else if (a.heComplete !== b.heComplete) {
            //  return a.heComplete ? -1 : 1;

        } else if (a.heTitle && b.heTitle) {
            return a.heTitle > b.heTitle ? 1 : -1;

        }
        return a.enOrder > b.enOrder ? 1 : -1;
    });
    //console.log(heCats)
    return heCats;
};

class DisplayTocItem {
    constructor({tocItem, categories, children}) {
        this.isCategory = !!tocItem.category;
        this.title = this.getTitleFromTocItem(tocItem);
        this.description = this.getDescriptionFromTocItem(tocItem);
        this.categories = categories;
        this.children = children;
        if (!this.isCategory) {
            this.oref = this.getOref(tocItem);
        }
    }

    getTitleFromTocItem = tocItem => {
        if (this.isCategory) {
            return { en: tocItem.category, he: tocItem.heCategory };
        }
        return { en: tocItem.title, he: tocItem.heTitle };
    };

    getDescriptionFromTocItem = tocItem => {
        return {
            en: tocItem.enShortDesc,
            he: tocItem.heShortDesc,
        };
    };

    getOref = tocItem => {
        let oref = Sefaria.history.getHistoryRefForTitle(tocItem.title);
        if (!oref) {
            oref = { ref: tocItem.firstSection };
        }
        return oref;
    };

    isNested = () => this.children?.length > 0;
    isDescriptionLong = lang => this.description[lang].split(" ").length > 5;
}

const getDisplayTocItems = (displayCategories, nestLevel, contentLang) => {
    const displayTocItems = [];
    const contents = Sefaria.tocItemsByCategories(displayCategories);
    const sortedContents = contentLang === "hebrew" ? hebrewContentSort(contents) : contents;

    for (const tocItem of sortedContents) {
        if (tocItem.hidden) { continue; }
        if (tocItem.category) {
            const newCats = displayCategories.concat(tocItem.category);
            // Category
            if (tocItem.isPrimary || nestLevel > 0) {
                // There's just one text in this category, render the text.
                if(tocItem.contents && tocItem.contents.length === 1 && !("category" in tocItem.contents[0])) {
                    const chItem = tocItem.contents[0];
                    if (chItem.hidden) { continue; }
                    displayTocItems.push(new DisplayTocItem({ tocItem: chItem }));
                } else {
                    // Create a link to a subcategory
                    displayTocItems.push(new DisplayTocItem({ tocItem, categories: newCats }));
                }
            } else {
                const children = getDisplayTocItems(newCats, nestLevel + 1, contentLang);
                displayTocItems.push(new DisplayTocItem({ tocItem, categories: newCats, children }));
            }
        } else if (tocItem.isCollection) {
            // Add a Collection
            displayTocItems.push(new DisplayTocItem({ tocItem }));
        } else {
            // Add a Text
            displayTocItems.push(new DisplayTocItem({ tocItem }));
        }
    }
    return displayTocItems;
};

const getSections = (displayCategories, nestLevel, textLanguage) => {
    const displayTocItems = getDisplayTocItems(displayCategories, nestLevel, textLanguage);
    const sections = [];
    let currentRun = [];
    for (const item of displayTocItems) {
        // Walk through content looking for runs of texts/subcats to group together into a table
        if (item.isNested()) {
            if (currentRun.length) {
                sections.push({item: null, data: currentRun});
                currentRun = [];
            }
            sections.push({item, data: item.children});
        } else {
            // this is a single text
            currentRun.push(item);
        }
    }
    if (currentRun.length) {
        sections.push({item: null, data: currentRun});
    }
    return sections;
}

const useSectionsAndDisplayCategories = (categories) => {
    const { textLanguage } = useGlobalState();
    const displayCategories = getDisplayCategories(categories);
    const nestLevel   = displayCategories.slice(-1)[0] === "Commentary" ? 1 : 0;
    const sections = getSections(displayCategories, nestLevel, textLanguage);

    return { sections, displayCategories };
}

const getTocItemOnPress = (displayTocItem, setCategories, openRef) => {
    if (displayTocItem.isCategory) {
        return () => setCategories(displayTocItem.categories);
    }

    return () => openRef(displayTocItem.oref.ref, displayTocItem.oref.versions);
};

const getSubCategoryToggle = categories => {
    const toggleEnableMap = {
        "Talmud": {
            categoryPathDepth: 2,
            subCategories: ["Bavli", "Yerushalmi"],
            subCategoriesDisplay: [{en: "Babylonian", he: "בבלי"}, {en: "Jerusalem", he: "ירושלמי"}]
        },
        "Tosefta": {
            categoryPathDepth: 2,
            subCategories: ["Vilna Edition", "Lieberman Edition"],
            subCategoriesDisplay: [{en: "Vilna", he: "דפוס וילנא"}, {en: "Lieberman", he: "מהדורת ליברמן"}]
        },
    };
    if (!categories.length || !(categories[0] in toggleEnableMap) || categories.length !== toggleEnableMap[categories[0]]["categoryPathDepth"]) {
        return null;
    }
    return toggleEnableMap[categories[0]];
};

const SubCategoryToggle = ({displayCategories, setCategories}) => {
    const { theme } = useGlobalState();
    const toggleData = getSubCategoryToggle(displayCategories);
    if (!toggleData) { return null; }
    const options = toggleData["subCategories"].map((element, index) => {
        const toggleFunc = () => setCategories([displayCategories[0], element]); //this may need some adjustment if there ever was another toggle not at dpeth 2
        const toggleTitle = toggleData["subCategoriesDisplay"][index];
        const active = displayCategories[1] === element;
        return(
            <SefariaPressable onPress={toggleFunc} key={toggleTitle.en} extraStyles={[{borderBottomWidth: active ? 2 : 0, marginBottom: 17, marginRight: 10}, theme.borderDarker]}>
                <ContentTextWithFallback {...toggleTitle} extraStyles={[{textTransform: "uppercase"}, active ? theme.text : theme.tertiaryText]}/>
            </SefariaPressable>
        );
    });
    return (
        <FlexFrame dir={"row"}>
            {options}
        </FlexFrame>
    );
};


const TextCategoryHeader = ({ title, description, onBack, displayCategories, setCategories, openRef }) => {
    const { theme } = useGlobalState();
    return (
        <FlexFrame dir={"column"}>
            <FlexFrame dir={"row"} justifyContent={"space-between"} alignItems={"center"}>
                <BackButtonRow onPress={onBack} />
                <LanguageToggleButton />
            </FlexFrame>
            <FlexFrame dir={"column"}>
                <ContentTextWithFallback {...title} extraStyles={[{fontSize: 30, marginTop: 4}, theme.text]} />
                <SubCategoryToggle displayCategories={displayCategories} setCategories={setCategories} />
            </FlexFrame>
            <InterfaceText {...description} extraStyles={[theme.tertiaryText]}/>
            <LearningSchedulesBoxFactory categories={displayCategories} openRef={openRef} extraStyles={{marginTop: 30}}/>
        </FlexFrame>
    );
};

const SectionHeader = ({ displayTocItem }) => {
    if (!displayTocItem) { return null; }
    const { theme, menuLanguage } = useGlobalState();
    const { title, description } = displayTocItem;
    const getTitleWithDescription = lang => {
        let str = title[lang];
        if (lang === 'en') { str = str.toUpperCase(); }
        if (!description[lang] || displayTocItem.isDescriptionLong(lang)) {
            return str;
        }
        return `${str} (${description[lang]})`;
    }
    const displayTitle = {
        en: getTitleWithDescription('en'),
        he: getTitleWithDescription('he'),
    };
    const titleComponent = <ContentTextWithFallback {...displayTitle} lang={menuLanguage} extraStyles={[{fontSize: 24, paddingTop: 30}, theme.tertiaryText]} />;
    const currLangCode = menuLanguage.substring(0, 2);
    return (
        <FlexFrame dir={"column"}>
            { titleComponent }
            { displayTocItem.isDescriptionLong(currLangCode) ? (
                <InterfaceText {...description} lang={menuLanguage} extraStyles={[{fontSize: 14, marginBottom: 20}, theme.tertiaryText]}/>
            ) : null}
            <TextCategorySeparator />
        </FlexFrame>
    );
};

const TextCategorySeparator = () => {
    const { theme } = useGlobalState();
    return <View style={[{height: 1}, theme.lighterGreyBackground]} />;
};

export const TextCategoryPage = ({categories, setCategories, openRef, onBack}) => {
    const { theme } = useGlobalState();
    const { sections, displayCategories } = useSectionsAndDisplayCategories(categories);
    const categoryTitle = getCategoryTitle(displayCategories);
    const categoryDescription = getCategoryDescription(categories);

    return (
        <FlexFrame dir={"column"} flex={1} alignSelf={"stretch"} key={categories}>
            <CategoryColorLine category={displayCategories[0]} thickness={4} />
            <SectionList
                sections={sections}
                stickySectionHeadersEnabled={false}
                contentContainerStyle={[{paddingHorizontal: 15}, theme.mainTextPanel]}
                ItemSeparatorComponent={TextCategorySeparator}
                ListHeaderComponent={() => (
                    <TextCategoryHeader
                        title={categoryTitle}
                        description={categoryDescription}
                        onBack={onBack}
                        displayCategories={displayCategories}
                        categories={categories}
                        setCategories={setCategories}
                        openRef={openRef}
                    />
                )}
                renderSectionHeader={({section: { item }}) => <SectionHeader displayTocItem={item} /> }
                renderItem={({ item: displayTocItem }) => (
                    <CategoryButton
                        title={displayTocItem.title}
                        description={displayTocItem.description}
                        onPress={getTocItemOnPress(displayTocItem, setCategories, openRef)}
                    />
                )}
            />
        </FlexFrame>
    );
};
