// In the app, `react-native-svg-transformer` (configured in metro.config.js) turns an
// imported .svg file into a React component, so code does `<BookSVG color={...} />`.
// Jest has no such transformer: without this mock the generic asset mapping in
// jest.config.js returns the number 1, and rendering `<1 />` throws
// "Element type is invalid ... but got: number". So .svg maps here instead, to a
// component that renders nothing but is a legal element type.
const React = require('react');

const SvgMock = (props) => React.createElement('SvgMock', props, props.children);
SvgMock.displayName = 'SvgMock';

module.exports = SvgMock;
module.exports.default = SvgMock;
module.exports.ReactComponent = SvgMock;
