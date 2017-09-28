//from: https://github.com/Ashoat/squadcal/blob/master/native/text-height-measurer.react.js
//also see related git discussion: https://github.com/facebook/react-native/issues/13727

import React from 'react';
import PropTypes from 'prop-types';
import { Text, View, StyleSheet } from 'react-native';
//import invariant from 'invariant';

const measureBatchSize = 50;

/*TextToHeight = Map<string, number>;
type Props = {
  textToMeasure: TextToMeasure[],
  allHeightsMeasuredCallback: (
    textToMeasure: TextToMeasure[],
    heights: TextToHeight,
  ) => void,
  minHeight?: number,
  style?: StyleObj,
};
type State = {
  currentlyMeasuring: ?Set<TextToMeasure>,
};*/
class TextHeightMeasurer extends React.PureComponent {

  /*props: Props;
  state: State = {
    currentlyMeasuring: null,
  };*/
  static propTypes = {
    componentsToMeasure: PropTypes.arrayOf(PropTypes.shape({
      id: PropTypes.string.isRequired,
      component: PropTypes.element.isRequired,
    })).isRequired,
    allHeightsMeasuredCallback: PropTypes.func.isRequired,
    minHeight: PropTypes.number,
    style: Text.propTypes.style,
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

  componentWillReceiveProps(nextProps) {
    if (nextProps.textToMeasure !== this.props.textToMeasure) {
      this.resetInternalState(nextProps.textToMeasure);
    }
  }

  // resets this.leftToMeasure and this.nextTextToHeight
  resetInternalState(newComponentsToMeasure) {
    console.log("resetting internal state of TextHeightMeasurer");
    this.leftToMeasure = new Set();
    const nextNextTextToHeight = new Map();
    for (let componentToMeasure of newComponentsToMeasure) {
      const id = componentToMeasure.id;
      const current = this.currentTextToHeight.get(id);
      if (current) {
        nextNextTextToHeight.set(id, current);
      } else if (this.nextTextToHeight && this.nextTextToHeight.has(id)) {
        const currentNext = this.nextTextToHeight.get(id);
        //invariant(currentNext, "has() check said it had it!");
        nextNextTextToHeight.set(id, currentNext);
      } else {
        this.leftToMeasure.add(componentToMeasure);
      }
    }
    this.nextTextToHeight = nextNextTextToHeight;
    if (this.leftToMeasure.size === 0) {
      this.done(newComponentsToMeasure);
    } else {
      this.newBatch();
    }
  }

  onTextLayout(componentToMeasure, event) {
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
    //invariant(this.leftToMeasure.size === 0, "should be 0 left to measure");
    //invariant(this.leftInBatch === 0, "batch should be complete");
    //invariant(this.nextTextToHeight, "nextTextToHeight should be set");
    this.currentTextToHeight = this.nextTextToHeight;
    this.nextTextToHeight = null;
    console.log(this.currentTextToHeight);
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

  render() {
    const set = this.state.currentlyMeasuring;
    if (set == null || set.size == 0) {
      return null;
    }
    //invariant(set, "should be set");
    const dummies = Array.from(set).map((componentToMeasure) => {
      //invariant(style, "style should exist for every text being measured!");
      return (
        <View
          style={styles.text}
          onLayout={(event) => this.onTextLayout(componentToMeasure, event)}
          key={componentToMeasure.id}>
          {componentToMeasure.component}
        </View>
      );
    });
    return <View style={{flex:1,}}>{dummies}</View>;
  }

}

const styles = StyleSheet.create({
  text: {
    opacity: 0,
    position: "absolute"
  },
});

module.exports = TextHeightMeasurer;
