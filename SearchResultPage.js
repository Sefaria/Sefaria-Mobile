import React  from 'react';
import {View, Text} from "react-native";
import SearchBar from './SearchBar';
import SearchResultList from './SearchResultList';
import {TabView, TabRowView, DirectedButton} from "./Misc";
import {useGlobalState, useRtlFlexDir} from "./Hooks";
import styles from "./Styles";
import strings from "./LocalizedStrings";

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
    let isheb = interfaceLanguage === "hebrew";
    let langStyle = !isheb ? styles.enInt : styles.heInt;
    let summaryStyle = [styles.searchResultSummary, theme.searchResultSummary];
    if (isheb && false) { //TODO enable when we properly handle interface hebrew throughout app
        summaryStyle.push(styles.searchResultSummaryHe);
    }
    let forwardImageStyle = isheb && false ? styles.forwardButtonHe : styles.forwardButtonEn;
    return (
        <View style={[styles.menu, theme.menu]}>
            <SearchBar
                onBack={props.onBack}
                leftMenuButton="back"
                search={props.search}
                query={props.query}
                setIsNewSearch={props.setIsNewSearch}
                onChange={props.onChangeSearchQuery}
                onFocus={props.openAutocomplete}
                searchType={props.searchState.type}
                hideSearchButton={true}
            />
            <View style={summaryStyle}>
                <TabRowView
                    tabs={tabs}
                    renderTab={(tab, active) => <SearchTabView active={active} {...tab} />}
                    currTabId={props.searchState.type}
                    setTab={props.setSearchTypeState}
                    flexDirection={flexDirection}
                />
                {props.searchState.type === "text" ?
                    <DirectedButton
                        text={(<Text>{strings.filter} <Text
                            style={theme.text}>{`(${props.searchState.appliedFilters.length})`}</Text></Text>)}
                        accessibilityText={strings.filter}
                        direction="forward"
                        language={"english"}
                        textStyle={[theme.searchResultSummaryText, langStyle]}
                        imageStyle={forwardImageStyle}
                        onPress={() => props.openSubMenu("filter")}/> : null}
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
}
