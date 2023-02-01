'use strict';

import PropTypes from 'prop-types';
import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    ScrollView,
    Image,
} from 'react-native';

import {FilterNode, SearchPropTypes} from '@sefaria/search';
import {
    DirectedButton,
    ButtonToggleSet,
    LibraryNavButton,
} from '../Misc.js';
import styles from '../Styles';
import strings from '../LocalizedStrings';
import {iconData} from "../IconData";
import {useGlobalState} from "../Hooks";

const getCurrFilters = (searchState, subMenuOpen) => {
    if (subMenuOpen === "filter") {
        return searchState.availableFilters;
    }
    const currFilter = FilterNode.findFilterInList(searchState.availableFilters, subMenuOpen);
    return [currFilter].concat(currFilter.getLeafNodes());
};

export const SearchFilterPage = ({
    subMenuOpen,
    toggleFilter,
    clearAllFilters,
    query,
    openSubMenu,
    search,
    setSearchOptions,
    searchState,
}) => {
    const {type} = searchState;
    const toggleFilterBound = filter => {
        toggleFilter(type, filter);
    };
    const onResetPress = () => {
        clearAllFilters(type);
    }
    const onSetSearchOptions = () => search(type, query, true, false, true);

    const buttonToggleSetData = new ButtonToggleSetData(type, searchState, setSearchOptions, onSetSearchOptions);
    return (
        <View style={{flex: 1}}>
            <ScrollView key={subMenuOpen} contentContainerStyle={styles.menuContent}
                        style={styles.scrollViewPaddingInOrderToScroll}>
                { subMenuOpen === "filter" ? (
                    <RootFilterButtons buttonToggleSetData={buttonToggleSetData} onResetPress={onResetPress} />
                ) : null}
                <FiltersList
                    filters={getCurrFilters(searchState, subMenuOpen)}
                    filtersValid={searchState.filtersValid}
                    openSubMenu={openSubMenu}
                    toggleFilter={toggleFilterBound}
                />
            </ScrollView>
        </View>);
}
SearchFilterPage.propTypes = {
    subMenuOpen: PropTypes.string.isRequired,
    toggleFilter: PropTypes.func.isRequired,
    clearAllFilters: PropTypes.func.isRequired,
    query: PropTypes.string,
    openSubMenu: PropTypes.func,
    search: PropTypes.func,
    setSearchOptions: PropTypes.func,
    searchState: PropTypes.object,
};

const RootFilterButtons = ({ onResetPress, buttonToggleSetData }) => {
    return (
        <View>
            <ResetButton onPress={onResetPress}/>
            <SearchButtonToggles buttonToggleSetData={buttonToggleSetData}/>
        </View>
    )
}

const SearchFilter = ({filterNode, openSubMenu, toggleFilter}) => {
    const clickCheckBox = () => {
        toggleFilter(filterNode);
    }
    const onPress = () => {
        openSubMenu ? openSubMenu(title) : clickCheckBox()
    }
    const {title, heTitle, selected, children, docCount} = filterNode;
    let isCat = children.length > 0;
    let catColor = Sefaria.palette.categoryColor(title.replace(" Commentaries", ""));
    let enTitle = isCat ? title.toUpperCase() : title;
    return (
        <LibraryNavButton
            onPress={onPress}
            onPressCheckBox={clickCheckBox}
            checkBoxSelected={selected}
            enText={enTitle}
            count={docCount}
            heText={heTitle}
            catColor={isCat ? catColor : null}
            withArrow={!!openSubMenu}
            buttonStyle={{margin: 2, paddingVertical: 0, paddingHorizontal: 5,}}/>
    );
}
SearchFilter.propTypes = {
    filterNode: SearchPropTypes.filterNode,
    openSubMenu: PropTypes.func,
    toggleFilter: PropTypes.func.isRequired,
};

class ButtonToggleSetData {

    constructor(type, searchState, setOptions, onSetOptions) {
        this.setOptions = setOptions;
        this.type = type;
        this.searchState = searchState;
        this.onSetOptions = onSetOptions;
    }

    getData = () => {
        return [
            {title: strings.sortBy, options: this._getSortOptions(), active: this.searchState.sortType},
            {
                title: strings.exactSearch,
                options: this._getExactOptions(),
                active: this.searchState.field === this.searchState.fieldExact
            },
        ];
    };

    _getSortOptions = () => {
        return [
            {
                name: "chronological", text: strings.chronological, onPress: () => {
                    this.setOptions(this.type, "chronological", this.searchState.field);
                }
            },
            {
                name: "relevance", text: strings.relevance, onPress: () => {
                    this.setOptions(this.type, "relevance", this.searchState.field);
                }
            }
        ];
    };

    _getExactOptions = () => {
        return [
            {
                name: false, text: strings.off, onPress: () => {
                    this.setOptions(this.type, this.searchState.sortType, this.searchState.fieldBroad, this.onSetOptions);
                }
            },
            {
                name: true, text: strings.on, onPress: () => {
                    this.setOptions(this.type, this.searchState.sortType, this.searchState.fieldExact, this.onSetOptions);
                }
            }
        ];
    };
}

const SearchButtonToggles = ({buttonToggleSetData}) => {
    const {interfaceLanguage} = useGlobalState();
    return (
        <View>
            {buttonToggleSetData.getData().map(({title, options, active}) => (
                <View style={styles.settingsSection} key={title}>
                    <ButtonToggleSetTitle title={title}/>
                    <ButtonToggleSet
                        options={options}
                        lang={interfaceLanguage}
                        active={active}/>
                </View>
            ))}
        </View>
    )
}

const FiltersList = ({filters, filtersValid, openSubMenu, toggleFilter}) => {
    const {theme, interfaceLanguage} = useGlobalState();
    const langStyle = interfaceLanguage === "hebrew" ? styles.heInt : styles.enInt;
    let loadingMessage = (<Text style={[langStyle, theme.searchResultSummaryText]}>{strings.loadingFilters}</Text>);
    return (
        <View>
            {
                filtersValid ? filters.map((filter, ifilter) => {
                    return (
                        <SearchFilter
                            key={ifilter}
                            filterNode={filter}
                            openSubMenu={openSubMenu}
                            toggleFilter={toggleFilter}
                        />);
                }) : loadingMessage
            }
        </View>
    )
}

const ResetButton = ({onPress}) => {
    const {theme, themeStr, interfaceLanguage} = useGlobalState();
    let closeSrc = iconData.get('circle-close', themeStr);
    let isheb = interfaceLanguage === "hebrew"; //TODO enable when we properly handle interface hebrew throughout app
    return (
        <TouchableOpacity
            style={[styles.readerDisplayOptionsMenuItem, styles.button, theme.readerDisplayOptionsMenuItem]}
            onPress={onPress}>
            <Image source={closeSrc}
                   resizeMode={'contain'}
                   style={styles.searchFilterClearAll}/>
            <Text
                style={[isheb ? styles.heInt : styles.enInt, styles.heInt, theme.tertiaryText]}>{strings.clearAll}</Text>

        </TouchableOpacity>
    )
}

const ButtonToggleSetTitle = ({title}) => {
    const {interfaceLanguage, theme} = useGlobalState();
    const langStyle = interfaceLanguage === "hebrew" ? styles.heInt : styles.enInt;
    return (
        <View>
            <Text style={[langStyle, styles.settingsSectionHeader, theme.tertiaryText]}>
                {title}
            </Text>
        </View>
    );
};
