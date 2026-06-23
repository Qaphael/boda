const React = require('react');
module.exports = {
  default: {
    createAnimatedComponent: (c) => c,
    Value: function() {},
    event: function() { return function() {}; },
    add: function() { return 0; },
    eq: function() { return 0; },
    set: function() {},
    cond: function() { return 0; },
    interpolate: function() { return 0; },
    Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend' },
  },
  useAnimatedStyle: function() { return {}; },
  useSharedValue: function() { return { value: 0 }; },
  withSpring: function(v) { return v; },
  withTiming: function(v) { return v; },
  interpolate: function() { return 0; },
  Extrapolate: { CLAMP: 'clamp', EXTEND: 'extend' },
  Easing: { linear: function() {}, ease: function() {} },
  SharedValue: function() {},
};
