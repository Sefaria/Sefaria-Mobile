'use strict';
import React, { Component } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView
} from 'react-native';

var {
  CategoryColorLine,
  TripleDots
} = require('./Misc.js');

const styles  = require('./Styles');
const strings = require('./LocalizedStrings');


class TextListHeader extends React.Component {
    static propTypes = {
		Sefaria:        React.PropTypes.object.isRequired,
    theme:          React.PropTypes.object.isRequired,
		updateCat:      React.PropTypes.func.isRequired,
		closeCat:       React.PropTypes.func.isRequired,
		category:       React.PropTypes.string,
		filterIndex:    React.PropTypes.number,
		recentFilters:  React.PropTypes.array,
		language:       React.PropTypes.oneOf(["english","hebrew","bilingual"]),
    isSummaryMode:  React.PropTypes.bool
	};

    constructor(props) {
        super(props);
        Sefaria = props.Sefaria; //Is this bad practice to use getInitialState() as an init function

        this.state = {

		};
    }

    render() {
		var style = {"borderTopColor": Sefaria.palette.categoryColor(this.props.category)};

		var viewList = this.props.recentFilters.map((filter, i)=>{
			return (<TextListHeaderItem
            		theme={this.props.theme}
						    language={this.props.language}
						    filter={filter}
						    filterIndex={i}
						    selected={i == this.props.filterIndex}
						    updateCat={this.props.updateCat}
						    key={i} />
					);
		});
    if (this.props.isSummaryMode) {
      return (<View style={[styles.textListHeader, styles.textListHeaderSummary, this.props.theme.textListHeader]}>
                <Text style={[styles.textListHeaderSummaryText, this.props.theme.textListHeaderSummaryText]}>{strings.connections}</Text>
              </View>);
    } else {
      return (
  			<View style={[styles.textListHeader, this.props.theme.textListHeader, style]}>
  				<ScrollView style={styles.textListHeaderScrollView} horizontal={true}>{viewList}</ScrollView>
  				<TripleDots onPress={this.props.closeCat} themeStr={this.props.themeStr}/>
  			 </View>
  			);
    }

	}
}

class TextListHeaderItem extends React.Component {
    static propTypes = {
    theme:          React.PropTypes.object.isRequired,
		updateCat:      React.PropTypes.func.isRequired,
		filter:         React.PropTypes.object,
		filterIndex:    React.PropTypes.number,
		language:       React.PropTypes.oneOf(["english","hebrew","bilingual"]),
		selected:       React.PropTypes.bool
	};

    render() {
		var filterStr = this.props.language == "hebrew" ?
			(this.props.filter.heCollectiveTitle ? this.props.filter.heCollectiveTitle : this.props.filter.heTitle) : //NOTE backwards compatibility
			(this.props.filter.collectiveTitle ? this.props.filter.collectiveTitle : this.props.filter.title);
		var textStyles = [styles.textListHeaderItemText, this.props.theme.textListHeaderItemText];

	    if (this.props.selected) {
	    	textStyles.push(this.props.theme.textListHeaderItemSelected);
	    }
		return (
			<TouchableOpacity style={styles.textListHeaderItem} onPress={()=>{this.props.updateCat(null, this.props.filterIndex)}}>
				<Text style={textStyles}>{filterStr}</Text>
			</TouchableOpacity>
			);
	}
}

module.exports = TextListHeader;
