const React = require('react');
module.exports = {
  GestureHandlerRootView: (props) => React.createElement('GestureHandlerRootView', props),
  Gesture: {
    Pan: function() { return { onBegin: function() { return this; }, onEnd: function() { return this; } }; },
    Tap: function() { return { onEnd: function() { return this; } }; },
  },
  GestureDetector: (props) => React.createElement('GestureDetector', props),
  TouchableOpacity: (props) => React.createElement('TouchableOpacity', props),
  TouchableHighlight: (props) => React.createElement('TouchableHighlight', props),
  TouchableWithoutFeedback: (props) => React.createElement('TouchableWithoutFeedback', props),
  ScrollView: (props) => React.createElement('ScrollView', props),
  State: { BEGAN: 0, ACTIVE: 1, END: 2, CANCELLED: 3, FAILED: 4, UNDETERMINED: 5 },
  PanGestureHandler: (props) => React.createElement('PanGestureHandler', props),
  TapGestureHandler: (props) => React.createElement('TapGestureHandler', props),
  LongPressGestureHandler: (props) => React.createElement('LongPressGestureHandler', props),
  FlingGestureHandler: (props) => React.createElement('FlingGestureHandler', props),
  NativeViewGestureHandler: (props) => React.createElement('NativeViewGestureHandler', props),
  PureNativeButton: (props) => React.createElement('PureNativeButton', props),
  Swipeable: (props) => React.createElement('Swipeable', props),
  TextInput: (props) => React.createElement('TextInput', props),
  DrawerLayout: (props) => React.createElement('DrawerLayout', props),
  createNativeWrapper: function(c) { return c; },
};
