'use strict';
var React = require('react-native');

var {
  TouchableOpacity,
  Text,
  View,
  TextInput
} = React;

var SearchBar = React.createClass({
  getInitialState: function() {
    return {text: "Search"};
  },
  propTypes:{
    closeNav:        React.PropTypes.func.isRequired,
    onQueryChange:   React.PropTypes.func.isRequired
  },
  render: function() {
    return (
      <View style={{flexDirection:'row',borderColor: 'gray', borderWidth: 1}}>
        <TouchableOpacity style={{width: 40, height: 40, backgroundColor: 'powderblue'}}
        onPress={this.props.closeNav}>
          <Text style={{fontSize:30,textAlign:'center'}}>X</Text>
        </TouchableOpacity>
        <TextInput
          style={{width:300, height: 40}}
          onChangeText={(text) => this.setState({text})}
          onSubmitEditing={(event) => this.props.onQueryChange(event.nativeEvent.text)}
          value={this.state.text}/>
      </View>
    );
  }
});

module.exports = SearchBar;