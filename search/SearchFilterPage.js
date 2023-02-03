'use strict';

import PropTypes from 'prop-types';
import React from 'react';
import {
    View,
    Text,
    TouchableOpacity,
    Image, FlatList, SectionList,
} from 'react-native';

import {FilterNode, SearchPropTypes} from '@sefaria/search';
import {
    ButtonToggleSet,
    SystemButton,
    IndeterminateCheckBox, Icon, FlexFrame, ContentTextWithFallback, LocalSearchBar,
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

const useFilterSearcher = (filtersValid, availableFilters, currFilterName) => {
    const [filterQuery, setFilterQuery] = React.useState("");
    const [expandedFilterCategories, setExpandedFilterCategories] = React.useState(new Set());
    const onFilterQueryChange = query => setFilterQuery(query);
    const filterSearcher = new FilterSearcher(getCurrFilters(filtersValid, availableFilters));
    const displayedFilters = filterSearcher.search(filterQuery, false);
    const filterSections = organizeFiltersAsSections(displayedFilters, expandedFilterCategories);
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
    const currFilterName = subMenuOpen === "filter" ? null : subMenuOpen;
    const { filterSections, onFilterQueryChange, filterQuery, setExpandedFilterCategories } = useFilterSearcher(searchState.filtersValid, searchState.availableFilters, currFilterName);
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
        <View style={{flex: 1}}>
            <SectionList
                contentContainerStyle={styles.menuContent}
                sections={filterSections}
                renderSectionHeader={({ section: { filterNode, expanded } }) => (
                    <SearchFilter
                        toggleFilter={toggleFilterBound}
                        filterNode={filterNode}
                        expandFilter={expandFilter}
                        expanded={expanded}
                    />
                )}
                renderItem={({ item: filterNode}) => (
                    expanded && (
                        <SearchFilter
                            toggleFilter={toggleFilterBound}
                            filterNode={filterNode}
                            indented
                        />
                    )
                )}
                ListHeaderComponent={() => (
                    <View>
                        <RootFilterButtons buttonToggleSetData={buttonToggleSetData} onResetPress={onResetPress} />
                        <LocalSearchBar onChange={onFilterQueryChange} query={filterQuery} />
                    </View>
                )}
                ListEmptyComponent={() => !searchState.filtersValid && <FilterLoadingView />}
            />
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


