const React = require('react');
const BottomSheet = React.forwardRef((props, ref) => React.createElement('BottomSheet', { ref, ...props }));
const BottomSheetScrollView = (props) => React.createElement('BottomSheetScrollView', props);
const BottomSheetTextInput = (props) => React.createElement('BottomSheetTextInput', props);
const BottomSheetFlatList = (props) => React.createElement('BottomSheetFlatList', props);
module.exports = { default: BottomSheet, BottomSheetScrollView, BottomSheetTextInput, BottomSheetFlatList };
