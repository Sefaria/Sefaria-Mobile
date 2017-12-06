'use strict';
import React from 'react';
import {
  requireNativeComponent,
  View,
  Dimensions,
  Text,
} from 'react-native';
import ReboundRenderer from './ReboundRenderer';

const SefariaListView = requireNativeComponent('SefariaListView', null);

const ROWS_FOR_RECYCLING = 20;
const ROWS_IN_DATA_SOURCE = 3000;


class TextColumn extends React.Component {
  constructor(props) {
    super(props);
    const binding = [];
    const dataSource = [];
    for (let i=0; i<ROWS_IN_DATA_SOURCE; i++) {
      dataSource.push(`This is row # ${i+1} mano`);
    }
    for (let i=0; i<ROWS_FOR_RECYCLING; i++) {
      binding.push(-1);
    }
    this.state = {
      binding, // childIndex -> rowID
      dataSource,
    };
  }
  render() {
    const bodyComponents = [];
    for (let i=0; i<ROWS_FOR_RECYCLING; i++) {
      bodyComponents.push(
        <ReboundRenderer
          key={'r_' + i}
          boundTo={this.state.binding[i]}
          render={this.renderRow}
        />
      );
    }
    // TODO: optimize by making the UITableView bigger than the visible screen (adding a buffer)
    // so the re-renders that happen asynchronously will happen on cells that aren't visible yet
    return (
      <View style={{flex: 1}}>
        <SefariaListView
          style={{flex: 1}}
          onChange={this.onBind}
          rowHeight={50}
          numRows={this.state.dataSource.length}
        >
          {bodyComponents}
        </SefariaListView>
      </View>
    );
  }
  onBind = (event) => {
    const {target, childIndex, rowID, sectionID} = event.nativeEvent;
    console.log("BINDING", rowID);
    this.state.binding[childIndex] = rowID;
    this.setState({
      binding: this.state.binding
    });
  };
  renderRow = (rowID) => {
    return (
      <Text style={{
        width: Dimensions.get('window').width,
        height: 50,
        backgroundColor: '#ffffff'
      }}>{this.state.dataSource[rowID]}</Text>
    );
  };
}

module.exports = TextColumn;
