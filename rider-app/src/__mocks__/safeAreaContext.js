const React = require('react');
module.exports = {
  SafeAreaProvider: (props) => React.createElement('SafeAreaProvider', props),
  SafeAreaView: (props) => React.createElement('SafeAreaView', props),
  useSafeAreaInsets: function() { return { top: 0, bottom: 0, left: 0, right: 0 }; },
  useSafeAreaFrame: function() { return { x: 0, y: 0, width: 0, height: 0 }; },
  SafeAreaInsetsContext: {
    Consumer: (props) => props.children({ top: 0, bottom: 0, left: 0, right: 0 }),
    Provider: (props) => React.createElement('SafeAreaInsetsContext.Provider', props),
  },
  initialWindowMetrics: { insets: { top: 0, bottom: 0, left: 0, right: 0 }, frame: { x: 0, y: 0, width: 0, height: 0 } },
};
