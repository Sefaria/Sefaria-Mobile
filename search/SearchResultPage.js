import React  from 'react';
import {View, Text, TouchableOpacity} from "react-native";
import SearchBar from './SearchBar';
import SearchResultList from './SearchResultList';
import {TabView, TabRowView, DirectedButton, PageHeader, Header} from "../Misc";
import {useGlobalState, useRtlFlexDir} from "../Hooks";
import styles from "../Styles";
import strings from "../LocalizedStrings";

const numberWithCommas = x => {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
};

const getStatusFromState = (searchState) => (
    searchState.isLoading ? "-" : numberWithCommas(searchState.numResults)
);

const useSearchTabData = ({ textSearchState, sheetSearchState }) => {
    return [
        {text: strings.sources, id: 'text', count: getStatusFromState(textSearchState)},
        {text: strings.sheets, id: 'sheet', count: getStatusFromState(sheetSearchState)}
    ];
}

export const SearchResultPage = (props) => {
    const {interfaceLanguage, theme} = useGlobalState();
    const tabs = useSearchTabData({...props});
    const flexDirection = useRtlFlexDir(interfaceLanguage);
    const numFilters = props.searchState.appliedFilters.length;
    const onFilterPress = () => props.openSubMenu("filter");
    return (
        <View style={styles.menu}>
            <View style={styles.pageMargins}>
                <PageHeader><Header titleKey={"search"}/></PageHeader>
                <SearchBar
                    search={props.search}
                    query={props.query}
                    setIsNewSearch={props.setIsNewSearch}
                    onChange={props.onChangeSearchQuery}
                    onFocus={props.openAutocomplete}
                />
                <View style={{marginVertical: 17}}>
                    <TabRowView
                        tabs={tabs}
                        renderTab={(tab, active) => <SearchTabView active={active} {...tab} />}
                        currTabId={props.searchState.type}
                        setTab={props.setSearchTypeState}
                        flexDirection={flexDirection}
                        RowEndComponent={props.searchState.type === "text" ? <FilterButton onPress={onFilterPress} numFilters={numFilters}/> : null}
                    />
                </View>
            </View>
            <SearchResultList
                setInitSearchScrollPos={props.setInitSearchScrollPos}
                openRef={props.openRef}
                setLoadTail={props.setLoadTail}
                setIsNewSearch={props.setIsNewSearch}
                isNewSearch={props.isNewSearch}
                searchState={props.searchState}
                searchType={props.searchType}
            />
        </View>
    );
};

const SearchTabView = ({text, active, count}) => {
    const {interfaceLanguage, theme} = useGlobalState();
    return (
        <TabView
            text={`${text} (${count})`}
            active={active}
            lang={interfaceLanguage}
            activeTextStyle={theme.primaryText}
            inactiveTextStyle={theme.tertiaryText}
            baseTextStyles={[styles.enInt, {fontSize: 16, fontWeight: "bold"}]}
        />
    );
};

const FilterButton = ({ onPress, numFilters }) => {
    const { theme } = useGlobalState();
    return (
        <TouchableOpacity onPress={onPress} style={[{borderRadius: 6, paddingVertical: 10, paddingHorizontal: 7}, theme.lighterGreyBackground]}>
            <Text style={[theme.tertiaryText]}>
                {strings.filter}
                <Text style={theme.text}>
                    {`(${numFilters})`}
                </Text>
            </Text>
        </TouchableOpacity>
    );
};
