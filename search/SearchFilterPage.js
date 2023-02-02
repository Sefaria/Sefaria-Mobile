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
    ButtonToggleSet,
    LibraryNavButton,
    SystemButton,
    IndeterminateCheckBox, Icon, FlexFrame, ContentTextWithFallback, LocalSearchBar,
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

const useSearchFilterCallbacks = (searchType, openSubMenu, toggleFilter, clearAllFilters, search, query) => {
    const toggleFilterBound = filter => {
        toggleFilter(searchType, filter);
    };
    const onResetPress = () => {
        clearAllFilters(searchType);
    }
    const onSetSearchOptions = () => search(searchType, query, true, false, true);
    const applyFilters = () => {
        openSubMenu(null);
        search(searchType, query, true, false);
    };

    return {
        toggleFilterBound,
        onResetPress,
        onSetSearchOptions,
        applyFilters,
    };
}

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
    const { toggleFilterBound, onResetPress, onSetSearchOptions, applyFilters } = useSearchFilterCallbacks(searchState.type, openSubMenu, toggleFilter, clearAllFilters, search, query);
    const buttonToggleSetData = new ButtonToggleSetData(searchState.type, searchState, setSearchOptions, onSetSearchOptions);
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
            <SearchFooterFrame>
                <ShowResultsButton applyFilters={applyFilters} />
            </SearchFooterFrame>
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

const SearchFooterFrame = ({ children }) => {
    const { theme } = useGlobalState();
    return (
        <View style={[{padding: 15, borderTopWidth: 1}, theme.lightGreyBorder]}>
            { children }
        </View>
    );
};

const ShowResultsButton = ({ applyFilters }) => {
    const { interfaceLanguage } = useGlobalState();
   return (
       <SystemButton
           onPress={applyFilters}
           text={strings.showResults}
           isBlue
           isHeb={interfaceLanguage === "hebrew"}
       />
   );
}

const RootFilterButtons = ({ onResetPress, buttonToggleSetData }) => {
    return (
        <View>
            <ResetButton onPress={onResetPress}/>
            <TitledButtonToggleSet {...buttonToggleSetData.get(strings.sortBy)} />
        </View>
    )
}

const SearchFilter = ({filterNode, openSubMenu, toggleFilter}) => {
    const { theme } = useGlobalState();
    const {title, heTitle, selected, children, docCount} = filterNode;
    const clickCheckBox = () => toggleFilter(filterNode);
    const onPress = () => { openSubMenu ? openSubMenu(title) : clickCheckBox() }
    const countStr = `(${docCount})`;
    return (
        <TouchableOpacity onPress={onPress}>
            <FlexFrame justifyContent={"space-between"}>
                <FlexFrame>
                    <IndeterminateCheckBox onPress={clickCheckBox} state={selected} />
                    <ContentTextWithFallback en={title} he={heTitle} />
                    <ContentTextWithFallback en={countStr} he={countStr} extraStyles={[theme.tertiaryText]} />
                </FlexFrame>
                <Icon name={'forward'} length={12} />
            </FlexFrame>
        </TouchableOpacity>
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
        this._data = {
            [strings.sortBy]:
                {
                    title: strings.sortBy,
                    options: this._getSortOptions(),
                    active: this.searchState.sortType
                },
            [strings.exactSearch]:
                {
                    title: strings.exactSearch,
                    options: this._getExactOptions(),
                    active: this.searchState.field === this.searchState.fieldExact
                },
        };
    }

    get = (title) => {
        return this._data[title];
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

class FilterSearcher {
    constructor(filters) {
        this.filters = filters;
    }
    static _escapeQuery = query => query.replace("-", "\-").replace(/[^\w\s\-]/g, "");
    static _getRegex = query => new RegExp(`(?:^|.+\\s)${query}.*`, "i");
    static _queryMatchesText = (query, text) => text.match(this._getRegex(query));
    static _queryMatchesFilter = (query, filter) => (
       filter.selected ||
       this._queryMatchesText(query, filter.title) ||
       this._queryMatchesText(query, filter.heTitle)
    );

    static _hasWordStartingWithOrSelected = (filter, query) => {
        const escapedQuery = this._escapeQuery(query);
        return this._hasWordStartingWithOrSelectedRecursive(filter, escapedQuery);
    };

    static _hasWordStartingWithOrSelectedRecursive = (filter, escapedQuery) => {
        if (this._queryMatchesFilter(escapedQuery, filter)) {
            return true;
        } else {
            return filter.children.filter(x => this._hasWordStartingWithOrSelectedRecursive(x, escapedQuery)).length > 0;
        }
    };

    static wordSelected = (filter) => filter.selected ? -1 : 1;

    search = (query, sorted) => {
        const hasQuery = query && query !== "";
        const matchingFilters = this.filters.filter(x => hasQuery ? FilterSearcher._hasWordStartingWithOrSelected(x, query) : true);
        if (sorted) {
            matchingFilters.sort(FilterSearcher.wordSelected);
        }
        return matchingFilters;
    };
}

const FiltersList = ({filters, filtersValid, openSubMenu, toggleFilter}) => {
    const {theme, interfaceLanguage} = useGlobalState();
    const [filterQuery, setFilterQuery] = React.useState("");
    const onFilterQueryChange = query => setFilterQuery(query);
    const filterSearcher = new FilterSearcher(filters);
    const langStyle = interfaceLanguage === "hebrew" ? styles.heInt : styles.enInt;
    let loadingMessage = (<Text style={[langStyle, theme.searchResultSummaryText]}>{strings.loadingFilters}</Text>);
    return (
        <View>
            <LocalSearchBar onChange={onFilterQueryChange} query={filterQuery} />
            {
                filtersValid ? filterSearcher.search(filterQuery, true).map((filter, ifilter) => {
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

const TitledButtonToggleSet = ({ title, options, active }) => {
    const { interfaceLanguage } = useGlobalState();
    return (
        <View style={styles.settingsSection} key={title}>
            <ButtonToggleSetTitle title={title}/>
            <ButtonToggleSet
                options={options}
                lang={interfaceLanguage}
                active={active}/>
        </View>
    );
};


