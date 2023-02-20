'use strict';

import PropTypes from 'prop-types';
import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    SectionList,
} from 'react-native';

import {SearchPropTypes} from '@sefaria/search';
import {
    ButtonToggleSet,
    SystemButton,
    IndeterminateCheckBox,
    Icon,
    FlexFrame,
    ContentTextWithFallback,
    BackButtonRow,
    SefariaPressable,
    InterfaceText, Header, CondensedSearchBar,
} from '../Misc.js';
import styles from '../Styles';
import strings from '../LocalizedStrings';
import {iconData} from "../IconData";
import {FilterSearcher} from "./FilterSearcher";
import {useGlobalState} from "../Hooks";

const getCurrFilters = (filtersValid, availableFilters) => {
    if (!filtersValid) {
        return [];
    }
    return availableFilters;
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

const organizeFiltersAsSections = (filters, expandedCategories) => (
    filters.map(filterNode => {
        const expanded = expandedCategories.has(filterNode.title);
        return {
            filterNode,
            expanded,
            data: expanded ? filterNode.getLeafNodes() : [],
        };
    })
);

const useFilterSearcher = (filtersValid, availableFilters) => {
    const [filterQuery, setFilterQuery] = React.useState("");
    const [expandedFilterCategories, setExpandedFilterCategories] = React.useState(new Set());
    const filterSections = React.useMemo(() => {
        const filterSearcher = new FilterSearcher(getCurrFilters(filtersValid, availableFilters));
        const displayedFilters = filterSearcher.getMatchingFilterTree(filterQuery, false);
        return organizeFiltersAsSections(displayedFilters, expandedFilterCategories);
    }, [filtersValid, availableFilters, filterQuery, expandedFilterCategories]);
    const onFilterQueryChange = React.useCallback(query => {
        let newExpandedCategories;
        if (query) {
            // expand all filter sections to show query results
            newExpandedCategories = filterSections.map(filterSection => filterSection.filterNode.title)
        } else {
            // close all filter sections when clearing query
            newExpandedCategories = [];
        }
        setExpandedFilterCategories(new Set(newExpandedCategories));
        setFilterQuery(query);
    }, [filterSections]);
    return {
        filterSections,
        onFilterQueryChange,
        setExpandedFilterCategories,
        filterQuery,
    };
};

const FilterLoadingView = () => {
    const {theme, interfaceLanguage} = useGlobalState();
    const langStyle = interfaceLanguage === "hebrew" ? styles.heInt : styles.enInt;
    return (
        <Text style={[langStyle, theme.searchResultSummaryText]}>
            {strings.loadingFilters}
        </Text>
    );
}

const TopHeaderRow = ({ onBack, onResetPress }) => {
    const { theme } = useGlobalState();
    return (
        <FlexFrame dir={"row"} justifyContent={"space-between"} alignItems={"center"}>
            <BackButtonRow onPress={onBack} />
            <SefariaPressable onPress={onResetPress}>
                <FlexFrame dir={"row"} alignItems={"center"}>
                    <InterfaceText stringKey={"reset"} extraStyles={[theme.secondaryText, {paddingHorizontal: 7}]}/>
                    <Icon name={"circle-close"} length={13} />
                </FlexFrame>
            </SefariaPressable>
        </FlexFrame>
    );
};

const SearchFilterHeader = ({ onBack, onResetPress, buttonToggleSetData, onFilterQueryChange, filterQuery }) => {
    const { theme } = useGlobalState();
    return (
        <View>
            <TopHeaderRow onBack={onBack} onResetPress={onResetPress} />
            <TitledButtonToggleSet {...buttonToggleSetData.get(strings.sortBy)} />
            <View style={[{borderBottomWidth: 1, paddingVertical: 8}, theme.lightGreyBorder]}>
                <Header titleKey={"text"} />
            </View>
            <View style={{marginVertical: 16}}>
                <CondensedSearchBar onChange={onFilterQueryChange} query={filterQuery} placeholder={"Search texts"} />
            </View>
        </View>
    );
};

export const SearchFilterPage = ({
    toggleFilter,
    clearAllFilters,
    query,
    openSubMenu,
    search,
    setSearchOptions,
    searchState,
    onBack,
}) => {
    const { toggleFilterBound, onResetPress, onSetSearchOptions, applyFilters } = useSearchFilterCallbacks(searchState.type, openSubMenu, toggleFilter, clearAllFilters, search, query);
    const { filterSections, onFilterQueryChange, filterQuery, setExpandedFilterCategories } = useFilterSearcher(searchState.filtersValid, searchState.availableFilters);
    const expandFilter = (title) => setExpandedFilterCategories(prev => {
        const next = new Set(prev);
        if (next.has(title)) {
            next.delete(title);
        } else {
            next.add(title);
        }
        return next;
    })
    const buttonToggleSetData = new ButtonToggleSetData(searchState.type, searchState, setSearchOptions, onSetSearchOptions);
    return (
        <View style={styles.flex1}>
            <SectionList
                contentContainerStyle={styles.menuContent}
                sections={filterSections}
                keyExtractor={item => item.title}
                renderSectionHeader={({ section: { filterNode, expanded } }) => (
                    <SearchFilter
                        toggleFilter={toggleFilterBound}
                        filterNode={filterNode}
                        expandFilter={expandFilter}
                        expanded={expanded}
                    />
                )}
                renderItem={({ item: filterNode}) => (
                    <SearchFilter
                        toggleFilter={toggleFilterBound}
                        filterNode={filterNode}
                        indented
                    />
                )}
                ListHeaderComponent={() => (
                    <SearchFilterHeader
                        onBack={onBack}
                        onResetPress={onResetPress}
                        buttonToggleSetData={buttonToggleSetData}
                        onFilterQueryChange={onFilterQueryChange}
                        filterQuery={filterQuery}
                    />
                )}
                ListEmptyComponent={() => !searchState.filtersValid && <FilterLoadingView />}
            />
            <SearchFooterFrame>
                <ShowResultsButton applyFilters={applyFilters} />
            </SearchFooterFrame>
        </View>);
}
SearchFilterPage.propTypes = {
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

const SearchFilter = ({filterNode, expandFilter, toggleFilter, indented, expanded}) => {
    const { theme } = useGlobalState();
    const {title, heTitle, selected, docCount} = filterNode;
    const clickCheckBox = () => toggleFilter(filterNode);
    const onPress = () => { expandFilter ? expandFilter(title) : clickCheckBox() }
    const countStr = `(${docCount})`;
    return (
        <TouchableOpacity onPress={onPress} style={{marginLeft: indented ? 30 : 0}}>
            <FlexFrame justifyContent={"space-between"}>
                <FlexFrame>
                    <IndeterminateCheckBox onPress={clickCheckBox} state={selected} />
                    <ContentTextWithFallback en={title} he={heTitle} />
                    <ContentTextWithFallback en={countStr} he={countStr} extraStyles={[theme.tertiaryText]} />
                </FlexFrame>
                { !indented && <Icon name={expanded ? 'down' : 'forward'} length={12} /> }
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
                    titleKey: "sortBy",
                    options: this._getSortOptions(),
                    active: this.searchState.sortType
                },
            [strings.exactSearch]:
                {
                    titleKey: "options",
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
                name: "relevance", text: strings.relevance, onPress: () => {
                    this.setOptions(this.type, "relevance", this.searchState.field);
                }
            },
            {
                name: "chronological", text: strings.chronological, onPress: () => {
                    this.setOptions(this.type, "chronological", this.searchState.field);
                }
            },
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

const TitledButtonToggleSet = ({ titleKey, options, active }) => {
    const { theme, interfaceLanguage } = useGlobalState();
    return (
        <View>
            <View style={[{borderBottomWidth: 1, paddingVertical: 8}, theme.lightGreyBorder]}>
                <Header titleKey={titleKey} />
            </View>
            <ButtonToggleSet
                options={options}
                lang={interfaceLanguage}
                active={active}/>
        </View>
    );
};


