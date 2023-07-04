//from: https://github.com/Ashoat/squadcal/blob/master/native/text-height-measurer.react.js
//also see related git discussion: https://github.com/facebook/react-native/issues/13727

import React from 'react';
import PropTypes from 'prop-types';
import { View, StyleSheet } from 'react-native';

const measureBatchSize = 50;

class TextHeightMeasurer extends React.PureComponent {
  static whyDidYouRender = true;

  static propTypes = {
    componentsToMeasure: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      generator: PropTypes.func.isRequired,  // function which generates the component
      param: PropTypes.object.isRequired, // parameter for the generator function
    })).isRequired,
    allHeightsMeasuredCallback: PropTypes.func.isRequired,
    minHeight: PropTypes.number,
    style: PropTypes.object,
  };

  constructor(props) {
    super(props);

    this.currentTextToHeight = new Map();
    this.nextTextToHeight = null;
    this.leftToMeasure = new Set();
    this.leftInBatch = 0;
    this.state = {
      currentlyMeasuring: null,
    };
  }


  componentDidMount() {
    this.resetInternalState(this.props.componentsToMeasure);
  }

  componentDidUpdate(prevProps, prevState) {
    if (prevProps.componentsToMeasure !== this.props.componentsToMeasure) {
      this.resetInternalState(this.props.componentsToMeasure);
    }
  }

  // resets this.leftToMeasure and this.nextTextToHeight
  resetInternalState(newComponentsToMeasure) {
    this.leftToMeasure = new Set();
    const idSet = new Set();
    const nextNextTextToHeight = new Map();
    for (let componentToMeasure of newComponentsToMeasure) {
      const id = componentToMeasure.id;
      const current = this.currentTextToHeight.get(id);
      if (current) {
        nextNextTextToHeight.set(id, current);
      } else if (this.nextTextToHeight && this.nextTextToHeight.has(id)) {
        const currentNext = this.nextTextToHeight.get(id);
        nextNextTextToHeight.set(id, currentNext);
      } else {
        if (!idSet.has(componentToMeasure.id)) { // for whatever reason duplicate components are getting into leftToMeasure. Not anymore!
          this.leftToMeasure.add(componentToMeasure);
          idSet.add(componentToMeasure.id);
        }
      }
    }
    this.nextTextToHeight = nextNextTextToHeight;
    if (this.leftToMeasure.size === 0) {
      this.done(newComponentsToMeasure);
    } else {
      this.newBatch();
    }
  }

  onLayout(componentToMeasure, event) {
    //invariant(this.nextTextToHeight, "nextTextToHeight should be set");
    this.nextTextToHeight.set(
      componentToMeasure.id,
      this.props.minHeight !== undefined && this.props.minHeight !== null
        ? Math.max(event.nativeEvent.layout.height, this.props.minHeight)
        : event.nativeEvent.layout.height,
     );
    this.leftToMeasure.delete(componentToMeasure);
    this.leftInBatch--;
    if (this.leftToMeasure.size === 0) {
      this.done(this.props.componentsToMeasure);
    } else if (this.leftInBatch === 0) {
      this.newBatch();
    }
  }

  done(componentsToMeasure) {
    this.currentTextToHeight = this.nextTextToHeight;
    this.nextTextToHeight = null;
    this.props.allHeightsMeasuredCallback(
      componentsToMeasure,
      this.currentTextToHeight,
    );
    this.setState({ currentlyMeasuring: null });
  }

  newBatch() {
    let newBatchSize = Math.min(measureBatchSize, this.leftToMeasure.size);
    this.leftInBatch = newBatchSize;
    const newCurrentlyMeasuring = new Set();
    const leftToMeasureIter = this.leftToMeasure.values();
    for (; newBatchSize > 0; newBatchSize--) {
      const value = leftToMeasureIter.next().value;
      //invariant(value !== undefined && value !== null, "item should exist");
      newCurrentlyMeasuring.add(value);
    }
    this.setState({ currentlyMeasuring: newCurrentlyMeasuring });
  }

  stopMeasuring() {
    this.leftToMeasure = new Set();
  }

  render() {
    const set = this.state.currentlyMeasuring;
    if (set == null || set.size == 0) {
      return null;
    }
    const dummies = Array.from(set).map((componentToMeasure) => {
      return (
        <View
          style={styles.text}
          onLayout={(event) => this.onLayout(componentToMeasure, event)}
          key={componentToMeasure.id}>
          {componentToMeasure.generator(componentToMeasure.param)}
        </View>
      );
    });
    return <View style={{flex:1, position:"absolute", left:0, right:0}}>{dummies}</View>;
  }

}

const styles = StyleSheet.create({
  text: {
    opacity: 0,
    position: "absolute"
  },
});

export default TextHeightMeasurer;
