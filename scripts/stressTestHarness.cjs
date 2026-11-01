"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// node_modules/react/cjs/react.production.min.js
var require_react_production_min = __commonJS({
  "node_modules/react/cjs/react.production.min.js"(exports2) {
    "use strict";
    var l = Symbol.for("react.element");
    var n = Symbol.for("react.portal");
    var p = Symbol.for("react.fragment");
    var q = Symbol.for("react.strict_mode");
    var r = Symbol.for("react.profiler");
    var t = Symbol.for("react.provider");
    var u = Symbol.for("react.context");
    var v = Symbol.for("react.forward_ref");
    var w = Symbol.for("react.suspense");
    var x = Symbol.for("react.memo");
    var y = Symbol.for("react.lazy");
    var z = Symbol.iterator;
    function A(a) {
      if (null === a || "object" !== typeof a) return null;
      a = z && a[z] || a["@@iterator"];
      return "function" === typeof a ? a : null;
    }
    var B = { isMounted: function() {
      return false;
    }, enqueueForceUpdate: function() {
    }, enqueueReplaceState: function() {
    }, enqueueSetState: function() {
    } };
    var C = Object.assign;
    var D = {};
    function E(a, b, e) {
      this.props = a;
      this.context = b;
      this.refs = D;
      this.updater = e || B;
    }
    E.prototype.isReactComponent = {};
    E.prototype.setState = function(a, b) {
      if ("object" !== typeof a && "function" !== typeof a && null != a) throw Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
      this.updater.enqueueSetState(this, a, b, "setState");
    };
    E.prototype.forceUpdate = function(a) {
      this.updater.enqueueForceUpdate(this, a, "forceUpdate");
    };
    function F() {
    }
    F.prototype = E.prototype;
    function G(a, b, e) {
      this.props = a;
      this.context = b;
      this.refs = D;
      this.updater = e || B;
    }
    var H = G.prototype = new F();
    H.constructor = G;
    C(H, E.prototype);
    H.isPureReactComponent = true;
    var I = Array.isArray;
    var J = Object.prototype.hasOwnProperty;
    var K = { current: null };
    var L = { key: true, ref: true, __self: true, __source: true };
    function M(a, b, e) {
      var d, c = {}, k = null, h = null;
      if (null != b) for (d in void 0 !== b.ref && (h = b.ref), void 0 !== b.key && (k = "" + b.key), b) J.call(b, d) && !L.hasOwnProperty(d) && (c[d] = b[d]);
      var g = arguments.length - 2;
      if (1 === g) c.children = e;
      else if (1 < g) {
        for (var f = Array(g), m = 0; m < g; m++) f[m] = arguments[m + 2];
        c.children = f;
      }
      if (a && a.defaultProps) for (d in g = a.defaultProps, g) void 0 === c[d] && (c[d] = g[d]);
      return { $$typeof: l, type: a, key: k, ref: h, props: c, _owner: K.current };
    }
    function N(a, b) {
      return { $$typeof: l, type: a.type, key: b, ref: a.ref, props: a.props, _owner: a._owner };
    }
    function O(a) {
      return "object" === typeof a && null !== a && a.$$typeof === l;
    }
    function escape(a) {
      var b = { "=": "=0", ":": "=2" };
      return "$" + a.replace(/[=:]/g, function(a2) {
        return b[a2];
      });
    }
    var P = /\/+/g;
    function Q(a, b) {
      return "object" === typeof a && null !== a && null != a.key ? escape("" + a.key) : b.toString(36);
    }
    function R(a, b, e, d, c) {
      var k = typeof a;
      if ("undefined" === k || "boolean" === k) a = null;
      var h = false;
      if (null === a) h = true;
      else switch (k) {
        case "string":
        case "number":
          h = true;
          break;
        case "object":
          switch (a.$$typeof) {
            case l:
            case n:
              h = true;
          }
      }
      if (h) return h = a, c = c(h), a = "" === d ? "." + Q(h, 0) : d, I(c) ? (e = "", null != a && (e = a.replace(P, "$&/") + "/"), R(c, b, e, "", function(a2) {
        return a2;
      })) : null != c && (O(c) && (c = N(c, e + (!c.key || h && h.key === c.key ? "" : ("" + c.key).replace(P, "$&/") + "/") + a)), b.push(c)), 1;
      h = 0;
      d = "" === d ? "." : d + ":";
      if (I(a)) for (var g = 0; g < a.length; g++) {
        k = a[g];
        var f = d + Q(k, g);
        h += R(k, b, e, f, c);
      }
      else if (f = A(a), "function" === typeof f) for (a = f.call(a), g = 0; !(k = a.next()).done; ) k = k.value, f = d + Q(k, g++), h += R(k, b, e, f, c);
      else if ("object" === k) throw b = String(a), Error("Objects are not valid as a React child (found: " + ("[object Object]" === b ? "object with keys {" + Object.keys(a).join(", ") + "}" : b) + "). If you meant to render a collection of children, use an array instead.");
      return h;
    }
    function S(a, b, e) {
      if (null == a) return a;
      var d = [], c = 0;
      R(a, d, "", "", function(a2) {
        return b.call(e, a2, c++);
      });
      return d;
    }
    function T(a) {
      if (-1 === a._status) {
        var b = a._result;
        b = b();
        b.then(function(b2) {
          if (0 === a._status || -1 === a._status) a._status = 1, a._result = b2;
        }, function(b2) {
          if (0 === a._status || -1 === a._status) a._status = 2, a._result = b2;
        });
        -1 === a._status && (a._status = 0, a._result = b);
      }
      if (1 === a._status) return a._result.default;
      throw a._result;
    }
    var U = { current: null };
    var V = { transition: null };
    var W = { ReactCurrentDispatcher: U, ReactCurrentBatchConfig: V, ReactCurrentOwner: K };
    function X() {
      throw Error("act(...) is not supported in production builds of React.");
    }
    exports2.Children = { map: S, forEach: function(a, b, e) {
      S(a, function() {
        b.apply(this, arguments);
      }, e);
    }, count: function(a) {
      var b = 0;
      S(a, function() {
        b++;
      });
      return b;
    }, toArray: function(a) {
      return S(a, function(a2) {
        return a2;
      }) || [];
    }, only: function(a) {
      if (!O(a)) throw Error("React.Children.only expected to receive a single React element child.");
      return a;
    } };
    exports2.Component = E;
    exports2.Fragment = p;
    exports2.Profiler = r;
    exports2.PureComponent = G;
    exports2.StrictMode = q;
    exports2.Suspense = w;
    exports2.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = W;
    exports2.act = X;
    exports2.cloneElement = function(a, b, e) {
      if (null === a || void 0 === a) throw Error("React.cloneElement(...): The argument must be a React element, but you passed " + a + ".");
      var d = C({}, a.props), c = a.key, k = a.ref, h = a._owner;
      if (null != b) {
        void 0 !== b.ref && (k = b.ref, h = K.current);
        void 0 !== b.key && (c = "" + b.key);
        if (a.type && a.type.defaultProps) var g = a.type.defaultProps;
        for (f in b) J.call(b, f) && !L.hasOwnProperty(f) && (d[f] = void 0 === b[f] && void 0 !== g ? g[f] : b[f]);
      }
      var f = arguments.length - 2;
      if (1 === f) d.children = e;
      else if (1 < f) {
        g = Array(f);
        for (var m = 0; m < f; m++) g[m] = arguments[m + 2];
        d.children = g;
      }
      return { $$typeof: l, type: a.type, key: c, ref: k, props: d, _owner: h };
    };
    exports2.createContext = function(a) {
      a = { $$typeof: u, _currentValue: a, _currentValue2: a, _threadCount: 0, Provider: null, Consumer: null, _defaultValue: null, _globalName: null };
      a.Provider = { $$typeof: t, _context: a };
      return a.Consumer = a;
    };
    exports2.createElement = M;
    exports2.createFactory = function(a) {
      var b = M.bind(null, a);
      b.type = a;
      return b;
    };
    exports2.createRef = function() {
      return { current: null };
    };
    exports2.forwardRef = function(a) {
      return { $$typeof: v, render: a };
    };
    exports2.isValidElement = O;
    exports2.lazy = function(a) {
      return { $$typeof: y, _payload: { _status: -1, _result: a }, _init: T };
    };
    exports2.memo = function(a, b) {
      return { $$typeof: x, type: a, compare: void 0 === b ? null : b };
    };
    exports2.startTransition = function(a) {
      var b = V.transition;
      V.transition = {};
      try {
        a();
      } finally {
        V.transition = b;
      }
    };
    exports2.unstable_act = X;
    exports2.useCallback = function(a, b) {
      return U.current.useCallback(a, b);
    };
    exports2.useContext = function(a) {
      return U.current.useContext(a);
    };
    exports2.useDebugValue = function() {
    };
    exports2.useDeferredValue = function(a) {
      return U.current.useDeferredValue(a);
    };
    exports2.useEffect = function(a, b) {
      return U.current.useEffect(a, b);
    };
    exports2.useId = function() {
      return U.current.useId();
    };
    exports2.useImperativeHandle = function(a, b, e) {
      return U.current.useImperativeHandle(a, b, e);
    };
    exports2.useInsertionEffect = function(a, b) {
      return U.current.useInsertionEffect(a, b);
    };
    exports2.useLayoutEffect = function(a, b) {
      return U.current.useLayoutEffect(a, b);
    };
    exports2.useMemo = function(a, b) {
      return U.current.useMemo(a, b);
    };
    exports2.useReducer = function(a, b, e) {
      return U.current.useReducer(a, b, e);
    };
    exports2.useRef = function(a) {
      return U.current.useRef(a);
    };
    exports2.useState = function(a) {
      return U.current.useState(a);
    };
    exports2.useSyncExternalStore = function(a, b, e) {
      return U.current.useSyncExternalStore(a, b, e);
    };
    exports2.useTransition = function() {
      return U.current.useTransition();
    };
    exports2.version = "18.3.1";
  }
});

// node_modules/react/cjs/react.development.js
var require_react_development = __commonJS({
  "node_modules/react/cjs/react.development.js"(exports2, module2) {
    "use strict";
    if (process.env.NODE_ENV !== "production") {
      (function() {
        "use strict";
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStart(new Error());
        }
        var ReactVersion = "18.3.1";
        var REACT_ELEMENT_TYPE = Symbol.for("react.element");
        var REACT_PORTAL_TYPE = Symbol.for("react.portal");
        var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
        var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
        var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
        var REACT_PROVIDER_TYPE = Symbol.for("react.provider");
        var REACT_CONTEXT_TYPE = Symbol.for("react.context");
        var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
        var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
        var REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
        var REACT_MEMO_TYPE = Symbol.for("react.memo");
        var REACT_LAZY_TYPE = Symbol.for("react.lazy");
        var REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen");
        var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
        var FAUX_ITERATOR_SYMBOL = "@@iterator";
        function getIteratorFn(maybeIterable) {
          if (maybeIterable === null || typeof maybeIterable !== "object") {
            return null;
          }
          var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];
          if (typeof maybeIterator === "function") {
            return maybeIterator;
          }
          return null;
        }
        var ReactCurrentDispatcher = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactCurrentBatchConfig = {
          transition: null
        };
        var ReactCurrentActQueue = {
          current: null,
          // Used to reproduce behavior of `batchedUpdates` in legacy mode.
          isBatchingLegacy: false,
          didScheduleLegacyUpdate: false
        };
        var ReactCurrentOwner = {
          /**
           * @internal
           * @type {ReactComponent}
           */
          current: null
        };
        var ReactDebugCurrentFrame = {};
        var currentExtraStackFrame = null;
        function setExtraStackFrame(stack) {
          {
            currentExtraStackFrame = stack;
          }
        }
        {
          ReactDebugCurrentFrame.setExtraStackFrame = function(stack) {
            {
              currentExtraStackFrame = stack;
            }
          };
          ReactDebugCurrentFrame.getCurrentStack = null;
          ReactDebugCurrentFrame.getStackAddendum = function() {
            var stack = "";
            if (currentExtraStackFrame) {
              stack += currentExtraStackFrame;
            }
            var impl = ReactDebugCurrentFrame.getCurrentStack;
            if (impl) {
              stack += impl() || "";
            }
            return stack;
          };
        }
        var enableScopeAPI = false;
        var enableCacheElement = false;
        var enableTransitionTracing = false;
        var enableLegacyHidden = false;
        var enableDebugTracing = false;
        var ReactSharedInternals = {
          ReactCurrentDispatcher,
          ReactCurrentBatchConfig,
          ReactCurrentOwner
        };
        {
          ReactSharedInternals.ReactDebugCurrentFrame = ReactDebugCurrentFrame;
          ReactSharedInternals.ReactCurrentActQueue = ReactCurrentActQueue;
        }
        function warn(format) {
          {
            {
              for (var _len = arguments.length, args = new Array(_len > 1 ? _len - 1 : 0), _key = 1; _key < _len; _key++) {
                args[_key - 1] = arguments[_key];
              }
              printWarning("warn", format, args);
            }
          }
        }
        function error(format) {
          {
            {
              for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
              }
              printWarning("error", format, args);
            }
          }
        }
        function printWarning(level, format, args) {
          {
            var ReactDebugCurrentFrame2 = ReactSharedInternals.ReactDebugCurrentFrame;
            var stack = ReactDebugCurrentFrame2.getStackAddendum();
            if (stack !== "") {
              format += "%s";
              args = args.concat([stack]);
            }
            var argsWithFormat = args.map(function(item) {
              return String(item);
            });
            argsWithFormat.unshift("Warning: " + format);
            Function.prototype.apply.call(console[level], console, argsWithFormat);
          }
        }
        var didWarnStateUpdateForUnmountedComponent = {};
        function warnNoop(publicInstance, callerName) {
          {
            var _constructor = publicInstance.constructor;
            var componentName = _constructor && (_constructor.displayName || _constructor.name) || "ReactClass";
            var warningKey = componentName + "." + callerName;
            if (didWarnStateUpdateForUnmountedComponent[warningKey]) {
              return;
            }
            error("Can't call %s on a component that is not yet mounted. This is a no-op, but it might indicate a bug in your application. Instead, assign to `this.state` directly or define a `state = {};` class property with the desired state in the %s component.", callerName, componentName);
            didWarnStateUpdateForUnmountedComponent[warningKey] = true;
          }
        }
        var ReactNoopUpdateQueue = {
          /**
           * Checks whether or not this composite component is mounted.
           * @param {ReactClass} publicInstance The instance we want to test.
           * @return {boolean} True if mounted, false otherwise.
           * @protected
           * @final
           */
          isMounted: function(publicInstance) {
            return false;
          },
          /**
           * Forces an update. This should only be invoked when it is known with
           * certainty that we are **not** in a DOM transaction.
           *
           * You may want to call this when you know that some deeper aspect of the
           * component's state has changed but `setState` was not called.
           *
           * This will not invoke `shouldComponentUpdate`, but it will invoke
           * `componentWillUpdate` and `componentDidUpdate`.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueForceUpdate: function(publicInstance, callback, callerName) {
            warnNoop(publicInstance, "forceUpdate");
          },
          /**
           * Replaces all of the state. Always use this or `setState` to mutate state.
           * You should treat `this.state` as immutable.
           *
           * There is no guarantee that `this.state` will be immediately updated, so
           * accessing `this.state` after calling this method may return the old value.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} completeState Next state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} callerName name of the calling function in the public API.
           * @internal
           */
          enqueueReplaceState: function(publicInstance, completeState, callback, callerName) {
            warnNoop(publicInstance, "replaceState");
          },
          /**
           * Sets a subset of the state. This only exists because _pendingState is
           * internal. This provides a merging strategy that is not available to deep
           * properties which is confusing. TODO: Expose pendingState or don't use it
           * during the merge.
           *
           * @param {ReactClass} publicInstance The instance that should rerender.
           * @param {object} partialState Next partial state to be merged with state.
           * @param {?function} callback Called after component is updated.
           * @param {?string} Name of the calling function in the public API.
           * @internal
           */
          enqueueSetState: function(publicInstance, partialState, callback, callerName) {
            warnNoop(publicInstance, "setState");
          }
        };
        var assign = Object.assign;
        var emptyObject = {};
        {
          Object.freeze(emptyObject);
        }
        function Component(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        Component.prototype.isReactComponent = {};
        Component.prototype.setState = function(partialState, callback) {
          if (typeof partialState !== "object" && typeof partialState !== "function" && partialState != null) {
            throw new Error("setState(...): takes an object of state variables to update or a function which returns an object of state variables.");
          }
          this.updater.enqueueSetState(this, partialState, callback, "setState");
        };
        Component.prototype.forceUpdate = function(callback) {
          this.updater.enqueueForceUpdate(this, callback, "forceUpdate");
        };
        {
          var deprecatedAPIs = {
            isMounted: ["isMounted", "Instead, make sure to clean up subscriptions and pending requests in componentWillUnmount to prevent memory leaks."],
            replaceState: ["replaceState", "Refactor your code to use setState instead (see https://github.com/facebook/react/issues/3236)."]
          };
          var defineDeprecationWarning = function(methodName, info) {
            Object.defineProperty(Component.prototype, methodName, {
              get: function() {
                warn("%s(...) is deprecated in plain JavaScript React classes. %s", info[0], info[1]);
                return void 0;
              }
            });
          };
          for (var fnName in deprecatedAPIs) {
            if (deprecatedAPIs.hasOwnProperty(fnName)) {
              defineDeprecationWarning(fnName, deprecatedAPIs[fnName]);
            }
          }
        }
        function ComponentDummy() {
        }
        ComponentDummy.prototype = Component.prototype;
        function PureComponent(props, context, updater) {
          this.props = props;
          this.context = context;
          this.refs = emptyObject;
          this.updater = updater || ReactNoopUpdateQueue;
        }
        var pureComponentPrototype = PureComponent.prototype = new ComponentDummy();
        pureComponentPrototype.constructor = PureComponent;
        assign(pureComponentPrototype, Component.prototype);
        pureComponentPrototype.isPureReactComponent = true;
        function createRef() {
          var refObject = {
            current: null
          };
          {
            Object.seal(refObject);
          }
          return refObject;
        }
        var isArrayImpl = Array.isArray;
        function isArray(a) {
          return isArrayImpl(a);
        }
        function typeName(value) {
          {
            var hasToStringTag = typeof Symbol === "function" && Symbol.toStringTag;
            var type = hasToStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            return type;
          }
        }
        function willCoercionThrow(value) {
          {
            try {
              testStringCoercion(value);
              return false;
            } catch (e) {
              return true;
            }
          }
        }
        function testStringCoercion(value) {
          return "" + value;
        }
        function checkKeyStringCoercion(value) {
          {
            if (willCoercionThrow(value)) {
              error("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", typeName(value));
              return testStringCoercion(value);
            }
          }
        }
        function getWrappedName(outerType, innerType, wrapperName) {
          var displayName = outerType.displayName;
          if (displayName) {
            return displayName;
          }
          var functionName = innerType.displayName || innerType.name || "";
          return functionName !== "" ? wrapperName + "(" + functionName + ")" : wrapperName;
        }
        function getContextName(type) {
          return type.displayName || "Context";
        }
        function getComponentNameFromType(type) {
          if (type == null) {
            return null;
          }
          {
            if (typeof type.tag === "number") {
              error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue.");
            }
          }
          if (typeof type === "function") {
            return type.displayName || type.name || null;
          }
          if (typeof type === "string") {
            return type;
          }
          switch (type) {
            case REACT_FRAGMENT_TYPE:
              return "Fragment";
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_PROFILER_TYPE:
              return "Profiler";
            case REACT_STRICT_MODE_TYPE:
              return "StrictMode";
            case REACT_SUSPENSE_TYPE:
              return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
              return "SuspenseList";
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_CONTEXT_TYPE:
                var context = type;
                return getContextName(context) + ".Consumer";
              case REACT_PROVIDER_TYPE:
                var provider = type;
                return getContextName(provider._context) + ".Provider";
              case REACT_FORWARD_REF_TYPE:
                return getWrappedName(type, type.render, "ForwardRef");
              case REACT_MEMO_TYPE:
                var outerName = type.displayName || null;
                if (outerName !== null) {
                  return outerName;
                }
                return getComponentNameFromType(type.type) || "Memo";
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return getComponentNameFromType(init(payload));
                } catch (x) {
                  return null;
                }
              }
            }
          }
          return null;
        }
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        var RESERVED_PROPS = {
          key: true,
          ref: true,
          __self: true,
          __source: true
        };
        var specialPropKeyWarningShown, specialPropRefWarningShown, didWarnAboutStringRefs;
        {
          didWarnAboutStringRefs = {};
        }
        function hasValidRef(config) {
          {
            if (hasOwnProperty.call(config, "ref")) {
              var getter = Object.getOwnPropertyDescriptor(config, "ref").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.ref !== void 0;
        }
        function hasValidKey(config) {
          {
            if (hasOwnProperty.call(config, "key")) {
              var getter = Object.getOwnPropertyDescriptor(config, "key").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.key !== void 0;
        }
        function defineKeyPropWarningGetter(props, displayName) {
          var warnAboutAccessingKey = function() {
            {
              if (!specialPropKeyWarningShown) {
                specialPropKeyWarningShown = true;
                error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingKey.isReactWarning = true;
          Object.defineProperty(props, "key", {
            get: warnAboutAccessingKey,
            configurable: true
          });
        }
        function defineRefPropWarningGetter(props, displayName) {
          var warnAboutAccessingRef = function() {
            {
              if (!specialPropRefWarningShown) {
                specialPropRefWarningShown = true;
                error("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            }
          };
          warnAboutAccessingRef.isReactWarning = true;
          Object.defineProperty(props, "ref", {
            get: warnAboutAccessingRef,
            configurable: true
          });
        }
        function warnIfStringRefCannotBeAutoConverted(config) {
          {
            if (typeof config.ref === "string" && ReactCurrentOwner.current && config.__self && ReactCurrentOwner.current.stateNode !== config.__self) {
              var componentName = getComponentNameFromType(ReactCurrentOwner.current.type);
              if (!didWarnAboutStringRefs[componentName]) {
                error('Component "%s" contains the string ref "%s". Support for string refs will be removed in a future major release. This case cannot be automatically converted to an arrow function. We ask you to manually fix this case by using useRef() or createRef() instead. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-string-ref', componentName, config.ref);
                didWarnAboutStringRefs[componentName] = true;
              }
            }
          }
        }
        var ReactElement = function(type, key, ref, self, source, owner, props) {
          var element = {
            // This tag allows us to uniquely identify this as a React Element
            $$typeof: REACT_ELEMENT_TYPE,
            // Built-in properties that belong on the element
            type,
            key,
            ref,
            props,
            // Record the component responsible for creating this element.
            _owner: owner
          };
          {
            element._store = {};
            Object.defineProperty(element._store, "validated", {
              configurable: false,
              enumerable: false,
              writable: true,
              value: false
            });
            Object.defineProperty(element, "_self", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: self
            });
            Object.defineProperty(element, "_source", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: source
            });
            if (Object.freeze) {
              Object.freeze(element.props);
              Object.freeze(element);
            }
          }
          return element;
        };
        function createElement(type, config, children) {
          var propName;
          var props = {};
          var key = null;
          var ref = null;
          var self = null;
          var source = null;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              {
                warnIfStringRefCannotBeAutoConverted(config);
              }
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            self = config.__self === void 0 ? null : config.__self;
            source = config.__source === void 0 ? null : config.__source;
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                props[propName] = config[propName];
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
              childArray[i] = arguments[i + 2];
            }
            {
              if (Object.freeze) {
                Object.freeze(childArray);
              }
            }
            props.children = childArray;
          }
          if (type && type.defaultProps) {
            var defaultProps = type.defaultProps;
            for (propName in defaultProps) {
              if (props[propName] === void 0) {
                props[propName] = defaultProps[propName];
              }
            }
          }
          {
            if (key || ref) {
              var displayName = typeof type === "function" ? type.displayName || type.name || "Unknown" : type;
              if (key) {
                defineKeyPropWarningGetter(props, displayName);
              }
              if (ref) {
                defineRefPropWarningGetter(props, displayName);
              }
            }
          }
          return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
        }
        function cloneAndReplaceKey(oldElement, newKey) {
          var newElement = ReactElement(oldElement.type, newKey, oldElement.ref, oldElement._self, oldElement._source, oldElement._owner, oldElement.props);
          return newElement;
        }
        function cloneElement(element, config, children) {
          if (element === null || element === void 0) {
            throw new Error("React.cloneElement(...): The argument must be a React element, but you passed " + element + ".");
          }
          var propName;
          var props = assign({}, element.props);
          var key = element.key;
          var ref = element.ref;
          var self = element._self;
          var source = element._source;
          var owner = element._owner;
          if (config != null) {
            if (hasValidRef(config)) {
              ref = config.ref;
              owner = ReactCurrentOwner.current;
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            var defaultProps;
            if (element.type && element.type.defaultProps) {
              defaultProps = element.type.defaultProps;
            }
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                if (config[propName] === void 0 && defaultProps !== void 0) {
                  props[propName] = defaultProps[propName];
                } else {
                  props[propName] = config[propName];
                }
              }
            }
          }
          var childrenLength = arguments.length - 2;
          if (childrenLength === 1) {
            props.children = children;
          } else if (childrenLength > 1) {
            var childArray = Array(childrenLength);
            for (var i = 0; i < childrenLength; i++) {
              childArray[i] = arguments[i + 2];
            }
            props.children = childArray;
          }
          return ReactElement(element.type, key, ref, self, source, owner, props);
        }
        function isValidElement(object) {
          return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
        }
        var SEPARATOR = ".";
        var SUBSEPARATOR = ":";
        function escape(key) {
          var escapeRegex = /[=:]/g;
          var escaperLookup = {
            "=": "=0",
            ":": "=2"
          };
          var escapedString = key.replace(escapeRegex, function(match) {
            return escaperLookup[match];
          });
          return "$" + escapedString;
        }
        var didWarnAboutMaps = false;
        var userProvidedKeyEscapeRegex = /\/+/g;
        function escapeUserProvidedKey(text) {
          return text.replace(userProvidedKeyEscapeRegex, "$&/");
        }
        function getElementKey(element, index) {
          if (typeof element === "object" && element !== null && element.key != null) {
            {
              checkKeyStringCoercion(element.key);
            }
            return escape("" + element.key);
          }
          return index.toString(36);
        }
        function mapIntoArray(children, array, escapedPrefix, nameSoFar, callback) {
          var type = typeof children;
          if (type === "undefined" || type === "boolean") {
            children = null;
          }
          var invokeCallback = false;
          if (children === null) {
            invokeCallback = true;
          } else {
            switch (type) {
              case "string":
              case "number":
                invokeCallback = true;
                break;
              case "object":
                switch (children.$$typeof) {
                  case REACT_ELEMENT_TYPE:
                  case REACT_PORTAL_TYPE:
                    invokeCallback = true;
                }
            }
          }
          if (invokeCallback) {
            var _child = children;
            var mappedChild = callback(_child);
            var childKey = nameSoFar === "" ? SEPARATOR + getElementKey(_child, 0) : nameSoFar;
            if (isArray(mappedChild)) {
              var escapedChildKey = "";
              if (childKey != null) {
                escapedChildKey = escapeUserProvidedKey(childKey) + "/";
              }
              mapIntoArray(mappedChild, array, escapedChildKey, "", function(c) {
                return c;
              });
            } else if (mappedChild != null) {
              if (isValidElement(mappedChild)) {
                {
                  if (mappedChild.key && (!_child || _child.key !== mappedChild.key)) {
                    checkKeyStringCoercion(mappedChild.key);
                  }
                }
                mappedChild = cloneAndReplaceKey(
                  mappedChild,
                  // Keep both the (mapped) and old keys if they differ, just as
                  // traverseAllChildren used to do for objects as children
                  escapedPrefix + // $FlowFixMe Flow incorrectly thinks React.Portal doesn't have a key
                  (mappedChild.key && (!_child || _child.key !== mappedChild.key) ? (
                    // $FlowFixMe Flow incorrectly thinks existing element's key can be a number
                    // eslint-disable-next-line react-internal/safe-string-coercion
                    escapeUserProvidedKey("" + mappedChild.key) + "/"
                  ) : "") + childKey
                );
              }
              array.push(mappedChild);
            }
            return 1;
          }
          var child;
          var nextName;
          var subtreeCount = 0;
          var nextNamePrefix = nameSoFar === "" ? SEPARATOR : nameSoFar + SUBSEPARATOR;
          if (isArray(children)) {
            for (var i = 0; i < children.length; i++) {
              child = children[i];
              nextName = nextNamePrefix + getElementKey(child, i);
              subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
            }
          } else {
            var iteratorFn = getIteratorFn(children);
            if (typeof iteratorFn === "function") {
              var iterableChildren = children;
              {
                if (iteratorFn === iterableChildren.entries) {
                  if (!didWarnAboutMaps) {
                    warn("Using Maps as children is not supported. Use an array of keyed ReactElements instead.");
                  }
                  didWarnAboutMaps = true;
                }
              }
              var iterator = iteratorFn.call(iterableChildren);
              var step;
              var ii = 0;
              while (!(step = iterator.next()).done) {
                child = step.value;
                nextName = nextNamePrefix + getElementKey(child, ii++);
                subtreeCount += mapIntoArray(child, array, escapedPrefix, nextName, callback);
              }
            } else if (type === "object") {
              var childrenString = String(children);
              throw new Error("Objects are not valid as a React child (found: " + (childrenString === "[object Object]" ? "object with keys {" + Object.keys(children).join(", ") + "}" : childrenString) + "). If you meant to render a collection of children, use an array instead.");
            }
          }
          return subtreeCount;
        }
        function mapChildren(children, func, context) {
          if (children == null) {
            return children;
          }
          var result = [];
          var count = 0;
          mapIntoArray(children, result, "", "", function(child) {
            return func.call(context, child, count++);
          });
          return result;
        }
        function countChildren(children) {
          var n = 0;
          mapChildren(children, function() {
            n++;
          });
          return n;
        }
        function forEachChildren(children, forEachFunc, forEachContext) {
          mapChildren(children, function() {
            forEachFunc.apply(this, arguments);
          }, forEachContext);
        }
        function toArray(children) {
          return mapChildren(children, function(child) {
            return child;
          }) || [];
        }
        function onlyChild(children) {
          if (!isValidElement(children)) {
            throw new Error("React.Children.only expected to receive a single React element child.");
          }
          return children;
        }
        function createContext2(defaultValue) {
          var context = {
            $$typeof: REACT_CONTEXT_TYPE,
            // As a workaround to support multiple concurrent renderers, we categorize
            // some renderers as primary and others as secondary. We only expect
            // there to be two concurrent renderers at most: React Native (primary) and
            // Fabric (secondary); React DOM (primary) and React ART (secondary).
            // Secondary renderers store their context values on separate fields.
            _currentValue: defaultValue,
            _currentValue2: defaultValue,
            // Used to track how many concurrent renderers this context currently
            // supports within in a single renderer. Such as parallel server rendering.
            _threadCount: 0,
            // These are circular
            Provider: null,
            Consumer: null,
            // Add these to use same hidden class in VM as ServerContext
            _defaultValue: null,
            _globalName: null
          };
          context.Provider = {
            $$typeof: REACT_PROVIDER_TYPE,
            _context: context
          };
          var hasWarnedAboutUsingNestedContextConsumers = false;
          var hasWarnedAboutUsingConsumerProvider = false;
          var hasWarnedAboutDisplayNameOnConsumer = false;
          {
            var Consumer = {
              $$typeof: REACT_CONTEXT_TYPE,
              _context: context
            };
            Object.defineProperties(Consumer, {
              Provider: {
                get: function() {
                  if (!hasWarnedAboutUsingConsumerProvider) {
                    hasWarnedAboutUsingConsumerProvider = true;
                    error("Rendering <Context.Consumer.Provider> is not supported and will be removed in a future major release. Did you mean to render <Context.Provider> instead?");
                  }
                  return context.Provider;
                },
                set: function(_Provider) {
                  context.Provider = _Provider;
                }
              },
              _currentValue: {
                get: function() {
                  return context._currentValue;
                },
                set: function(_currentValue) {
                  context._currentValue = _currentValue;
                }
              },
              _currentValue2: {
                get: function() {
                  return context._currentValue2;
                },
                set: function(_currentValue2) {
                  context._currentValue2 = _currentValue2;
                }
              },
              _threadCount: {
                get: function() {
                  return context._threadCount;
                },
                set: function(_threadCount) {
                  context._threadCount = _threadCount;
                }
              },
              Consumer: {
                get: function() {
                  if (!hasWarnedAboutUsingNestedContextConsumers) {
                    hasWarnedAboutUsingNestedContextConsumers = true;
                    error("Rendering <Context.Consumer.Consumer> is not supported and will be removed in a future major release. Did you mean to render <Context.Consumer> instead?");
                  }
                  return context.Consumer;
                }
              },
              displayName: {
                get: function() {
                  return context.displayName;
                },
                set: function(displayName) {
                  if (!hasWarnedAboutDisplayNameOnConsumer) {
                    warn("Setting `displayName` on Context.Consumer has no effect. You should set it directly on the context with Context.displayName = '%s'.", displayName);
                    hasWarnedAboutDisplayNameOnConsumer = true;
                  }
                }
              }
            });
            context.Consumer = Consumer;
          }
          {
            context._currentRenderer = null;
            context._currentRenderer2 = null;
          }
          return context;
        }
        var Uninitialized = -1;
        var Pending = 0;
        var Resolved = 1;
        var Rejected = 2;
        function lazyInitializer(payload) {
          if (payload._status === Uninitialized) {
            var ctor = payload._result;
            var thenable = ctor();
            thenable.then(function(moduleObject2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var resolved = payload;
                resolved._status = Resolved;
                resolved._result = moduleObject2;
              }
            }, function(error2) {
              if (payload._status === Pending || payload._status === Uninitialized) {
                var rejected = payload;
                rejected._status = Rejected;
                rejected._result = error2;
              }
            });
            if (payload._status === Uninitialized) {
              var pending = payload;
              pending._status = Pending;
              pending._result = thenable;
            }
          }
          if (payload._status === Resolved) {
            var moduleObject = payload._result;
            {
              if (moduleObject === void 0) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))\n\nDid you accidentally put curly braces around the import?", moduleObject);
              }
            }
            {
              if (!("default" in moduleObject)) {
                error("lazy: Expected the result of a dynamic import() call. Instead received: %s\n\nYour code should look like: \n  const MyComponent = lazy(() => import('./MyComponent'))", moduleObject);
              }
            }
            return moduleObject.default;
          } else {
            throw payload._result;
          }
        }
        function lazy(ctor) {
          var payload = {
            // We use these fields to store the result.
            _status: Uninitialized,
            _result: ctor
          };
          var lazyType = {
            $$typeof: REACT_LAZY_TYPE,
            _payload: payload,
            _init: lazyInitializer
          };
          {
            var defaultProps;
            var propTypes;
            Object.defineProperties(lazyType, {
              defaultProps: {
                configurable: true,
                get: function() {
                  return defaultProps;
                },
                set: function(newDefaultProps) {
                  error("React.lazy(...): It is not supported to assign `defaultProps` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  defaultProps = newDefaultProps;
                  Object.defineProperty(lazyType, "defaultProps", {
                    enumerable: true
                  });
                }
              },
              propTypes: {
                configurable: true,
                get: function() {
                  return propTypes;
                },
                set: function(newPropTypes) {
                  error("React.lazy(...): It is not supported to assign `propTypes` to a lazy component import. Either specify them where the component is defined, or create a wrapping component around it.");
                  propTypes = newPropTypes;
                  Object.defineProperty(lazyType, "propTypes", {
                    enumerable: true
                  });
                }
              }
            });
          }
          return lazyType;
        }
        function forwardRef(render) {
          {
            if (render != null && render.$$typeof === REACT_MEMO_TYPE) {
              error("forwardRef requires a render function but received a `memo` component. Instead of forwardRef(memo(...)), use memo(forwardRef(...)).");
            } else if (typeof render !== "function") {
              error("forwardRef requires a render function but was given %s.", render === null ? "null" : typeof render);
            } else {
              if (render.length !== 0 && render.length !== 2) {
                error("forwardRef render functions accept exactly two parameters: props and ref. %s", render.length === 1 ? "Did you forget to use the ref parameter?" : "Any additional parameter will be undefined.");
              }
            }
            if (render != null) {
              if (render.defaultProps != null || render.propTypes != null) {
                error("forwardRef render functions do not support propTypes or defaultProps. Did you accidentally pass a React component?");
              }
            }
          }
          var elementType = {
            $$typeof: REACT_FORWARD_REF_TYPE,
            render
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!render.name && !render.displayName) {
                  render.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        var REACT_MODULE_REFERENCE;
        {
          REACT_MODULE_REFERENCE = Symbol.for("react.module.reference");
        }
        function isValidElementType(type) {
          if (typeof type === "string" || typeof type === "function") {
            return true;
          }
          if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden || type === REACT_OFFSCREEN_TYPE || enableScopeAPI || enableCacheElement || enableTransitionTracing) {
            return true;
          }
          if (typeof type === "object" && type !== null) {
            if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
            // types supported by any Flight configuration anywhere since
            // we don't know which Flight build this will end up being used
            // with.
            type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== void 0) {
              return true;
            }
          }
          return false;
        }
        function memo(type, compare) {
          {
            if (!isValidElementType(type)) {
              error("memo: The first argument must be a component. Instead received: %s", type === null ? "null" : typeof type);
            }
          }
          var elementType = {
            $$typeof: REACT_MEMO_TYPE,
            type,
            compare: compare === void 0 ? null : compare
          };
          {
            var ownName;
            Object.defineProperty(elementType, "displayName", {
              enumerable: false,
              configurable: true,
              get: function() {
                return ownName;
              },
              set: function(name) {
                ownName = name;
                if (!type.name && !type.displayName) {
                  type.displayName = name;
                }
              }
            });
          }
          return elementType;
        }
        function resolveDispatcher() {
          var dispatcher = ReactCurrentDispatcher.current;
          {
            if (dispatcher === null) {
              error("Invalid hook call. Hooks can only be called inside of the body of a function component. This could happen for one of the following reasons:\n1. You might have mismatching versions of React and the renderer (such as React DOM)\n2. You might be breaking the Rules of Hooks\n3. You might have more than one copy of React in the same app\nSee https://reactjs.org/link/invalid-hook-call for tips about how to debug and fix this problem.");
            }
          }
          return dispatcher;
        }
        function useContext2(Context) {
          var dispatcher = resolveDispatcher();
          {
            if (Context._context !== void 0) {
              var realContext = Context._context;
              if (realContext.Consumer === Context) {
                error("Calling useContext(Context.Consumer) is not supported, may cause bugs, and will be removed in a future major release. Did you mean to call useContext(Context) instead?");
              } else if (realContext.Provider === Context) {
                error("Calling useContext(Context.Provider) is not supported. Did you mean to call useContext(Context) instead?");
              }
            }
          }
          return dispatcher.useContext(Context);
        }
        function useState(initialState) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useState(initialState);
        }
        function useReducer(reducer, initialArg, init) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useReducer(reducer, initialArg, init);
        }
        function useRef(initialValue) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useRef(initialValue);
        }
        function useEffect(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useEffect(create, deps);
        }
        function useInsertionEffect(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useInsertionEffect(create, deps);
        }
        function useLayoutEffect(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useLayoutEffect(create, deps);
        }
        function useCallback2(callback, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useCallback(callback, deps);
        }
        function useMemo(create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useMemo(create, deps);
        }
        function useImperativeHandle(ref, create, deps) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useImperativeHandle(ref, create, deps);
        }
        function useDebugValue(value, formatterFn) {
          {
            var dispatcher = resolveDispatcher();
            return dispatcher.useDebugValue(value, formatterFn);
          }
        }
        function useTransition() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useTransition();
        }
        function useDeferredValue(value) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useDeferredValue(value);
        }
        function useId() {
          var dispatcher = resolveDispatcher();
          return dispatcher.useId();
        }
        function useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot) {
          var dispatcher = resolveDispatcher();
          return dispatcher.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
        }
        var disabledDepth = 0;
        var prevLog;
        var prevInfo;
        var prevWarn;
        var prevError;
        var prevGroup;
        var prevGroupCollapsed;
        var prevGroupEnd;
        function disabledLog() {
        }
        disabledLog.__reactDisabledLog = true;
        function disableLogs() {
          {
            if (disabledDepth === 0) {
              prevLog = console.log;
              prevInfo = console.info;
              prevWarn = console.warn;
              prevError = console.error;
              prevGroup = console.group;
              prevGroupCollapsed = console.groupCollapsed;
              prevGroupEnd = console.groupEnd;
              var props = {
                configurable: true,
                enumerable: true,
                value: disabledLog,
                writable: true
              };
              Object.defineProperties(console, {
                info: props,
                log: props,
                warn: props,
                error: props,
                group: props,
                groupCollapsed: props,
                groupEnd: props
              });
            }
            disabledDepth++;
          }
        }
        function reenableLogs() {
          {
            disabledDepth--;
            if (disabledDepth === 0) {
              var props = {
                configurable: true,
                enumerable: true,
                writable: true
              };
              Object.defineProperties(console, {
                log: assign({}, props, {
                  value: prevLog
                }),
                info: assign({}, props, {
                  value: prevInfo
                }),
                warn: assign({}, props, {
                  value: prevWarn
                }),
                error: assign({}, props, {
                  value: prevError
                }),
                group: assign({}, props, {
                  value: prevGroup
                }),
                groupCollapsed: assign({}, props, {
                  value: prevGroupCollapsed
                }),
                groupEnd: assign({}, props, {
                  value: prevGroupEnd
                })
              });
            }
            if (disabledDepth < 0) {
              error("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
            }
          }
        }
        var ReactCurrentDispatcher$1 = ReactSharedInternals.ReactCurrentDispatcher;
        var prefix;
        function describeBuiltInComponentFrame(name, source, ownerFn) {
          {
            if (prefix === void 0) {
              try {
                throw Error();
              } catch (x) {
                var match = x.stack.trim().match(/\n( *(at )?)/);
                prefix = match && match[1] || "";
              }
            }
            return "\n" + prefix + name;
          }
        }
        var reentry = false;
        var componentFrameCache;
        {
          var PossiblyWeakMap = typeof WeakMap === "function" ? WeakMap : Map;
          componentFrameCache = new PossiblyWeakMap();
        }
        function describeNativeComponentFrame(fn, construct) {
          if (!fn || reentry) {
            return "";
          }
          {
            var frame = componentFrameCache.get(fn);
            if (frame !== void 0) {
              return frame;
            }
          }
          var control;
          reentry = true;
          var previousPrepareStackTrace = Error.prepareStackTrace;
          Error.prepareStackTrace = void 0;
          var previousDispatcher;
          {
            previousDispatcher = ReactCurrentDispatcher$1.current;
            ReactCurrentDispatcher$1.current = null;
            disableLogs();
          }
          try {
            if (construct) {
              var Fake = function() {
                throw Error();
              };
              Object.defineProperty(Fake.prototype, "props", {
                set: function() {
                  throw Error();
                }
              });
              if (typeof Reflect === "object" && Reflect.construct) {
                try {
                  Reflect.construct(Fake, []);
                } catch (x) {
                  control = x;
                }
                Reflect.construct(fn, [], Fake);
              } else {
                try {
                  Fake.call();
                } catch (x) {
                  control = x;
                }
                fn.call(Fake.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (x) {
                control = x;
              }
              fn();
            }
          } catch (sample) {
            if (sample && control && typeof sample.stack === "string") {
              var sampleLines = sample.stack.split("\n");
              var controlLines = control.stack.split("\n");
              var s = sampleLines.length - 1;
              var c = controlLines.length - 1;
              while (s >= 1 && c >= 0 && sampleLines[s] !== controlLines[c]) {
                c--;
              }
              for (; s >= 1 && c >= 0; s--, c--) {
                if (sampleLines[s] !== controlLines[c]) {
                  if (s !== 1 || c !== 1) {
                    do {
                      s--;
                      c--;
                      if (c < 0 || sampleLines[s] !== controlLines[c]) {
                        var _frame = "\n" + sampleLines[s].replace(" at new ", " at ");
                        if (fn.displayName && _frame.includes("<anonymous>")) {
                          _frame = _frame.replace("<anonymous>", fn.displayName);
                        }
                        {
                          if (typeof fn === "function") {
                            componentFrameCache.set(fn, _frame);
                          }
                        }
                        return _frame;
                      }
                    } while (s >= 1 && c >= 0);
                  }
                  break;
                }
              }
            }
          } finally {
            reentry = false;
            {
              ReactCurrentDispatcher$1.current = previousDispatcher;
              reenableLogs();
            }
            Error.prepareStackTrace = previousPrepareStackTrace;
          }
          var name = fn ? fn.displayName || fn.name : "";
          var syntheticFrame = name ? describeBuiltInComponentFrame(name) : "";
          {
            if (typeof fn === "function") {
              componentFrameCache.set(fn, syntheticFrame);
            }
          }
          return syntheticFrame;
        }
        function describeFunctionComponentFrame(fn, source, ownerFn) {
          {
            return describeNativeComponentFrame(fn, false);
          }
        }
        function shouldConstruct(Component2) {
          var prototype = Component2.prototype;
          return !!(prototype && prototype.isReactComponent);
        }
        function describeUnknownElementTypeFrameInDEV(type, source, ownerFn) {
          if (type == null) {
            return "";
          }
          if (typeof type === "function") {
            {
              return describeNativeComponentFrame(type, shouldConstruct(type));
            }
          }
          if (typeof type === "string") {
            return describeBuiltInComponentFrame(type);
          }
          switch (type) {
            case REACT_SUSPENSE_TYPE:
              return describeBuiltInComponentFrame("Suspense");
            case REACT_SUSPENSE_LIST_TYPE:
              return describeBuiltInComponentFrame("SuspenseList");
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_FORWARD_REF_TYPE:
                return describeFunctionComponentFrame(type.render);
              case REACT_MEMO_TYPE:
                return describeUnknownElementTypeFrameInDEV(type.type, source, ownerFn);
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return describeUnknownElementTypeFrameInDEV(init(payload), source, ownerFn);
                } catch (x) {
                }
              }
            }
          }
          return "";
        }
        var loggedTypeFailures = {};
        var ReactDebugCurrentFrame$1 = ReactSharedInternals.ReactDebugCurrentFrame;
        function setCurrentlyValidatingElement(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              ReactDebugCurrentFrame$1.setExtraStackFrame(stack);
            } else {
              ReactDebugCurrentFrame$1.setExtraStackFrame(null);
            }
          }
        }
        function checkPropTypes(typeSpecs, values, location, componentName, element) {
          {
            var has = Function.call.bind(hasOwnProperty);
            for (var typeSpecName in typeSpecs) {
              if (has(typeSpecs, typeSpecName)) {
                var error$1 = void 0;
                try {
                  if (typeof typeSpecs[typeSpecName] !== "function") {
                    var err = Error((componentName || "React class") + ": " + location + " type `" + typeSpecName + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof typeSpecs[typeSpecName] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                    err.name = "Invariant Violation";
                    throw err;
                  }
                  error$1 = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
                } catch (ex) {
                  error$1 = ex;
                }
                if (error$1 && !(error$1 instanceof Error)) {
                  setCurrentlyValidatingElement(element);
                  error("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", componentName || "React class", location, typeSpecName, typeof error$1);
                  setCurrentlyValidatingElement(null);
                }
                if (error$1 instanceof Error && !(error$1.message in loggedTypeFailures)) {
                  loggedTypeFailures[error$1.message] = true;
                  setCurrentlyValidatingElement(element);
                  error("Failed %s type: %s", location, error$1.message);
                  setCurrentlyValidatingElement(null);
                }
              }
            }
          }
        }
        function setCurrentlyValidatingElement$1(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              setExtraStackFrame(stack);
            } else {
              setExtraStackFrame(null);
            }
          }
        }
        var propTypesMisspellWarningShown;
        {
          propTypesMisspellWarningShown = false;
        }
        function getDeclarationErrorAddendum() {
          if (ReactCurrentOwner.current) {
            var name = getComponentNameFromType(ReactCurrentOwner.current.type);
            if (name) {
              return "\n\nCheck the render method of `" + name + "`.";
            }
          }
          return "";
        }
        function getSourceInfoErrorAddendum(source) {
          if (source !== void 0) {
            var fileName = source.fileName.replace(/^.*[\\\/]/, "");
            var lineNumber = source.lineNumber;
            return "\n\nCheck your code at " + fileName + ":" + lineNumber + ".";
          }
          return "";
        }
        function getSourceInfoErrorAddendumForProps(elementProps) {
          if (elementProps !== null && elementProps !== void 0) {
            return getSourceInfoErrorAddendum(elementProps.__source);
          }
          return "";
        }
        var ownerHasKeyUseWarning = {};
        function getCurrentComponentErrorInfo(parentType) {
          var info = getDeclarationErrorAddendum();
          if (!info) {
            var parentName = typeof parentType === "string" ? parentType : parentType.displayName || parentType.name;
            if (parentName) {
              info = "\n\nCheck the top-level render call using <" + parentName + ">.";
            }
          }
          return info;
        }
        function validateExplicitKey(element, parentType) {
          if (!element._store || element._store.validated || element.key != null) {
            return;
          }
          element._store.validated = true;
          var currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);
          if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
            return;
          }
          ownerHasKeyUseWarning[currentComponentErrorInfo] = true;
          var childOwner = "";
          if (element && element._owner && element._owner !== ReactCurrentOwner.current) {
            childOwner = " It was passed a child from " + getComponentNameFromType(element._owner.type) + ".";
          }
          {
            setCurrentlyValidatingElement$1(element);
            error('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', currentComponentErrorInfo, childOwner);
            setCurrentlyValidatingElement$1(null);
          }
        }
        function validateChildKeys(node, parentType) {
          if (typeof node !== "object") {
            return;
          }
          if (isArray(node)) {
            for (var i = 0; i < node.length; i++) {
              var child = node[i];
              if (isValidElement(child)) {
                validateExplicitKey(child, parentType);
              }
            }
          } else if (isValidElement(node)) {
            if (node._store) {
              node._store.validated = true;
            }
          } else if (node) {
            var iteratorFn = getIteratorFn(node);
            if (typeof iteratorFn === "function") {
              if (iteratorFn !== node.entries) {
                var iterator = iteratorFn.call(node);
                var step;
                while (!(step = iterator.next()).done) {
                  if (isValidElement(step.value)) {
                    validateExplicitKey(step.value, parentType);
                  }
                }
              }
            }
          }
        }
        function validatePropTypes(element) {
          {
            var type = element.type;
            if (type === null || type === void 0 || typeof type === "string") {
              return;
            }
            var propTypes;
            if (typeof type === "function") {
              propTypes = type.propTypes;
            } else if (typeof type === "object" && (type.$$typeof === REACT_FORWARD_REF_TYPE || // Note: Memo only checks outer props here.
            // Inner props are checked in the reconciler.
            type.$$typeof === REACT_MEMO_TYPE)) {
              propTypes = type.propTypes;
            } else {
              return;
            }
            if (propTypes) {
              var name = getComponentNameFromType(type);
              checkPropTypes(propTypes, element.props, "prop", name, element);
            } else if (type.PropTypes !== void 0 && !propTypesMisspellWarningShown) {
              propTypesMisspellWarningShown = true;
              var _name = getComponentNameFromType(type);
              error("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", _name || "Unknown");
            }
            if (typeof type.getDefaultProps === "function" && !type.getDefaultProps.isReactClassApproved) {
              error("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
            }
          }
        }
        function validateFragmentProps(fragment) {
          {
            var keys = Object.keys(fragment.props);
            for (var i = 0; i < keys.length; i++) {
              var key = keys[i];
              if (key !== "children" && key !== "key") {
                setCurrentlyValidatingElement$1(fragment);
                error("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", key);
                setCurrentlyValidatingElement$1(null);
                break;
              }
            }
            if (fragment.ref !== null) {
              setCurrentlyValidatingElement$1(fragment);
              error("Invalid attribute `ref` supplied to `React.Fragment`.");
              setCurrentlyValidatingElement$1(null);
            }
          }
        }
        function createElementWithValidation(type, props, children) {
          var validType = isValidElementType(type);
          if (!validType) {
            var info = "";
            if (type === void 0 || typeof type === "object" && type !== null && Object.keys(type).length === 0) {
              info += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
            }
            var sourceInfo = getSourceInfoErrorAddendumForProps(props);
            if (sourceInfo) {
              info += sourceInfo;
            } else {
              info += getDeclarationErrorAddendum();
            }
            var typeString;
            if (type === null) {
              typeString = "null";
            } else if (isArray(type)) {
              typeString = "array";
            } else if (type !== void 0 && type.$$typeof === REACT_ELEMENT_TYPE) {
              typeString = "<" + (getComponentNameFromType(type.type) || "Unknown") + " />";
              info = " Did you accidentally export a JSX literal instead of a component?";
            } else {
              typeString = typeof type;
            }
            {
              error("React.createElement: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", typeString, info);
            }
          }
          var element = createElement.apply(this, arguments);
          if (element == null) {
            return element;
          }
          if (validType) {
            for (var i = 2; i < arguments.length; i++) {
              validateChildKeys(arguments[i], type);
            }
          }
          if (type === REACT_FRAGMENT_TYPE) {
            validateFragmentProps(element);
          } else {
            validatePropTypes(element);
          }
          return element;
        }
        var didWarnAboutDeprecatedCreateFactory = false;
        function createFactoryWithValidation(type) {
          var validatedFactory = createElementWithValidation.bind(null, type);
          validatedFactory.type = type;
          {
            if (!didWarnAboutDeprecatedCreateFactory) {
              didWarnAboutDeprecatedCreateFactory = true;
              warn("React.createFactory() is deprecated and will be removed in a future major release. Consider using JSX or use React.createElement() directly instead.");
            }
            Object.defineProperty(validatedFactory, "type", {
              enumerable: false,
              get: function() {
                warn("Factory.type is deprecated. Access the class directly before passing it to createFactory.");
                Object.defineProperty(this, "type", {
                  value: type
                });
                return type;
              }
            });
          }
          return validatedFactory;
        }
        function cloneElementWithValidation(element, props, children) {
          var newElement = cloneElement.apply(this, arguments);
          for (var i = 2; i < arguments.length; i++) {
            validateChildKeys(arguments[i], newElement.type);
          }
          validatePropTypes(newElement);
          return newElement;
        }
        function startTransition(scope, options) {
          var prevTransition = ReactCurrentBatchConfig.transition;
          ReactCurrentBatchConfig.transition = {};
          var currentTransition = ReactCurrentBatchConfig.transition;
          {
            ReactCurrentBatchConfig.transition._updatedFibers = /* @__PURE__ */ new Set();
          }
          try {
            scope();
          } finally {
            ReactCurrentBatchConfig.transition = prevTransition;
            {
              if (prevTransition === null && currentTransition._updatedFibers) {
                var updatedFibersCount = currentTransition._updatedFibers.size;
                if (updatedFibersCount > 10) {
                  warn("Detected a large number of updates inside startTransition. If this is due to a subscription please re-write it to use React provided hooks. Otherwise concurrent mode guarantees are off the table.");
                }
                currentTransition._updatedFibers.clear();
              }
            }
          }
        }
        var didWarnAboutMessageChannel = false;
        var enqueueTaskImpl = null;
        function enqueueTask(task) {
          if (enqueueTaskImpl === null) {
            try {
              var requireString = ("require" + Math.random()).slice(0, 7);
              var nodeRequire = module2 && module2[requireString];
              enqueueTaskImpl = nodeRequire.call(module2, "timers").setImmediate;
            } catch (_err) {
              enqueueTaskImpl = function(callback) {
                {
                  if (didWarnAboutMessageChannel === false) {
                    didWarnAboutMessageChannel = true;
                    if (typeof MessageChannel === "undefined") {
                      error("This browser does not have a MessageChannel implementation, so enqueuing tasks via await act(async () => ...) will fail. Please file an issue at https://github.com/facebook/react/issues if you encounter this warning.");
                    }
                  }
                }
                var channel = new MessageChannel();
                channel.port1.onmessage = callback;
                channel.port2.postMessage(void 0);
              };
            }
          }
          return enqueueTaskImpl(task);
        }
        var actScopeDepth = 0;
        var didWarnNoAwaitAct = false;
        function act(callback) {
          {
            var prevActScopeDepth = actScopeDepth;
            actScopeDepth++;
            if (ReactCurrentActQueue.current === null) {
              ReactCurrentActQueue.current = [];
            }
            var prevIsBatchingLegacy = ReactCurrentActQueue.isBatchingLegacy;
            var result;
            try {
              ReactCurrentActQueue.isBatchingLegacy = true;
              result = callback();
              if (!prevIsBatchingLegacy && ReactCurrentActQueue.didScheduleLegacyUpdate) {
                var queue = ReactCurrentActQueue.current;
                if (queue !== null) {
                  ReactCurrentActQueue.didScheduleLegacyUpdate = false;
                  flushActQueue(queue);
                }
              }
            } catch (error2) {
              popActScope(prevActScopeDepth);
              throw error2;
            } finally {
              ReactCurrentActQueue.isBatchingLegacy = prevIsBatchingLegacy;
            }
            if (result !== null && typeof result === "object" && typeof result.then === "function") {
              var thenableResult = result;
              var wasAwaited = false;
              var thenable = {
                then: function(resolve2, reject) {
                  wasAwaited = true;
                  thenableResult.then(function(returnValue2) {
                    popActScope(prevActScopeDepth);
                    if (actScopeDepth === 0) {
                      recursivelyFlushAsyncActWork(returnValue2, resolve2, reject);
                    } else {
                      resolve2(returnValue2);
                    }
                  }, function(error2) {
                    popActScope(prevActScopeDepth);
                    reject(error2);
                  });
                }
              };
              {
                if (!didWarnNoAwaitAct && typeof Promise !== "undefined") {
                  Promise.resolve().then(function() {
                  }).then(function() {
                    if (!wasAwaited) {
                      didWarnNoAwaitAct = true;
                      error("You called act(async () => ...) without await. This could lead to unexpected testing behaviour, interleaving multiple act calls and mixing their scopes. You should - await act(async () => ...);");
                    }
                  });
                }
              }
              return thenable;
            } else {
              var returnValue = result;
              popActScope(prevActScopeDepth);
              if (actScopeDepth === 0) {
                var _queue = ReactCurrentActQueue.current;
                if (_queue !== null) {
                  flushActQueue(_queue);
                  ReactCurrentActQueue.current = null;
                }
                var _thenable = {
                  then: function(resolve2, reject) {
                    if (ReactCurrentActQueue.current === null) {
                      ReactCurrentActQueue.current = [];
                      recursivelyFlushAsyncActWork(returnValue, resolve2, reject);
                    } else {
                      resolve2(returnValue);
                    }
                  }
                };
                return _thenable;
              } else {
                var _thenable2 = {
                  then: function(resolve2, reject) {
                    resolve2(returnValue);
                  }
                };
                return _thenable2;
              }
            }
          }
        }
        function popActScope(prevActScopeDepth) {
          {
            if (prevActScopeDepth !== actScopeDepth - 1) {
              error("You seem to have overlapping act() calls, this is not supported. Be sure to await previous act() calls before making a new one. ");
            }
            actScopeDepth = prevActScopeDepth;
          }
        }
        function recursivelyFlushAsyncActWork(returnValue, resolve2, reject) {
          {
            var queue = ReactCurrentActQueue.current;
            if (queue !== null) {
              try {
                flushActQueue(queue);
                enqueueTask(function() {
                  if (queue.length === 0) {
                    ReactCurrentActQueue.current = null;
                    resolve2(returnValue);
                  } else {
                    recursivelyFlushAsyncActWork(returnValue, resolve2, reject);
                  }
                });
              } catch (error2) {
                reject(error2);
              }
            } else {
              resolve2(returnValue);
            }
          }
        }
        var isFlushing = false;
        function flushActQueue(queue) {
          {
            if (!isFlushing) {
              isFlushing = true;
              var i = 0;
              try {
                for (; i < queue.length; i++) {
                  var callback = queue[i];
                  do {
                    callback = callback(true);
                  } while (callback !== null);
                }
                queue.length = 0;
              } catch (error2) {
                queue = queue.slice(i + 1);
                throw error2;
              } finally {
                isFlushing = false;
              }
            }
          }
        }
        var createElement$1 = createElementWithValidation;
        var cloneElement$1 = cloneElementWithValidation;
        var createFactory = createFactoryWithValidation;
        var Children = {
          map: mapChildren,
          forEach: forEachChildren,
          count: countChildren,
          toArray,
          only: onlyChild
        };
        exports2.Children = Children;
        exports2.Component = Component;
        exports2.Fragment = REACT_FRAGMENT_TYPE;
        exports2.Profiler = REACT_PROFILER_TYPE;
        exports2.PureComponent = PureComponent;
        exports2.StrictMode = REACT_STRICT_MODE_TYPE;
        exports2.Suspense = REACT_SUSPENSE_TYPE;
        exports2.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED = ReactSharedInternals;
        exports2.act = act;
        exports2.cloneElement = cloneElement$1;
        exports2.createContext = createContext2;
        exports2.createElement = createElement$1;
        exports2.createFactory = createFactory;
        exports2.createRef = createRef;
        exports2.forwardRef = forwardRef;
        exports2.isValidElement = isValidElement;
        exports2.lazy = lazy;
        exports2.memo = memo;
        exports2.startTransition = startTransition;
        exports2.unstable_act = act;
        exports2.useCallback = useCallback2;
        exports2.useContext = useContext2;
        exports2.useDebugValue = useDebugValue;
        exports2.useDeferredValue = useDeferredValue;
        exports2.useEffect = useEffect;
        exports2.useId = useId;
        exports2.useImperativeHandle = useImperativeHandle;
        exports2.useInsertionEffect = useInsertionEffect;
        exports2.useLayoutEffect = useLayoutEffect;
        exports2.useMemo = useMemo;
        exports2.useReducer = useReducer;
        exports2.useRef = useRef;
        exports2.useState = useState;
        exports2.useSyncExternalStore = useSyncExternalStore;
        exports2.useTransition = useTransition;
        exports2.version = ReactVersion;
        if (typeof __REACT_DEVTOOLS_GLOBAL_HOOK__ !== "undefined" && typeof __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop === "function") {
          __REACT_DEVTOOLS_GLOBAL_HOOK__.registerInternalModuleStop(new Error());
        }
      })();
    }
  }
});

// node_modules/react/index.js
var require_react = __commonJS({
  "node_modules/react/index.js"(exports2, module2) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module2.exports = require_react_production_min();
    } else {
      module2.exports = require_react_development();
    }
  }
});

// node_modules/react/cjs/react-jsx-runtime.production.min.js
var require_react_jsx_runtime_production_min = __commonJS({
  "node_modules/react/cjs/react-jsx-runtime.production.min.js"(exports2) {
    "use strict";
    var f = require_react();
    var k = Symbol.for("react.element");
    var l = Symbol.for("react.fragment");
    var m = Object.prototype.hasOwnProperty;
    var n = f.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED.ReactCurrentOwner;
    var p = { key: true, ref: true, __self: true, __source: true };
    function q(c, a, g) {
      var b, d = {}, e = null, h = null;
      void 0 !== g && (e = "" + g);
      void 0 !== a.key && (e = "" + a.key);
      void 0 !== a.ref && (h = a.ref);
      for (b in a) m.call(a, b) && !p.hasOwnProperty(b) && (d[b] = a[b]);
      if (c && c.defaultProps) for (b in a = c.defaultProps, a) void 0 === d[b] && (d[b] = a[b]);
      return { $$typeof: k, type: c, key: e, ref: h, props: d, _owner: n.current };
    }
    exports2.Fragment = l;
    exports2.jsx = q;
    exports2.jsxs = q;
  }
});

// node_modules/react/cjs/react-jsx-runtime.development.js
var require_react_jsx_runtime_development = __commonJS({
  "node_modules/react/cjs/react-jsx-runtime.development.js"(exports2) {
    "use strict";
    if (process.env.NODE_ENV !== "production") {
      (function() {
        "use strict";
        var React2 = require_react();
        var REACT_ELEMENT_TYPE = Symbol.for("react.element");
        var REACT_PORTAL_TYPE = Symbol.for("react.portal");
        var REACT_FRAGMENT_TYPE = Symbol.for("react.fragment");
        var REACT_STRICT_MODE_TYPE = Symbol.for("react.strict_mode");
        var REACT_PROFILER_TYPE = Symbol.for("react.profiler");
        var REACT_PROVIDER_TYPE = Symbol.for("react.provider");
        var REACT_CONTEXT_TYPE = Symbol.for("react.context");
        var REACT_FORWARD_REF_TYPE = Symbol.for("react.forward_ref");
        var REACT_SUSPENSE_TYPE = Symbol.for("react.suspense");
        var REACT_SUSPENSE_LIST_TYPE = Symbol.for("react.suspense_list");
        var REACT_MEMO_TYPE = Symbol.for("react.memo");
        var REACT_LAZY_TYPE = Symbol.for("react.lazy");
        var REACT_OFFSCREEN_TYPE = Symbol.for("react.offscreen");
        var MAYBE_ITERATOR_SYMBOL = Symbol.iterator;
        var FAUX_ITERATOR_SYMBOL = "@@iterator";
        function getIteratorFn(maybeIterable) {
          if (maybeIterable === null || typeof maybeIterable !== "object") {
            return null;
          }
          var maybeIterator = MAYBE_ITERATOR_SYMBOL && maybeIterable[MAYBE_ITERATOR_SYMBOL] || maybeIterable[FAUX_ITERATOR_SYMBOL];
          if (typeof maybeIterator === "function") {
            return maybeIterator;
          }
          return null;
        }
        var ReactSharedInternals = React2.__SECRET_INTERNALS_DO_NOT_USE_OR_YOU_WILL_BE_FIRED;
        function error(format) {
          {
            {
              for (var _len2 = arguments.length, args = new Array(_len2 > 1 ? _len2 - 1 : 0), _key2 = 1; _key2 < _len2; _key2++) {
                args[_key2 - 1] = arguments[_key2];
              }
              printWarning("error", format, args);
            }
          }
        }
        function printWarning(level, format, args) {
          {
            var ReactDebugCurrentFrame2 = ReactSharedInternals.ReactDebugCurrentFrame;
            var stack = ReactDebugCurrentFrame2.getStackAddendum();
            if (stack !== "") {
              format += "%s";
              args = args.concat([stack]);
            }
            var argsWithFormat = args.map(function(item) {
              return String(item);
            });
            argsWithFormat.unshift("Warning: " + format);
            Function.prototype.apply.call(console[level], console, argsWithFormat);
          }
        }
        var enableScopeAPI = false;
        var enableCacheElement = false;
        var enableTransitionTracing = false;
        var enableLegacyHidden = false;
        var enableDebugTracing = false;
        var REACT_MODULE_REFERENCE;
        {
          REACT_MODULE_REFERENCE = Symbol.for("react.module.reference");
        }
        function isValidElementType(type) {
          if (typeof type === "string" || typeof type === "function") {
            return true;
          }
          if (type === REACT_FRAGMENT_TYPE || type === REACT_PROFILER_TYPE || enableDebugTracing || type === REACT_STRICT_MODE_TYPE || type === REACT_SUSPENSE_TYPE || type === REACT_SUSPENSE_LIST_TYPE || enableLegacyHidden || type === REACT_OFFSCREEN_TYPE || enableScopeAPI || enableCacheElement || enableTransitionTracing) {
            return true;
          }
          if (typeof type === "object" && type !== null) {
            if (type.$$typeof === REACT_LAZY_TYPE || type.$$typeof === REACT_MEMO_TYPE || type.$$typeof === REACT_PROVIDER_TYPE || type.$$typeof === REACT_CONTEXT_TYPE || type.$$typeof === REACT_FORWARD_REF_TYPE || // This needs to include all possible module reference object
            // types supported by any Flight configuration anywhere since
            // we don't know which Flight build this will end up being used
            // with.
            type.$$typeof === REACT_MODULE_REFERENCE || type.getModuleId !== void 0) {
              return true;
            }
          }
          return false;
        }
        function getWrappedName(outerType, innerType, wrapperName) {
          var displayName = outerType.displayName;
          if (displayName) {
            return displayName;
          }
          var functionName = innerType.displayName || innerType.name || "";
          return functionName !== "" ? wrapperName + "(" + functionName + ")" : wrapperName;
        }
        function getContextName(type) {
          return type.displayName || "Context";
        }
        function getComponentNameFromType(type) {
          if (type == null) {
            return null;
          }
          {
            if (typeof type.tag === "number") {
              error("Received an unexpected object in getComponentNameFromType(). This is likely a bug in React. Please file an issue.");
            }
          }
          if (typeof type === "function") {
            return type.displayName || type.name || null;
          }
          if (typeof type === "string") {
            return type;
          }
          switch (type) {
            case REACT_FRAGMENT_TYPE:
              return "Fragment";
            case REACT_PORTAL_TYPE:
              return "Portal";
            case REACT_PROFILER_TYPE:
              return "Profiler";
            case REACT_STRICT_MODE_TYPE:
              return "StrictMode";
            case REACT_SUSPENSE_TYPE:
              return "Suspense";
            case REACT_SUSPENSE_LIST_TYPE:
              return "SuspenseList";
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_CONTEXT_TYPE:
                var context = type;
                return getContextName(context) + ".Consumer";
              case REACT_PROVIDER_TYPE:
                var provider = type;
                return getContextName(provider._context) + ".Provider";
              case REACT_FORWARD_REF_TYPE:
                return getWrappedName(type, type.render, "ForwardRef");
              case REACT_MEMO_TYPE:
                var outerName = type.displayName || null;
                if (outerName !== null) {
                  return outerName;
                }
                return getComponentNameFromType(type.type) || "Memo";
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return getComponentNameFromType(init(payload));
                } catch (x) {
                  return null;
                }
              }
            }
          }
          return null;
        }
        var assign = Object.assign;
        var disabledDepth = 0;
        var prevLog;
        var prevInfo;
        var prevWarn;
        var prevError;
        var prevGroup;
        var prevGroupCollapsed;
        var prevGroupEnd;
        function disabledLog() {
        }
        disabledLog.__reactDisabledLog = true;
        function disableLogs() {
          {
            if (disabledDepth === 0) {
              prevLog = console.log;
              prevInfo = console.info;
              prevWarn = console.warn;
              prevError = console.error;
              prevGroup = console.group;
              prevGroupCollapsed = console.groupCollapsed;
              prevGroupEnd = console.groupEnd;
              var props = {
                configurable: true,
                enumerable: true,
                value: disabledLog,
                writable: true
              };
              Object.defineProperties(console, {
                info: props,
                log: props,
                warn: props,
                error: props,
                group: props,
                groupCollapsed: props,
                groupEnd: props
              });
            }
            disabledDepth++;
          }
        }
        function reenableLogs() {
          {
            disabledDepth--;
            if (disabledDepth === 0) {
              var props = {
                configurable: true,
                enumerable: true,
                writable: true
              };
              Object.defineProperties(console, {
                log: assign({}, props, {
                  value: prevLog
                }),
                info: assign({}, props, {
                  value: prevInfo
                }),
                warn: assign({}, props, {
                  value: prevWarn
                }),
                error: assign({}, props, {
                  value: prevError
                }),
                group: assign({}, props, {
                  value: prevGroup
                }),
                groupCollapsed: assign({}, props, {
                  value: prevGroupCollapsed
                }),
                groupEnd: assign({}, props, {
                  value: prevGroupEnd
                })
              });
            }
            if (disabledDepth < 0) {
              error("disabledDepth fell below zero. This is a bug in React. Please file an issue.");
            }
          }
        }
        var ReactCurrentDispatcher = ReactSharedInternals.ReactCurrentDispatcher;
        var prefix;
        function describeBuiltInComponentFrame(name, source, ownerFn) {
          {
            if (prefix === void 0) {
              try {
                throw Error();
              } catch (x) {
                var match = x.stack.trim().match(/\n( *(at )?)/);
                prefix = match && match[1] || "";
              }
            }
            return "\n" + prefix + name;
          }
        }
        var reentry = false;
        var componentFrameCache;
        {
          var PossiblyWeakMap = typeof WeakMap === "function" ? WeakMap : Map;
          componentFrameCache = new PossiblyWeakMap();
        }
        function describeNativeComponentFrame(fn, construct) {
          if (!fn || reentry) {
            return "";
          }
          {
            var frame = componentFrameCache.get(fn);
            if (frame !== void 0) {
              return frame;
            }
          }
          var control;
          reentry = true;
          var previousPrepareStackTrace = Error.prepareStackTrace;
          Error.prepareStackTrace = void 0;
          var previousDispatcher;
          {
            previousDispatcher = ReactCurrentDispatcher.current;
            ReactCurrentDispatcher.current = null;
            disableLogs();
          }
          try {
            if (construct) {
              var Fake = function() {
                throw Error();
              };
              Object.defineProperty(Fake.prototype, "props", {
                set: function() {
                  throw Error();
                }
              });
              if (typeof Reflect === "object" && Reflect.construct) {
                try {
                  Reflect.construct(Fake, []);
                } catch (x) {
                  control = x;
                }
                Reflect.construct(fn, [], Fake);
              } else {
                try {
                  Fake.call();
                } catch (x) {
                  control = x;
                }
                fn.call(Fake.prototype);
              }
            } else {
              try {
                throw Error();
              } catch (x) {
                control = x;
              }
              fn();
            }
          } catch (sample) {
            if (sample && control && typeof sample.stack === "string") {
              var sampleLines = sample.stack.split("\n");
              var controlLines = control.stack.split("\n");
              var s = sampleLines.length - 1;
              var c = controlLines.length - 1;
              while (s >= 1 && c >= 0 && sampleLines[s] !== controlLines[c]) {
                c--;
              }
              for (; s >= 1 && c >= 0; s--, c--) {
                if (sampleLines[s] !== controlLines[c]) {
                  if (s !== 1 || c !== 1) {
                    do {
                      s--;
                      c--;
                      if (c < 0 || sampleLines[s] !== controlLines[c]) {
                        var _frame = "\n" + sampleLines[s].replace(" at new ", " at ");
                        if (fn.displayName && _frame.includes("<anonymous>")) {
                          _frame = _frame.replace("<anonymous>", fn.displayName);
                        }
                        {
                          if (typeof fn === "function") {
                            componentFrameCache.set(fn, _frame);
                          }
                        }
                        return _frame;
                      }
                    } while (s >= 1 && c >= 0);
                  }
                  break;
                }
              }
            }
          } finally {
            reentry = false;
            {
              ReactCurrentDispatcher.current = previousDispatcher;
              reenableLogs();
            }
            Error.prepareStackTrace = previousPrepareStackTrace;
          }
          var name = fn ? fn.displayName || fn.name : "";
          var syntheticFrame = name ? describeBuiltInComponentFrame(name) : "";
          {
            if (typeof fn === "function") {
              componentFrameCache.set(fn, syntheticFrame);
            }
          }
          return syntheticFrame;
        }
        function describeFunctionComponentFrame(fn, source, ownerFn) {
          {
            return describeNativeComponentFrame(fn, false);
          }
        }
        function shouldConstruct(Component) {
          var prototype = Component.prototype;
          return !!(prototype && prototype.isReactComponent);
        }
        function describeUnknownElementTypeFrameInDEV(type, source, ownerFn) {
          if (type == null) {
            return "";
          }
          if (typeof type === "function") {
            {
              return describeNativeComponentFrame(type, shouldConstruct(type));
            }
          }
          if (typeof type === "string") {
            return describeBuiltInComponentFrame(type);
          }
          switch (type) {
            case REACT_SUSPENSE_TYPE:
              return describeBuiltInComponentFrame("Suspense");
            case REACT_SUSPENSE_LIST_TYPE:
              return describeBuiltInComponentFrame("SuspenseList");
          }
          if (typeof type === "object") {
            switch (type.$$typeof) {
              case REACT_FORWARD_REF_TYPE:
                return describeFunctionComponentFrame(type.render);
              case REACT_MEMO_TYPE:
                return describeUnknownElementTypeFrameInDEV(type.type, source, ownerFn);
              case REACT_LAZY_TYPE: {
                var lazyComponent = type;
                var payload = lazyComponent._payload;
                var init = lazyComponent._init;
                try {
                  return describeUnknownElementTypeFrameInDEV(init(payload), source, ownerFn);
                } catch (x) {
                }
              }
            }
          }
          return "";
        }
        var hasOwnProperty = Object.prototype.hasOwnProperty;
        var loggedTypeFailures = {};
        var ReactDebugCurrentFrame = ReactSharedInternals.ReactDebugCurrentFrame;
        function setCurrentlyValidatingElement(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              ReactDebugCurrentFrame.setExtraStackFrame(stack);
            } else {
              ReactDebugCurrentFrame.setExtraStackFrame(null);
            }
          }
        }
        function checkPropTypes(typeSpecs, values, location, componentName, element) {
          {
            var has = Function.call.bind(hasOwnProperty);
            for (var typeSpecName in typeSpecs) {
              if (has(typeSpecs, typeSpecName)) {
                var error$1 = void 0;
                try {
                  if (typeof typeSpecs[typeSpecName] !== "function") {
                    var err = Error((componentName || "React class") + ": " + location + " type `" + typeSpecName + "` is invalid; it must be a function, usually from the `prop-types` package, but received `" + typeof typeSpecs[typeSpecName] + "`.This often happens because of typos such as `PropTypes.function` instead of `PropTypes.func`.");
                    err.name = "Invariant Violation";
                    throw err;
                  }
                  error$1 = typeSpecs[typeSpecName](values, typeSpecName, componentName, location, null, "SECRET_DO_NOT_PASS_THIS_OR_YOU_WILL_BE_FIRED");
                } catch (ex) {
                  error$1 = ex;
                }
                if (error$1 && !(error$1 instanceof Error)) {
                  setCurrentlyValidatingElement(element);
                  error("%s: type specification of %s `%s` is invalid; the type checker function must return `null` or an `Error` but returned a %s. You may have forgotten to pass an argument to the type checker creator (arrayOf, instanceOf, objectOf, oneOf, oneOfType, and shape all require an argument).", componentName || "React class", location, typeSpecName, typeof error$1);
                  setCurrentlyValidatingElement(null);
                }
                if (error$1 instanceof Error && !(error$1.message in loggedTypeFailures)) {
                  loggedTypeFailures[error$1.message] = true;
                  setCurrentlyValidatingElement(element);
                  error("Failed %s type: %s", location, error$1.message);
                  setCurrentlyValidatingElement(null);
                }
              }
            }
          }
        }
        var isArrayImpl = Array.isArray;
        function isArray(a) {
          return isArrayImpl(a);
        }
        function typeName(value) {
          {
            var hasToStringTag = typeof Symbol === "function" && Symbol.toStringTag;
            var type = hasToStringTag && value[Symbol.toStringTag] || value.constructor.name || "Object";
            return type;
          }
        }
        function willCoercionThrow(value) {
          {
            try {
              testStringCoercion(value);
              return false;
            } catch (e) {
              return true;
            }
          }
        }
        function testStringCoercion(value) {
          return "" + value;
        }
        function checkKeyStringCoercion(value) {
          {
            if (willCoercionThrow(value)) {
              error("The provided key is an unsupported type %s. This value must be coerced to a string before before using it here.", typeName(value));
              return testStringCoercion(value);
            }
          }
        }
        var ReactCurrentOwner = ReactSharedInternals.ReactCurrentOwner;
        var RESERVED_PROPS = {
          key: true,
          ref: true,
          __self: true,
          __source: true
        };
        var specialPropKeyWarningShown;
        var specialPropRefWarningShown;
        var didWarnAboutStringRefs;
        {
          didWarnAboutStringRefs = {};
        }
        function hasValidRef(config) {
          {
            if (hasOwnProperty.call(config, "ref")) {
              var getter = Object.getOwnPropertyDescriptor(config, "ref").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.ref !== void 0;
        }
        function hasValidKey(config) {
          {
            if (hasOwnProperty.call(config, "key")) {
              var getter = Object.getOwnPropertyDescriptor(config, "key").get;
              if (getter && getter.isReactWarning) {
                return false;
              }
            }
          }
          return config.key !== void 0;
        }
        function warnIfStringRefCannotBeAutoConverted(config, self) {
          {
            if (typeof config.ref === "string" && ReactCurrentOwner.current && self && ReactCurrentOwner.current.stateNode !== self) {
              var componentName = getComponentNameFromType(ReactCurrentOwner.current.type);
              if (!didWarnAboutStringRefs[componentName]) {
                error('Component "%s" contains the string ref "%s". Support for string refs will be removed in a future major release. This case cannot be automatically converted to an arrow function. We ask you to manually fix this case by using useRef() or createRef() instead. Learn more about using refs safely here: https://reactjs.org/link/strict-mode-string-ref', getComponentNameFromType(ReactCurrentOwner.current.type), config.ref);
                didWarnAboutStringRefs[componentName] = true;
              }
            }
          }
        }
        function defineKeyPropWarningGetter(props, displayName) {
          {
            var warnAboutAccessingKey = function() {
              if (!specialPropKeyWarningShown) {
                specialPropKeyWarningShown = true;
                error("%s: `key` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            };
            warnAboutAccessingKey.isReactWarning = true;
            Object.defineProperty(props, "key", {
              get: warnAboutAccessingKey,
              configurable: true
            });
          }
        }
        function defineRefPropWarningGetter(props, displayName) {
          {
            var warnAboutAccessingRef = function() {
              if (!specialPropRefWarningShown) {
                specialPropRefWarningShown = true;
                error("%s: `ref` is not a prop. Trying to access it will result in `undefined` being returned. If you need to access the same value within the child component, you should pass it as a different prop. (https://reactjs.org/link/special-props)", displayName);
              }
            };
            warnAboutAccessingRef.isReactWarning = true;
            Object.defineProperty(props, "ref", {
              get: warnAboutAccessingRef,
              configurable: true
            });
          }
        }
        var ReactElement = function(type, key, ref, self, source, owner, props) {
          var element = {
            // This tag allows us to uniquely identify this as a React Element
            $$typeof: REACT_ELEMENT_TYPE,
            // Built-in properties that belong on the element
            type,
            key,
            ref,
            props,
            // Record the component responsible for creating this element.
            _owner: owner
          };
          {
            element._store = {};
            Object.defineProperty(element._store, "validated", {
              configurable: false,
              enumerable: false,
              writable: true,
              value: false
            });
            Object.defineProperty(element, "_self", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: self
            });
            Object.defineProperty(element, "_source", {
              configurable: false,
              enumerable: false,
              writable: false,
              value: source
            });
            if (Object.freeze) {
              Object.freeze(element.props);
              Object.freeze(element);
            }
          }
          return element;
        };
        function jsxDEV(type, config, maybeKey, source, self) {
          {
            var propName;
            var props = {};
            var key = null;
            var ref = null;
            if (maybeKey !== void 0) {
              {
                checkKeyStringCoercion(maybeKey);
              }
              key = "" + maybeKey;
            }
            if (hasValidKey(config)) {
              {
                checkKeyStringCoercion(config.key);
              }
              key = "" + config.key;
            }
            if (hasValidRef(config)) {
              ref = config.ref;
              warnIfStringRefCannotBeAutoConverted(config, self);
            }
            for (propName in config) {
              if (hasOwnProperty.call(config, propName) && !RESERVED_PROPS.hasOwnProperty(propName)) {
                props[propName] = config[propName];
              }
            }
            if (type && type.defaultProps) {
              var defaultProps = type.defaultProps;
              for (propName in defaultProps) {
                if (props[propName] === void 0) {
                  props[propName] = defaultProps[propName];
                }
              }
            }
            if (key || ref) {
              var displayName = typeof type === "function" ? type.displayName || type.name || "Unknown" : type;
              if (key) {
                defineKeyPropWarningGetter(props, displayName);
              }
              if (ref) {
                defineRefPropWarningGetter(props, displayName);
              }
            }
            return ReactElement(type, key, ref, self, source, ReactCurrentOwner.current, props);
          }
        }
        var ReactCurrentOwner$1 = ReactSharedInternals.ReactCurrentOwner;
        var ReactDebugCurrentFrame$1 = ReactSharedInternals.ReactDebugCurrentFrame;
        function setCurrentlyValidatingElement$1(element) {
          {
            if (element) {
              var owner = element._owner;
              var stack = describeUnknownElementTypeFrameInDEV(element.type, element._source, owner ? owner.type : null);
              ReactDebugCurrentFrame$1.setExtraStackFrame(stack);
            } else {
              ReactDebugCurrentFrame$1.setExtraStackFrame(null);
            }
          }
        }
        var propTypesMisspellWarningShown;
        {
          propTypesMisspellWarningShown = false;
        }
        function isValidElement(object) {
          {
            return typeof object === "object" && object !== null && object.$$typeof === REACT_ELEMENT_TYPE;
          }
        }
        function getDeclarationErrorAddendum() {
          {
            if (ReactCurrentOwner$1.current) {
              var name = getComponentNameFromType(ReactCurrentOwner$1.current.type);
              if (name) {
                return "\n\nCheck the render method of `" + name + "`.";
              }
            }
            return "";
          }
        }
        function getSourceInfoErrorAddendum(source) {
          {
            if (source !== void 0) {
              var fileName = source.fileName.replace(/^.*[\\\/]/, "");
              var lineNumber = source.lineNumber;
              return "\n\nCheck your code at " + fileName + ":" + lineNumber + ".";
            }
            return "";
          }
        }
        var ownerHasKeyUseWarning = {};
        function getCurrentComponentErrorInfo(parentType) {
          {
            var info = getDeclarationErrorAddendum();
            if (!info) {
              var parentName = typeof parentType === "string" ? parentType : parentType.displayName || parentType.name;
              if (parentName) {
                info = "\n\nCheck the top-level render call using <" + parentName + ">.";
              }
            }
            return info;
          }
        }
        function validateExplicitKey(element, parentType) {
          {
            if (!element._store || element._store.validated || element.key != null) {
              return;
            }
            element._store.validated = true;
            var currentComponentErrorInfo = getCurrentComponentErrorInfo(parentType);
            if (ownerHasKeyUseWarning[currentComponentErrorInfo]) {
              return;
            }
            ownerHasKeyUseWarning[currentComponentErrorInfo] = true;
            var childOwner = "";
            if (element && element._owner && element._owner !== ReactCurrentOwner$1.current) {
              childOwner = " It was passed a child from " + getComponentNameFromType(element._owner.type) + ".";
            }
            setCurrentlyValidatingElement$1(element);
            error('Each child in a list should have a unique "key" prop.%s%s See https://reactjs.org/link/warning-keys for more information.', currentComponentErrorInfo, childOwner);
            setCurrentlyValidatingElement$1(null);
          }
        }
        function validateChildKeys(node, parentType) {
          {
            if (typeof node !== "object") {
              return;
            }
            if (isArray(node)) {
              for (var i = 0; i < node.length; i++) {
                var child = node[i];
                if (isValidElement(child)) {
                  validateExplicitKey(child, parentType);
                }
              }
            } else if (isValidElement(node)) {
              if (node._store) {
                node._store.validated = true;
              }
            } else if (node) {
              var iteratorFn = getIteratorFn(node);
              if (typeof iteratorFn === "function") {
                if (iteratorFn !== node.entries) {
                  var iterator = iteratorFn.call(node);
                  var step;
                  while (!(step = iterator.next()).done) {
                    if (isValidElement(step.value)) {
                      validateExplicitKey(step.value, parentType);
                    }
                  }
                }
              }
            }
          }
        }
        function validatePropTypes(element) {
          {
            var type = element.type;
            if (type === null || type === void 0 || typeof type === "string") {
              return;
            }
            var propTypes;
            if (typeof type === "function") {
              propTypes = type.propTypes;
            } else if (typeof type === "object" && (type.$$typeof === REACT_FORWARD_REF_TYPE || // Note: Memo only checks outer props here.
            // Inner props are checked in the reconciler.
            type.$$typeof === REACT_MEMO_TYPE)) {
              propTypes = type.propTypes;
            } else {
              return;
            }
            if (propTypes) {
              var name = getComponentNameFromType(type);
              checkPropTypes(propTypes, element.props, "prop", name, element);
            } else if (type.PropTypes !== void 0 && !propTypesMisspellWarningShown) {
              propTypesMisspellWarningShown = true;
              var _name = getComponentNameFromType(type);
              error("Component %s declared `PropTypes` instead of `propTypes`. Did you misspell the property assignment?", _name || "Unknown");
            }
            if (typeof type.getDefaultProps === "function" && !type.getDefaultProps.isReactClassApproved) {
              error("getDefaultProps is only used on classic React.createClass definitions. Use a static property named `defaultProps` instead.");
            }
          }
        }
        function validateFragmentProps(fragment) {
          {
            var keys = Object.keys(fragment.props);
            for (var i = 0; i < keys.length; i++) {
              var key = keys[i];
              if (key !== "children" && key !== "key") {
                setCurrentlyValidatingElement$1(fragment);
                error("Invalid prop `%s` supplied to `React.Fragment`. React.Fragment can only have `key` and `children` props.", key);
                setCurrentlyValidatingElement$1(null);
                break;
              }
            }
            if (fragment.ref !== null) {
              setCurrentlyValidatingElement$1(fragment);
              error("Invalid attribute `ref` supplied to `React.Fragment`.");
              setCurrentlyValidatingElement$1(null);
            }
          }
        }
        var didWarnAboutKeySpread = {};
        function jsxWithValidation(type, props, key, isStaticChildren, source, self) {
          {
            var validType = isValidElementType(type);
            if (!validType) {
              var info = "";
              if (type === void 0 || typeof type === "object" && type !== null && Object.keys(type).length === 0) {
                info += " You likely forgot to export your component from the file it's defined in, or you might have mixed up default and named imports.";
              }
              var sourceInfo = getSourceInfoErrorAddendum(source);
              if (sourceInfo) {
                info += sourceInfo;
              } else {
                info += getDeclarationErrorAddendum();
              }
              var typeString;
              if (type === null) {
                typeString = "null";
              } else if (isArray(type)) {
                typeString = "array";
              } else if (type !== void 0 && type.$$typeof === REACT_ELEMENT_TYPE) {
                typeString = "<" + (getComponentNameFromType(type.type) || "Unknown") + " />";
                info = " Did you accidentally export a JSX literal instead of a component?";
              } else {
                typeString = typeof type;
              }
              error("React.jsx: type is invalid -- expected a string (for built-in components) or a class/function (for composite components) but got: %s.%s", typeString, info);
            }
            var element = jsxDEV(type, props, key, source, self);
            if (element == null) {
              return element;
            }
            if (validType) {
              var children = props.children;
              if (children !== void 0) {
                if (isStaticChildren) {
                  if (isArray(children)) {
                    for (var i = 0; i < children.length; i++) {
                      validateChildKeys(children[i], type);
                    }
                    if (Object.freeze) {
                      Object.freeze(children);
                    }
                  } else {
                    error("React.jsx: Static children should always be an array. You are likely explicitly calling React.jsxs or React.jsxDEV. Use the Babel transform instead.");
                  }
                } else {
                  validateChildKeys(children, type);
                }
              }
            }
            {
              if (hasOwnProperty.call(props, "key")) {
                var componentName = getComponentNameFromType(type);
                var keys = Object.keys(props).filter(function(k) {
                  return k !== "key";
                });
                var beforeExample = keys.length > 0 ? "{key: someKey, " + keys.join(": ..., ") + ": ...}" : "{key: someKey}";
                if (!didWarnAboutKeySpread[componentName + beforeExample]) {
                  var afterExample = keys.length > 0 ? "{" + keys.join(": ..., ") + ": ...}" : "{}";
                  error('A props object containing a "key" prop is being spread into JSX:\n  let props = %s;\n  <%s {...props} />\nReact keys must be passed directly to JSX without using spread:\n  let props = %s;\n  <%s key={someKey} {...props} />', beforeExample, componentName, afterExample, componentName);
                  didWarnAboutKeySpread[componentName + beforeExample] = true;
                }
              }
            }
            if (type === REACT_FRAGMENT_TYPE) {
              validateFragmentProps(element);
            } else {
              validatePropTypes(element);
            }
            return element;
          }
        }
        function jsxWithValidationStatic(type, props, key) {
          {
            return jsxWithValidation(type, props, key, true);
          }
        }
        function jsxWithValidationDynamic(type, props, key) {
          {
            return jsxWithValidation(type, props, key, false);
          }
        }
        var jsx2 = jsxWithValidationDynamic;
        var jsxs = jsxWithValidationStatic;
        exports2.Fragment = REACT_FRAGMENT_TYPE;
        exports2.jsx = jsx2;
        exports2.jsxs = jsxs;
      })();
    }
  }
});

// node_modules/react/jsx-runtime.js
var require_jsx_runtime = __commonJS({
  "node_modules/react/jsx-runtime.js"(exports2, module2) {
    "use strict";
    if (process.env.NODE_ENV === "production") {
      module2.exports = require_react_jsx_runtime_production_min();
    } else {
      module2.exports = require_react_jsx_runtime_development();
    }
  }
});

// scripts/stressTestHarness.ts
var stressTestHarness_exports = {};
__export(stressTestHarness_exports, {
  SCENARIOS: () => SCENARIOS,
  runFullStressTestAudit: () => runFullStressTestAudit
});
module.exports = __toCommonJS(stressTestHarness_exports);

// src/context/LanguageContext.tsx
var import_react = __toESM(require_react(), 1);

// src/locales/en.ts
var en = {
  // ── Core Keys (Requested Dictionary Anchors) ──
  hardRollout: "Hard rollout",
  routeLength: "Route distance",
  pureRolling: "Moving time",
  checklistTitle: "Readiness checklist",
  nutritionTitle: "Nutrition & recovery protocol",
  // ── Brand & Header Navigation ──
  appName: "Bike Trip Engine",
  headerTagline: "Aero physics \xB7 Reverse timeline \xB7 Fueling",
  navPrimaryViewsAria: "Primary views",
  navMobileViewsAria: "Mobile views",
  navHome: "Home",
  navConfigurator: "Configurator",
  navConfigShort: "Config",
  navFlightDeck: "Flight Deck",
  activeTripAria: "Active trip profile",
  specsButton: "Specs",
  specsButtonTitle: "Configure rider & bike specs",
  printButtonTitle: "Print A4 flight sheet",
  switchToLight: "Switch to light mode",
  switchToDark: "Switch to dark mode",
  switchLanguageAria: "Switch language",
  newTripButton: "New trip",
  menuOpen: "Menu",
  menuClose: "Close",
  menuOpenAria: "Open menu",
  menuCloseAria: "Close menu",
  savedCountBadge: "{count} saved",
  drawerSpecsTitle: "Rider & bike specs",
  drawerSpecsSub: "CdA, Crr & mass baseline",
  drawerPrintTitle: "Print flight sheet",
  drawerPrintSub: "Export A4 summary",
  // ── Alerts & System Prompts ──
  minOneProfileAlert: "At least one trip profile must be preserved in the system.",
  resetDefaultsConfirm: "Reset all profiles to factory engineering defaults? Any custom edits will be re-initialized.",
  newTripDefaultName: "Custom Commute Mission #{num}",
  newTripDefaultDesc: "Custom commute profile calibrated to rider physiology and bike aerodynamics.",
  copySuffix: "(Copy)",
  duplicateTag: "DUPLICATE",
  // ── Home Screen ──
  homeTitle: "Mission hub & saved trips",
  homeProfilesCount: "{count} profiles",
  homeSubtitle: "Aerodynamic power modeling, reverse timeline scheduling, and real-food fueling across commute, sport, and touring profiles.",
  resetDefaultsBtn: "Reset defaults",
  resetDefaultsTitle: "Reset to default sample profiles",
  createNewTripBtn: "Create new trip",
  savedProfilesHeading: "Saved trip profiles",
  savedProfilesHint: "Select a profile to open its Flight Deck",
  localStorageNotice: "Local browser storage active \u2014 profiles, checklists, and rider specs stay 100% on your device.",
  syncedAt: "Synced {time}",
  // ── Trip Card ──
  activeBadge: "Active",
  duplicateTripTitle: "Duplicate trip",
  editParamsTitle: "Edit parameters",
  deleteProfileTitle: "Delete profile",
  arrivalTimeLabel: "Arrival {time}",
  readinessProgressTitle: "Readiness: {checked}/{total}",
  readyCountLabel: "{checked}/{total} ready",
  rigMassPill: "{mass} kg rig",
  windSpeedPill: "{speed} km/h wind",
  calmWind: "Calm",
  openFlightDeckBtn: "Open Flight Deck",
  setActiveBtn: "Set active",
  // ── Weather Widget (Home) ──
  weatherCheckTitle: "Corridor weather check",
  weatherCheckSubtitle: "Live atmospheric telemetry and aerodynamic GO / NO-GO evaluation",
  statusNoGoGale: "No-Go \xB7 Gale hazard",
  statusCautionHeadwind: "Caution \xB7 Headwind active",
  statusGoOptimal: "Go \xB7 Optimal conditions",
  headwindSpeedToggle: "{speed} km/h headwind",
  calmModeToggle: "Calm mode",
  estuaryVectorLabel: "Estuary vector",
  opposingHeadwindSub: "Opposing headwind (245\xB0 WSW)",
  negligibleDragSub: "Negligible aero drag",
  airTempDensityLabel: "Air temp & density",
  standardMorningDensitySub: "Standard morning air density",
  bridgeGustsLabel: "Bridge gusts",
  maxUnit: "km/h max",
  lateralHandlingSafeSub: "Lateral handling safe",
  precipitationLabel: "Precipitation",
  riskUnit: "risk",
  nominalCrrSub: "Nominal Crr 0.006 tarmac",
  windSpeedSliderLabel: "Wind speed",
  windSimulationAria: "Wind speed simulation",
  cruisingPaceLabel: "Cruising pace:",
  aeroDragFactoredPill: "+22W aero drag factored",
  baselineDragPill: "Baseline drag profile",
  // ── Bento Dashboard ──
  defaultTripName: "Commute Route",
  defaultTripDesc: "Calibrated aerodynamic power, reverse rollout schedule, and fueling plan",
  heroBadgeSport: "Gran Fondo pacing",
  heroBadgeBikepacking: "Self-supported",
  heroBadgeEscapade: "Scenic touring",
  heroBadgeCommute: "Zero-delay commute",
  heroTargetEscapade: "Destination: {dest}",
  heroTargetSport: "Finish: {dest} @ {time}",
  heroTargetBikepacking: "Bivouac: {dest} @ {time}",
  heroTargetLabelEscapade: "Check-in target",
  heroTargetLabelSport: "Stage finish",
  heroTargetLabelBikepacking: "Camp cutoff",
  heroTargetLabelCommute: "Shift start",
  legOutput: "Leg output",
  elevationGain: "Elevation gain",
  maxGradient: "Max {pct}%",
  bufferPlus: "+{min}m buffer",
  energyBurn: "Energy burn",
  minShort: "min",
  // ── Reverse Timeline Bento & Contextual Banner ──
  timelineTitleSport: "Sport pacing & stage timeline",
  timelineTitleBikepacking: "Expedition staging timeline",
  timelineTitleEscapade: "Touring & check-in schedule",
  timelineTitleCommute: "Reverse commute timeline",
  timelineSubSport: "Countdown from stage finish across fueling, warmup, and pacing windows",
  timelineSubBikepacking: "Working backwards from pre-dusk camp setup to morning rig staging",
  timelineSubEscapade: "Working backwards from hotel reception check-in and luggage drop",
  timelineSubCommute: "Working backwards from shift lock through shower, locker refuel, and gate",
  rolloutBadgeTime: "Rollout {time}",
  rolloutPill: "Rollout",
  checkpointPill: "Checkpoint",
  bannerHide: "Hide",
  bannerDetails: "Details",
  bannerHeadwindPill: "Headwind +{min}m ({speed} km/h)",
  bannerColdPill: "Cold ambient {temp}\xB0C",
  bannerRainPill: "Rain risk {risk}%",
  // Contextual Banner: Sport
  ctxSportTitle: "Pacing & in-flight fueling directive",
  ctxSportSummary: "60\u201390g carbs/hr target \xB7 ~{speed} km/h cruising pace",
  ctxSportAdvice: "Pre-load 500ml electrolyte mix at T-60m. Target 60\u201390g fast-acting carbohydrates per hour in-flight to sustain muscular glycogen, with a progressive 15-minute warmup upon rollout.",
  ctxSportNoteWind: "Headwind active ({speed} km/h, +{min}m penalty) \u2014 tuck low on exposed straights to reduce aerodynamic CdA drag.",
  ctxSportNoteCalm: "Favorable corridor conditions. Hold steady cadence to arrive on-target at {dest} without energy debt.",
  ctxSportMetric1Label: "Pacing target",
  ctxSportMetric1Sub: "Zone 2/3 base",
  ctxSportMetric2Label: "Carb intake",
  ctxSportMetric2Sub: "In-flight fuel",
  ctxSportMetric3Label: "Active rolling",
  ctxSportMetric3Sub: "{dist} km stage",
  ctxSportMetric4Label: "Recovery window",
  ctxSportMetric4Val: "25g protein",
  ctxSportMetric4Sub: "Within 30m",
  // Contextual Banner: Bikepacking
  ctxBpTitle: "Expedition rig balance & resupply",
  ctxBpSummary: "~{gear} kg cargo payload \xB7 Pre-dusk arrival target",
  ctxBpBadge: "Self-supported",
  ctxBpAdvice: "Verify handlebar roll clearance and balance central frame pack weight. Carry 2.0L minimum hydration capacity and stage arrival before dusk for camp pitch.",
  ctxBpNoteWind: "Headwind ({speed} km/h) against loaded bags increases aero drag. Pace steadily to protect legs on climbs.",
  ctxBpNoteCalm: "Payload set to ~{gear} kg ({rig} kg rig). Plan trail water resupply points en route to {dest}.",
  ctxBpMetric1Label: "Daily haul",
  ctxBpMetric1Sub: "Stage length",
  ctxBpMetric2Label: "Cargo payload",
  ctxBpMetric2Sub: "{rig} kg total rig",
  ctxBpMetric3Label: "Trail rolling",
  ctxBpMetric3Sub: "Loaded moving",
  ctxBpMetric4Label: "Camp cutoff",
  ctxBpMetric4Sub: "Pre-dusk pitch",
  // Contextual Banner: Escapade
  ctxEscTitle: "Reception check-in & bike storage",
  ctxEscSummary: "Staged for {time} arrival \xB7 +{min}m scenic cushion",
  ctxEscBadge: "+{min}m buffer",
  ctxEscAdvice: "Arrival staged ahead of reception check-in at {time}. Secure indoor bike storage and complete bag drop before evening recovery.",
  ctxEscNote: "Includes a +{min}m scenic cushion for coffee stops and relaxed cadence toward {dest}.",
  ctxEscMetric1Label: "Stage length",
  ctxEscMetric1Sub: "Touring route",
  ctxEscMetric2Label: "Check-in target",
  ctxEscMetric3Label: "Cruising time",
  ctxEscMetric4Label: "Scenic buffer",
  ctxEscMetric4Sub: "Zero-stress pace",
  // Contextual Banner: Commute
  ctxComTitle: "Office protocol & locker refuel",
  ctxComSummary: "Zero desk food \xB7 Locker refuel at {gateTime} before {shiftTime} shift",
  ctxComBadge: "Zero delay",
  ctxComAdvice: "Zero food permitted at open-space desks. Complete Phase 1 Skyr refuel at {gateTime} in the locker bay, followed by shower and break-room oats before {shiftTime}.",
  ctxComNoteWind: "Bridge headwind active ({speed} km/h, +{min}m penalty) \u2014 {depTime} rollout guarantees on-time badge-in at {gate}.",
  ctxComNoteCalm: "Badge credentials required at {gate}. Traffic and turnstile buffer (+{min}m) calibrated for door-to-desk precision.",
  ctxComMetric1Label: "Gate arrival",
  ctxComMetric2Label: "Transit buffer",
  ctxComMetric2Sub: "Traffic reserve",
  ctxComMetric3Label: "Door-to-desk",
  ctxComMetric3Sub: "Total transit",
  ctxComMetric4Label: "Shift lock",
  ctxComMetric4Sub: "Desk presence",
  // ── Physics Engine Card ──
  physicsCardTitle: "Aerodynamic & rolling physics",
  physicsCardSub: "Mechanical power decomposition across drag, tires, and drivetrain",
  aeroDragPill: "Aero drag",
  wattsUnit: "watts",
  tireRollingPill: "Tire rolling",
  drivetrainPill: "Drivetrain",
  effShort: "{pct}% eff.",
  wattsLossUnit: "watts loss",
  chainFrictionLoss: "{pct}% chain friction loss",
  systemMassHeading: "System mass",
  totalKgBadge: "{mass} kg total",
  riderMassRow: "Rider mass",
  bicycleBuildRow: "Bicycle build",
  gearPayloadRow: "Gear & payload",
  energySubstrateHeading: "Energy substrate",
  grossEffBadge: "{pct}% gross eff.",
  mechanicalWorkRow: "Mechanical work",
  metabolicBurnRow: "Metabolic burn",
  glycogenDemandRow: "Glycogen demand",
  // Physics Go Status Reasons
  goReasonGale: "Severe estuary gale ({wind} km/h). Cross-bridge gust hazard.",
  goReasonHeadwind: "Stiff headwind ({wind} km/h). +{watts}W aerodynamic surcharge on exposed segments.",
  goReasonPower: "Sustained power demand ({watts}W) exceeds typical endurance tempo.",
  goReasonBreeze: "Manageable breeze ({wind} km/h). All telemetry within nominal commuting envelope.",
  goReasonCalm: "Calm conditions. Pure rolling resistance pacing.",
  // ── Atmosphere Card ──
  atmosphereTitle: "Atmosphere & wind vector",
  badgeManual: "Manual",
  badgeBaseline: "Baseline",
  badgeLive: "Live",
  subSimulatedOverride: "Simulated override",
  subSeasonalModel: "Seasonal model",
  subOpenMeteoSync: "Open-Meteo sync",
  syncForecastTitle: "Fetch forecast / reset to planned data",
  syncingBtn: "Syncing",
  syncBtn: "Sync",
  clearanceGo: "Clearance: Go \xB7 Optimal aerodynamics",
  clearanceCaution: "Caution \xB7 Elevated aero drag",
  clearanceNoGo: "No-Go \xB7 Severe gale warning",
  compassWest: "W",
  corridorWindVector: "Corridor wind vector",
  wswEstuary: "WSW estuary",
  corridorDir: "corridor",
  dragBufferPill: "+{watts}W drag \xB7 +{min}m buffer",
  zeroPenaltyPill: "0W penalty \xB7 pure rolling pace",
  maxGustEnvelope: "Max gust envelope",
  peakUnit: "peak",
  windSimulationLabel: "Wind simulation",
  manualWindSimAria: "Manual wind simulation speed",
  presetCalm: "Calm (0)",
  presetModerate: "Moderate (15)",
  presetGale: "Gale (35+)",
  // ── Readiness Checklist Card ──
  checklistSub: "{done} of {total} cleared \xB7 {tag}",
  resetBtn: "Reset",
  resetChecklistTitle: "Reset checklist",
  readyStatus: "Ready",
  pendingCountStatus: "{count} pending",
  requiredBadge: "Required",
  checklistFooterHint: "Click any item to toggle pre-flight clearance",
  // ── Route Map Banner ──
  routeCorridorTitle: "Route corridor",
  distanceTraceSub: "{dist} km trace",
  activeTrackBadge: "Active track",
  scrollLockBadge: "Scroll-lock active",
  // ── Nutrition Bento ──
  nutriSportTitle: "Endurance fueling & recovery",
  nutriSportSub: "High-intensity glycogen pacing across {dist} km",
  nutriSportBadge: "70\u201390g carbs/hr \xB7 {kcal} kcal",
  nutriSport1Title: "Pre-race loading",
  nutriSport1Body: "Low-residue high-carb meal (white rice or toast with honey). Double espresso 45m prior for CNS readiness, plus 500ml sodium electrolyte mix.",
  nutriSport2Title: "In-flight glycogen",
  nutriSport2Body: "Isotonic carb mix in bottles (maltodextrin/fructose 2:1). Take fast gels or chews every 30 minutes to sustain high power output without gastric distress.",
  nutriSport3Title: "Post-ride recovery",
  nutriSport3Badge: "Within 30m",
  nutriSport3Body: "3:1 carb-to-protein recovery shake or whole-food meal within 30 minutes of finishing for rapid glycogen resynthesis and muscle repair.",
  nutriBpTitle: "Self-supported expedition fueling",
  nutriBpSub: "Sustained multi-day caloric balance across {dist} km",
  nutriBpBadge: "~{kcal} kcal stage burn",
  nutriBp1Title: "Dense breakfast staging",
  nutriBp1Body: "Heavy baseline intake: oats with nuts, eggs, bread, and coffee. Fill hydration reservoirs with electrolytes before breaking camp.",
  nutriBp2Title: "Steady all-day grazing",
  nutriBp2Body: "Eat small portions every 25 minutes (nuts, dried fruit, bars, bakery stops) so energy reserves never drop into deficit.",
  nutriBp3Title: "Camp restoration",
  nutriBp3Body: "High-protein, high-carb hot evening meal plus full electrolyte rehydration ahead of tomorrow's stage.",
  nutriEscTitle: "Whole-food touring nutrition",
  nutriEscSub: "Relaxed endurance fueling en route to {dest}",
  nutriEscBadge: "~{kcal} kcal burn",
  nutriEsc1Title: "Pre-rollout ignition",
  nutriEsc1Body: "Toasted sourdough with honey or jam, espresso, and 400ml water with a pinch of sea salt 45 minutes prior.",
  nutriEsc2Title: "On-bike cruising (~45g/hr)",
  nutriEsc2Body: "Sip electrolytes steadily and snack on dried figs, Medjool dates, or fruit paste every 15 km.",
  nutriEsc3Title: "Check-in & evening dining",
  nutriEsc3Body: "500ml hydration reload upon hotel arrival, followed by balanced regional dinner recovery.",
  nutriComTitle: "Real-food commute nutrition",
  nutriComSub: "Whole-food glycogen fueling aligned with locker and shift rules",
  nutriComBadge: "Est. {kcal} kcal",
  nutriCom1Title: "Pre-ride ignition",
  nutriCom1Body: "White baguette with wildflower honey, double espresso, and 300ml water with sea salt.",
  nutriCom2Title: "Pocket fuel",
  nutriCom2Badge: "En route",
  nutriCom2Body: "50/50 diluted grape juice bidon, 2 Medjool dates, and 2 artisanal fruit pastes.",
  nutriCom3Title: "Locker refuel",
  nutriCom3Badge: "Arrival",
  nutriCom3Body: "200g Skyr 0% tub + 250ml pure grape juice consumed in locker bay prior to shower.",
  nutriCom4Title: "Break-room meal",
  nutriCom4Badge: "Pre-shift",
  nutriCom4Body: "Overnight oats with chia & oat milk, crisp Granny Smith apple, and coffee before desk lock.",
  // ── Configurator Screen ──
  backToFlightDeck: "Back to Flight Deck",
  createNewProfileHeading: "Create new trip profile",
  liveCalculationBadge: "Live calculation",
  savedBtn: "Saved",
  saveProfileBtn: "Save profile",
  saveAndOpenBtn: "Save & open Flight Deck",
  archetypeHeading: "Mission archetype & identity",
  archetypeSub: "Select trip mode to calibrate checklists, timing buffers, and fueling protocols",
  modeBadge: "Mode: {tag}",
  archBikepackingLabel: "Bikepacking",
  archBikepackingDesc: "Multi-day self-supported",
  archSportLabel: "Sport / Fondo",
  archSportDesc: "High-intensity pacing",
  archCommuteLabel: "Commute",
  archCommuteDesc: "Work shift & locker sync",
  archEscapadeLabel: "Escapade",
  archEscapadeDesc: "Hotel check-in & touring",
  tripNameLabel: "Trip name",
  tripNamePlaceholder: "Morning Estuary Commute",
  classificationTagLabel: "Classification tag",
  operationalSummaryLabel: "Operational summary",
  operationalSummaryPlaceholder: "Short route summary...",
  corridorGeneratorHeading: "Route corridor generator",
  corridorGeneratorSub: "OSRM cycling route and distance calculation",
  originCityLabel: "Origin city",
  destinationLabel: "Destination",
  locationSearchPlaceholder: "Search city, street or station...",
  autocompleteSearching: "Searching locations...",
  autocompleteNoResults: "No locations found",
  autocompleteClear: "Clear",
  autocompletePopularHubs: "Suggested hubs",
  swapCorridorBtn: "Swap origin & destination",
  locationVerifiedTooltip: "Coordinates resolved & verified",
  fetchRouteBtn: "Fetch",
  routeUpdatedMsg: "Route updated: {dist} km cycling trace loaded",
  routeErrorDefault: "Error calculating bike route.",
  activeCorridorMsg: "Active corridor: {origin} \u2192 {dest} ({dist} km)",
  scheduleWeatherHeading: "Schedule & weather sync",
  scheduleWeatherSub: "Align hourly atmospheric vectors with planned rollout date",
  horizonBaseline: "Baseline ({offset})",
  horizonLiveToday: "Live today",
  horizonPlanned: "Planned ({offset})",
  departureDateLabel: "Departure date",
  rolloutTimeLabel: "Rollout time",
  syncWeatherBtn: "Sync weather",
  weatherBaselineApplied: "Seasonal baseline applied ({offset} > 14d forecast window)",
  weatherSyncedMsg: "Synced Open-Meteo forecast for {date} \xB7 {time}",
  weatherSyncUnavailable: "Weather sync unavailable \u2014 check network connection.",
  currentConditionsSummary: "Current conditions: {temp}\xB0C \xB7 Wind {wind} km/h \xB7 \u03C1 {rho} kg/m\xB3",
  liveTelemetryHeading: "Live telemetry",
  calculatedHardRollout: "Calculated hard rollout",
  targetTimeLabel: "Target {time}",
  movingPlusBuffer: "Moving {moving} + {buffer}m buffer",
  requiredLegOutput: "Required leg output",
  aeroDragRow: "Aero drag (CdA {cda})",
  rollingRow: "Rolling (Crr {crr})",
  drivetrainLossRow: "Drivetrain loss",
  headwindSurchargeRow: "Headwind surcharge",
  metabolicExpenditureHeading: "Metabolic expenditure",
  caloricBurnRow: "Caloric burn",
  carbOxidationRow: "Carb oxidation",
  protocolSport: "Sport pacing protocol",
  protocolBikepacking: "Self-supported autonomy",
  protocolEscapade: "Reception check-in sync",
  protocolDeskFoodBan: "Desk food ban: {state}",
  enforcedState: "Enforced",
  advisoryState: "Advisory",
  targetWithBuffer: "Target {time} \xB7 +{buffer}m buffer",
  // ── Natural Language Prompt ──
  nlpHeading: "Natural-language mission setup",
  nlpSub: "Describe your route, arrival time, cruising speed, and gear mass to populate all fields automatically",
  nlpAppliedBadge: "Applied",
  nlpTemplatesLabel: "Templates:",
  nlpPlaceholder: "e.g. Escapade to Clisson hotel on Dec 15, check-in 3PM, leaving 10h30, 6.5kg gear at 24 km/h...",
  nlpParseApplyBtn: "Parse & apply",
  nlpHint: "Parses shifts, hotel check-ins, cruising speed, dates, and cargo mass automatically (EN & FR).",
  nlpPresetCommuteLabel: "Commute protocol",
  nlpPresetCommuteText: "22km gravel commute along estuary bridge to Gate 17, arriving at 08:30 for a 09:00 shift. Rider 74kg, bike 9.4kg, gear 4kg, cruising at 27.5 km/h with 8 km/h headwind. Strict office rule: no food in open space.",
  nlpPresetEscapadeLabel: "Hotel escapade",
  nlpPresetEscapadeText: "Escapade from Nantes to Clisson hotel on December 15, 2026. Check-in is at 3PM, leaving at 10h30. Carrying 6.5kg of gear. Cruising speed around 24 km/h, 45km route.",
  nlpPresetBikepackingLabel: "Bikepacking tour",
  nlpPresetBikepackingText: "Bikepacking adventure on October 28th. Rollout at 07:00, 85km distance, 12kg luggage, bike 11.5kg, rider 72kg, pace 21 km/h.",
  nlpPresetSportLabel: "Sport Gran Fondo",
  nlpPresetSportText: "Sport Gran Fondo training tomorrow. Zero bags, 110km, target speed 33 km/h, setting off at 6:30.",
  nlpFeedbackRollout: "Rollout {time}",
  nlpFeedbackArrival: "Arrival {time}",
  nlpFeedbackGear: "{mass} kg gear",
  nlpFeedbackRider: "{mass} kg rider",
  nlpFeedbackBike: "{mass} kg bike",
  nlpFeedbackDeskBan: "Desk food ban",
  nlpFeedbackRavito: "Fueling: {info}",
  nlpFeedbackPuncture: "Puncture prep: {info}",
  // ── Parameter Tabs ──
  tabPhysics: "Physics & mass",
  tabRoute: "Route & pace",
  tabOffice: "Schedule & gate",
  tabWeather: "Wind & weather",
  totalSystemMassTitle: "Total system mass",
  systemMassFormula: "Rider {rider} kg + Bike {bike} kg + Gear {gear} kg",
  riderMassInputLabel: "Rider mass (kg)",
  bikeMassInputLabel: "Bike mass (kg)",
  gearMassInputLabel: "Gear & pack mass (kg)",
  aeroMechConstantsHeading: "Aerodynamic & mechanical constants",
  dragAreaLabel: "Drag area CdA (m\xB2)",
  dragAreaHint: "0.40 m\xB2 hoods tuck",
  rollingResLabel: "Rolling resistance Crr",
  rollingResHint: "0.006 gravel on tarmac",
  drivetrainEffLabel: "Drivetrain efficiency",
  drivetrainEffHint: "0.95 clean chain",
  muscularEffLabel: "Muscular efficiency",
  muscularEffHint: "0.21 human gross eff.",
  routeDistInputLabel: "Route distance (km)",
  targetCruisingSpeedLabel: "Target cruising speed (km/h)",
  trafficBufferLabel: "Traffic & intersection buffer (min)",
  trafficBufferHint: "Accounts for urban crossings and bridge approach",
  gateBufferLabel: "Gate & bike lock buffer (min)",
  gateBufferHint: "Badge scan and secure bike bay staging",
  openSpaceRestrictionTitle: "Open-space food restriction",
  openSpaceRestrictionDesc: "Schedules locker refuel and break-room breakfast prior to shift lock.",
  shiftStartInputLabel: "Shift start / cutoff",
  targetArrivalInputLabel: "Target arrival time",
  checkpointGateLabel: "Checkpoint / gate name",
  lockerRefuelInputLabel: "Locker refuel (min)",
  showerChangeInputLabel: "Shower & change (min)",
  breakRoomMealInputLabel: "Break-room meal (min)",
  opposingHeadwindTitle: "Opposing headwind",
  headwindActiveBtn: "Active",
  headwindCalmBtn: "Calm",
  opposingHeadwindDesc: "Models opposing wind vector along exposed estuary segments.",
  baseWindSpeedLabel: "Base wind speed (km/h)",
  ambientTempLabel: "Ambient temperature (\xB0C)",
  precipRiskLabel: "Precipitation risk (%)",
  // ── Rider & Bike Specs Modal ──
  specsModalTitle: "Rider & bike specifications",
  specsModalSub: "Physical baseline applied automatically to newly created trips",
  closeModalAria: "Close modal",
  riderPhysiologyHeading: "Rider physiology",
  weightLabel: "Weight",
  heightLabel: "Height",
  ftpBaselineLabel: "FTP baseline",
  activeBikeBuildHeading: "Active bicycle build",
  modelNameLabel: "Model name",
  tireCrrLabel: "Tire Crr",
  tireCrrHint: "0.0055 gravel",
  aeroCdaLabel: "Aero CdA",
  aeroCdaHint: "0.38 m\xB2 hoods",
  savedLocallyNotice: "Saved locally in browser",
  cancelBtn: "Cancel",
  saveSpecsBtn: "Save specs",
  // ── Print Flight Sheet ──
  printHeaderTagline: "BIKE TRIP ENGINE \xB7 OPERATIONAL FLIGHT SHEET (A4)",
  printClassification: "Classification:",
  printDestination: "Destination:",
  printShiftLock: "Shift Lock:",
  printDecision: "DECISION: {status}",
  printGenerated: "Generated:",
  printSection1: "1. PHYSICAL TELEMETRY & RESISTIVE PARAMETERS",
  printSystemMass: "SYSTEM MASS",
  printSystemMassBreak: "Rider {rider} + Bike {bike} + Gear {gear}",
  printTargetPower: "TARGET POWER",
  printWheelPower: "@{speed} km/h (Wheel: {wheel}W)",
  printAeroRolling: "AERO / ROLLING",
  printRhoEff: "Rho 1.225 kg/m\xB3 \xB7 Eff 95%",
  printMetabolicWork: "METABOLIC WORK",
  printCarbOx: "Carb Ox: {carbs} g/hr",
  printSection2: "2. REVERSE TIMELINE SCHEDULE (STRICT OFFICE CONSTRAINTS)",
  printZeroFoodMandate: "ZERO FOOD IN OPEN-SPACE MANDATE",
  printColTime: "TIME",
  printColCheckpoint: "CHECKPOINT",
  printColLocation: "LOCATION",
  printColDirective: "OPERATIONAL DIRECTIVE",
  printColCheck: "CHECK",
  printSection3: "3. REAL-FOOD NUTRITION MANIFEST (NO POWDERS / NO MILK / NO BANANAS)",
  printSection4: "4. PRE-FLIGHT VERIFICATION & INSPECTION SIGN-OFF",
  printAuthorization: "Rider Flight Deck Authorization: _________________________",
  printAllVerified: "All telemetry, tire pressure, and office rations verified.",
  printClearanceId: "Security Clearance ID:"
};

// src/locales/fr.ts
var fr = {
  // ── Core Keys (Requested Dictionary Anchors) ──
  hardRollout: "D\xE9part imp\xE9ratif",
  routeLength: "Distance",
  pureRolling: "Temps de roulement",
  checklistTitle: "Inspection du mat\xE9riel & rig",
  nutritionTitle: "Protocole de nutrition & r\xE9cup\xE9ration",
  // ── Brand & Header Navigation ──
  appName: "Bike Trip Engine",
  headerTagline: "Physique a\xE9ro \xB7 R\xE9tro-planning \xB7 Ravito",
  navPrimaryViewsAria: "Vues principales",
  navMobileViewsAria: "Vues mobiles",
  navHome: "Accueil",
  navConfigurator: "Configurateur",
  navConfigShort: "Config",
  navFlightDeck: "Cockpit",
  activeTripAria: "Profil de trajet actif",
  specsButton: "Specs",
  specsButtonTitle: "Configurer le profil cycliste & v\xE9lo",
  printButtonTitle: "Imprimer la feuille de route A4",
  switchToLight: "Passer en mode clair",
  switchToDark: "Passer en mode sombre",
  switchLanguageAria: "Changer la langue",
  newTripButton: "Nouveau trajet",
  menuOpen: "Menu",
  menuClose: "Fermer",
  menuOpenAria: "Ouvrir le menu",
  menuCloseAria: "Fermer le menu",
  savedCountBadge: "{count} enregistr\xE9s",
  drawerSpecsTitle: "Profil cycliste & v\xE9lo",
  drawerSpecsSub: "CdA, Crr & masse de r\xE9f\xE9rence",
  drawerPrintTitle: "Imprimer la feuille de route",
  drawerPrintSub: "Exporter la synth\xE8se A4",
  // ── Alerts & System Prompts ──
  minOneProfileAlert: "Au moins un profil de trajet doit \xEAtre conserv\xE9 dans le syst\xE8me.",
  resetDefaultsConfirm: "R\xE9initialiser tous les profils aux r\xE9glages d'origine ? Vos modifications personnalis\xE9es seront remplac\xE9es.",
  newTripDefaultName: "Mission V\xE9lotaf sur mesure #{num}",
  newTripDefaultDesc: "Profil v\xE9lotaf personnalis\xE9 calibr\xE9 sur la physiologie du cycliste et l'a\xE9rodynamisme du v\xE9lo.",
  copySuffix: "(Copie)",
  duplicateTag: "COPIE",
  // ── Home Screen ──
  homeTitle: "Hub des missions & trajets",
  homeProfilesCount: "{count} profils",
  homeSubtitle: "Mod\xE9lisation a\xE9rodynamique des watts, r\xE9tro-planning horaire et ravitaillement naturel pour v\xE9lotaf, sport et escapades.",
  resetDefaultsBtn: "R\xE9initialiser",
  resetDefaultsTitle: "Restaurer les profils d'exemple par d\xE9faut",
  createNewTripBtn: "Cr\xE9er un trajet",
  savedProfilesHeading: "Profils de trajets enregistr\xE9s",
  savedProfilesHint: "S\xE9lectionnez un profil pour ouvrir son Cockpit",
  localStorageNotice: "Stockage local actif \u2014 vos profils, checklists et r\xE9glages v\xE9lo restent 100 % sur votre appareil.",
  syncedAt: "Synchronis\xE9 \xE0 {time}",
  // ── Trip Card ──
  activeBadge: "Actif",
  duplicateTripTitle: "Dupliquer le trajet",
  editParamsTitle: "Modifier les param\xE8tres",
  deleteProfileTitle: "Supprimer le profil",
  arrivalTimeLabel: "Arriv\xE9e {time}",
  readinessProgressTitle: "Pr\xE9paration : {checked}/{total}",
  readyCountLabel: "{checked}/{total} pr\xEAts",
  rigMassPill: "{mass} kg total",
  windSpeedPill: "Vent {speed} km/h",
  calmWind: "Calme",
  openFlightDeckBtn: "Ouvrir le Cockpit",
  setActiveBtn: "Activer",
  // ── Weather Widget (Home) ──
  weatherCheckTitle: "M\xE9t\xE9o du parcours",
  weatherCheckSubtitle: "T\xE9l\xE9m\xE9trie atmosph\xE9rique en direct et \xE9valuation a\xE9rodynamique GO / NO-GO",
  statusNoGoGale: "No-Go \xB7 Risque de temp\xEAte",
  statusCautionHeadwind: "Prudence \xB7 Vent de face actif",
  statusGoOptimal: "Go \xB7 Conditions optimales",
  headwindSpeedToggle: "Vent de face {speed} km/h",
  calmModeToggle: "Mode calme",
  estuaryVectorLabel: "Vecteur estuaire",
  opposingHeadwindSub: "Vent de face contraire (245\xB0 OSO)",
  negligibleDragSub: "Tra\xEEn\xE9e a\xE9ro n\xE9gligeable",
  airTempDensityLabel: "Temp. & densit\xE9 de l'air",
  standardMorningDensitySub: "Densit\xE9 matinale standard",
  bridgeGustsLabel: "Rafales sur le pont",
  maxUnit: "km/h max",
  lateralHandlingSafeSub: "Tenue lat\xE9rale s\xFBre",
  precipitationLabel: "Pr\xE9cipitations",
  riskUnit: "risque",
  nominalCrrSub: "Crr nominal 0.006 bitume",
  windSpeedSliderLabel: "Vitesse du vent",
  windSimulationAria: "Simulation de vitesse du vent",
  cruisingPaceLabel: "Allure cible :",
  aeroDragFactoredPill: "+22W de tra\xEEn\xE9e a\xE9ro int\xE9gr\xE9s",
  baselineDragPill: "Profil de tra\xEEn\xE9e nominal",
  // ── Bento Dashboard ──
  defaultTripName: "Trajet V\xE9lotaf",
  defaultTripDesc: "Puissance a\xE9rodynamique calibr\xE9e, r\xE9tro-planning de d\xE9part et plan de ravito",
  heroBadgeSport: "Allure Gran Fondo",
  heroBadgeBikepacking: "Autonomie compl\xE8te",
  heroBadgeEscapade: "Cyclotourisme",
  heroBadgeCommute: "V\xE9lotaf z\xE9ro retard",
  heroTargetEscapade: "Destination : {dest}",
  heroTargetSport: "Arriv\xE9e : {dest} @ {time}",
  heroTargetBikepacking: "Bivouac : {dest} @ {time}",
  heroTargetLabelEscapade: "Objectif check-in",
  heroTargetLabelSport: "Fin d'\xE9tape",
  heroTargetLabelBikepacking: "Limite bivouac",
  heroTargetLabelCommute: "Prise de poste",
  legOutput: "Puissance jambes",
  elevationGain: "D\xE9nivel\xE9 D+",
  maxGradient: "Pente max {pct}%",
  bufferPlus: "+{min}m marge",
  energyBurn: "D\xE9pense \xE9nerg\xE9tique",
  minShort: "min",
  // ── Reverse Timeline Bento & Contextual Banner ──
  timelineTitleSport: "Allure sport & chronologie d'\xE9tape",
  timelineTitleBikepacking: "Chronologie d'exp\xE9dition & bivouac",
  timelineTitleEscapade: "Programme cyclo & check-in h\xF4tel",
  timelineTitleCommute: "R\xE9tro-planning v\xE9lotaf",
  timelineSubSport: "Compte \xE0 rebours depuis l'arriv\xE9e incluant ravito, \xE9chauffement et fen\xEAtres d'allure",
  timelineSubBikepacking: "R\xE9tro-planning depuis l'installation du bivouac avant la nuit jusqu'au d\xE9part matinal",
  timelineSubEscapade: "R\xE9tro-planning cal\xE9 sur l'heure de check-in \xE0 la r\xE9ception et le d\xE9p\xF4t des sacoches",
  timelineSubCommute: "R\xE9tro-planning depuis la prise de poste via douche, ravito vestiaire et portillon",
  rolloutBadgeTime: "D\xE9part {time}",
  rolloutPill: "D\xE9part",
  checkpointPill: "Point cl\xE9",
  bannerHide: "Masquer",
  bannerDetails: "D\xE9tails",
  bannerHeadwindPill: "Vent de face +{min}m ({speed} km/h)",
  bannerColdPill: "Froid ambiant {temp}\xB0C",
  bannerRainPill: "Risque pluie {risk}%",
  // Contextual Banner: Sport
  ctxSportTitle: "Directive d'allure & ravito en selle",
  ctxSportSummary: "Cible 60\u201390g glucides/h \xB7 Allure ~{speed} km/h",
  ctxSportAdvice: "Pr\xE9-chargez 500 ml d'\xE9lectrolytes \xE0 T-60 min. Visez 60 \xE0 90 g de glucides rapides par heure sur le v\xE9lo pour pr\xE9server le glycog\xE8ne musculaire, avec 15 min d'\xE9chauffement progressif au d\xE9part.",
  ctxSportNoteWind: "Vent de face actif ({speed} km/h, p\xE9nalit\xE9 +{min}m) \u2014 restez bas sur le cintre dans les portions expos\xE9es pour r\xE9duire le CdA.",
  ctxSportNoteCalm: "Conditions favorables sur le parcours. Gardez une cadence r\xE9guli\xE8re pour rallier {dest} sans dette \xE9nerg\xE9tique.",
  ctxSportMetric1Label: "Allure cible",
  ctxSportMetric1Sub: "Base Zone 2/3",
  ctxSportMetric2Label: "Apport glucides",
  ctxSportMetric2Sub: "Ravito en selle",
  ctxSportMetric3Label: "Temps roul\xE9",
  ctxSportMetric3Sub: "\xC9tape de {dist} km",
  ctxSportMetric4Label: "Fen\xEAtre r\xE9cup",
  ctxSportMetric4Val: "25g prot\xE9ines",
  ctxSportMetric4Sub: "Sous 30 min",
  // Contextual Banner: Bikepacking
  ctxBpTitle: "\xC9quilibre des sacoches & ravitaillement",
  ctxBpSummary: "~{gear} kg de bagages \xB7 Arriv\xE9e avant le cr\xE9puscule",
  ctxBpBadge: "Autonomie",
  ctxBpAdvice: "V\xE9rifiez le d\xE9gagement du sac de cintre et \xE9quilibrez la sacoche de cadre. Emportez 2,0 L d'eau minimum et visez une arriv\xE9e avant la tomb\xE9e de la nuit pour monter le camp.",
  ctxBpNoteWind: "Le vent de face ({speed} km/h) sur les sacoches augmente la tra\xEEn\xE9e a\xE9ro. Lissez l'effort pour pr\xE9server les jambes dans les bosses.",
  ctxBpNoteCalm: "Chargement fix\xE9 \xE0 ~{gear} kg ({rig} kg v\xE9lo \xE9quip\xE9). Rep\xE9rez les points d'eau en route vers {dest}.",
  ctxBpMetric1Label: "\xC9tape du jour",
  ctxBpMetric1Sub: "Distance",
  ctxBpMetric2Label: "Chargement",
  ctxBpMetric2Sub: "{rig} kg v\xE9lo complet",
  ctxBpMetric3Label: "Roulage charg\xE9",
  ctxBpMetric3Sub: "En mouvement",
  ctxBpMetric4Label: "Limite bivouac",
  ctxBpMetric4Sub: "Avant la nuit",
  // Contextual Banner: Escapade
  ctxEscTitle: "Check-in r\xE9ception & local v\xE9lo",
  ctxEscSummary: "Cal\xE9 pour une arriv\xE9e \xE0 {time} \xB7 +{min}m de marge d\xE9tente",
  ctxEscBadge: "+{min}m marge",
  ctxEscAdvice: "Arriv\xE9e planifi\xE9e juste \xE0 temps pour le check-in \xE0 {time}. S\xE9curisez le v\xE9lo au local int\xE9rieur et d\xE9posez vos affaires avant la soir\xE9e.",
  ctxEscNote: "Inclut un coussin confort de +{min}m pour les pauses caf\xE9 et une cadence d\xE9tendue vers {dest}.",
  ctxEscMetric1Label: "\xC9tape",
  ctxEscMetric1Sub: "Parcours cyclo",
  ctxEscMetric2Label: "Cible check-in",
  ctxEscMetric3Label: "Temps de selle",
  ctxEscMetric4Label: "Marge d\xE9tente",
  ctxEscMetric4Sub: "Allure sans stress",
  // Contextual Banner: Commute
  ctxComTitle: "Protocole bureau & ravito vestiaire",
  ctxComSummary: "Z\xE9ro nourriture au bureau \xB7 Ravito vestiaire \xE0 {gateTime} avant {shiftTime}",
  ctxComBadge: "Z\xE9ro retard",
  ctxComAdvice: "Aucune nourriture autoris\xE9e en open space. Prenez la Phase 1 (Skyr + jus) \xE0 {gateTime} au vestiaire, suivie de la douche et des flocons d'avoine en salle de pause avant {shiftTime}.",
  ctxComNoteWind: "Vent de face sur le pont ({speed} km/h, p\xE9nalit\xE9 +{min}m) \u2014 le d\xE9part \xE0 {depTime} garantit un badgeage \xE0 l'heure \xE0 {gate}.",
  ctxComNoteCalm: "Badge requis \xE0 {gate}. Marge feux et portillon (+{min}m) calibr\xE9e pour une ponctualit\xE9 porte-\xE0-bureau.",
  ctxComMetric1Label: "Arriv\xE9e portillon",
  ctxComMetric2Label: "Marge urbaine",
  ctxComMetric2Sub: "R\xE9serve trafic",
  ctxComMetric3Label: "Porte-\xE0-bureau",
  ctxComMetric3Sub: "Transit total",
  ctxComMetric4Label: "Prise de poste",
  ctxComMetric4Sub: "Au bureau",
  // ── Physics Engine Card ──
  physicsCardTitle: "Physique a\xE9rodynamique & roulement",
  physicsCardSub: "D\xE9composition de la puissance m\xE9canique : tra\xEEn\xE9e de l'air, pneus et transmission",
  aeroDragPill: "Tra\xEEn\xE9e a\xE9ro",
  wattsUnit: "watts",
  tireRollingPill: "Roulement pneus",
  drivetrainPill: "Transmission",
  effShort: "{pct}% rend.",
  wattsLossUnit: "W perdus",
  chainFrictionLoss: "{pct}% perte friction cha\xEEne",
  systemMassHeading: "Masse totale",
  totalKgBadge: "{mass} kg au total",
  riderMassRow: "Masse cycliste",
  bicycleBuildRow: "Masse v\xE9lo",
  gearPayloadRow: "\xC9quipement & bagages",
  energySubstrateHeading: "Substrat \xE9nerg\xE9tique",
  grossEffBadge: "{pct}% rend. brut",
  mechanicalWorkRow: "Travail m\xE9canique",
  metabolicBurnRow: "D\xE9pense m\xE9tabolique",
  glycogenDemandRow: "Besoin glycog\xE8ne",
  // Physics Go Status Reasons
  goReasonGale: "Coup de vent s\xE9v\xE8re sur l'estuaire ({wind} km/h). Danger de rafales lat\xE9rales sur le pont.",
  goReasonHeadwind: "Vent de face soutenu ({wind} km/h). Surco\xFBt a\xE9rodynamique de +{watts}W sur les secteurs expos\xE9s.",
  goReasonPower: "La puissance soutenue requise ({watts}W) d\xE9passe le tempo d'endurance habituel.",
  goReasonBreeze: "Brise mod\xE9r\xE9e ({wind} km/h). Toute la t\xE9l\xE9m\xE9trie est dans l'enveloppe optimale de v\xE9lotaf.",
  goReasonCalm: "Conditions calmes. Allure r\xE9gie par la pure r\xE9sistance au roulement.",
  // ── Atmosphere Card ──
  atmosphereTitle: "Atmosph\xE8re & vecteur vent",
  badgeManual: "Manuel",
  badgeBaseline: "Saisonnier",
  badgeLive: "Direct",
  subSimulatedOverride: "Simulation manuelle",
  subSeasonalModel: "Mod\xE8le saisonnier",
  subOpenMeteoSync: "Synchro Open-Meteo",
  syncForecastTitle: "Actualiser les pr\xE9visions m\xE9t\xE9o",
  syncingBtn: "Synchro...",
  syncBtn: "Actualiser",
  clearanceGo: "Feu vert : Go \xB7 A\xE9rodynamisme optimal",
  clearanceCaution: "Prudence \xB7 Tra\xEEn\xE9e a\xE9rodynamique \xE9lev\xE9e",
  clearanceNoGo: "No-Go \xB7 Alerte coup de vent s\xE9v\xE8re",
  compassWest: "O",
  corridorWindVector: "Vecteur vent sur le parcours",
  wswEstuary: "OSO estuaire",
  corridorDir: "couloir",
  dragBufferPill: "+{watts}W tra\xEEn\xE9e \xB7 +{min}m marge",
  zeroPenaltyPill: "0W p\xE9nalit\xE9 \xB7 pur roulement",
  maxGustEnvelope: "Rafales maximales",
  peakUnit: "max",
  windSimulationLabel: "Simulation du vent",
  manualWindSimAria: "Vitesse de simulation manuelle du vent",
  presetCalm: "Calme (0)",
  presetModerate: "Mod\xE9r\xE9 (15)",
  presetGale: "Temp\xEAte (35+)",
  // ── Readiness Checklist Card ──
  checklistSub: "{done} sur {total} valid\xE9s \xB7 {tag}",
  resetBtn: "R\xE9initialiser",
  resetChecklistTitle: "R\xE9initialiser la checklist",
  readyStatus: "Pr\xEAt",
  pendingCountStatus: "{count} restants",
  requiredBadge: "Requis",
  checklistFooterHint: "Cliquez sur un \xE9l\xE9ment pour valider le contr\xF4le pr\xE9-d\xE9part",
  // ── Route Map Banner ──
  routeCorridorTitle: "Trac\xE9 du parcours",
  distanceTraceSub: "trac\xE9 de {dist} km",
  activeTrackBadge: "Trac\xE9 actif",
  scrollLockBadge: "Zoom verrouill\xE9",
  // ── Nutrition Bento ──
  nutriSportTitle: "Protocole de nutrition & r\xE9cup\xE9ration",
  nutriSportSub: "Apport glycog\xE9nique haute intensit\xE9 sur {dist} km",
  nutriSportBadge: "70\u201390g glucides/h \xB7 {kcal} kcal",
  nutriSport1Title: "Charge pr\xE9-d\xE9part",
  nutriSport1Body: "Repas riche en glucides digestes (riz blanc ou pain grill\xE9 au miel). Double expresso \xE0 T-45m et 500 ml d'\xE9lectrolytes riches en sodium.",
  nutriSport2Title: "Ravito en selle",
  nutriSport2Body: "Boisson isotonique dans les bidons (maltodextrine/fructose 2:1). Prenez un gel ou une p\xE2te de fruits toutes les 30 min pour soutenir les watts.",
  nutriSport3Title: "R\xE9cup\xE9ration post-sortie",
  nutriSport3Badge: "Sous 30 min",
  nutriSport3Body: "Collation ou repas ratio 3:1 glucides/prot\xE9ines dans les 30 minutes suivant l'arriv\xE9e pour recharger le glycog\xE8ne et r\xE9parer les fibres.",
  nutriBpTitle: "Protocole de nutrition & r\xE9cup\xE9ration",
  nutriBpSub: "\xC9quilibre calorique longue distance en autonomie sur {dist} km",
  nutriBpBadge: "~{kcal} kcal sur l'\xE9tape",
  nutriBp1Title: "Petit-d\xE9jeuner dense au camp",
  nutriBp1Body: "Base \xE9nerg\xE9tique solide : flocons d'avoine aux noix, \u0153ufs, pain et caf\xE9. Remplissez les poches \xE0 eau avec \xE9lectrolytes avant de plier le camp.",
  nutriBp2Title: "Grignotage r\xE9gulier en route",
  nutriBp2Body: "Mangez de petites portions toutes les 25 minutes (ol\xE9agineux, fruits secs, barres, arr\xEAt boulangerie) pour \xE9viter toute fringale.",
  nutriBp3Title: "R\xE9g\xE9n\xE9ration au bivouac",
  nutriBp3Body: "Repas chaud riche en prot\xE9ines et glucides le soir avec r\xE9hydratation compl\xE8te en \xE9lectrolytes avant l'\xE9tape du lendemain.",
  nutriEscTitle: "Protocole de nutrition & r\xE9cup\xE9ration",
  nutriEscSub: "Ravitaillement naturel d'endurance en route vers {dest}",
  nutriEscBadge: "~{kcal} kcal br\xFBl\xE9es",
  nutriEsc1Title: "Allumage pr\xE9-d\xE9part",
  nutriEsc1Body: "Pain au levain grill\xE9 avec miel ou confiture, expresso et 400 ml d'eau l\xE9g\xE8rement sal\xE9e 45 minutes avant de rouler.",
  nutriEsc2Title: "Ravito en selle (~45g/h)",
  nutriEsc2Body: "Hydratation r\xE9guli\xE8re aux \xE9lectrolytes et encas tous les 15 km : figues s\xE9ch\xE9es, dattes Medjool ou p\xE2tes de fruits.",
  nutriEsc3Title: "Check-in & d\xEEner d'\xE9tape",
  nutriEsc3Body: "Recharge hydrique de 500 ml \xE0 l'arriv\xE9e \xE0 l'h\xF4tel, suivie d'un d\xEEner complet de sp\xE9cialit\xE9s locales pour r\xE9cup\xE9rer.",
  nutriComTitle: "Protocole de nutrition & r\xE9cup\xE9ration",
  nutriComSub: "Ravitaillement \xE0 base d'aliments bruts cal\xE9 sur le vestiaire et l'open space",
  nutriComBadge: "Est. {kcal} kcal",
  nutriCom1Title: "Allumage pr\xE9-d\xE9part",
  nutriCom1Body: "Baguette blanche au miel de fleurs, double expresso et 300 ml d'eau avec une pinc\xE9e de sel marin.",
  nutriCom2Title: "Ravito de poche",
  nutriCom2Badge: "En route",
  nutriCom2Body: "Bidon 50/50 jus de raisin & eau, 2 dattes Medjool et 2 p\xE2tes de fruits artisanales.",
  nutriCom3Title: "Ravito vestiaire",
  nutriCom3Badge: "Arriv\xE9e",
  nutriCom3Body: "Pot de 200 g de Skyr 0 % + 250 ml de pur jus de raisin consomm\xE9s au vestiaire avant la douche.",
  nutriCom4Title: "Repas salle de pause",
  nutriCom4Badge: "Avant poste",
  nutriCom4Body: "Overnight oats au lait d'avoine & chia, pomme Granny Smith croquante et caf\xE9 avant de rejoindre le bureau.",
  // ── Configurator Screen ──
  backToFlightDeck: "Retour au Cockpit",
  createNewProfileHeading: "Cr\xE9er un nouveau profil de trajet",
  liveCalculationBadge: "Calcul en direct",
  savedBtn: "Enregistr\xE9",
  saveProfileBtn: "Enregistrer",
  saveAndOpenBtn: "Enregistrer & ouvrir le Cockpit",
  archetypeHeading: "Arch\xE9type de mission & identit\xE9",
  archetypeSub: "Choisissez un mode pour calibrer la checklist, les marges horaires et le protocole ravito",
  modeBadge: "Mode : {tag}",
  archBikepackingLabel: "Bikepacking",
  archBikepackingDesc: "Autonomie sur plusieurs jours",
  archSportLabel: "Sport / Fondo",
  archSportDesc: "Allure haute intensit\xE9",
  archCommuteLabel: "V\xE9lotaf",
  archCommuteDesc: "Prise de poste & vestiaire",
  archEscapadeLabel: "Escapade",
  archEscapadeDesc: "Check-in h\xF4tel & cyclo",
  tripNameLabel: "Nom du trajet",
  tripNamePlaceholder: "V\xE9lotaf Matinal Estuaire",
  classificationTagLabel: "Tag de classification",
  operationalSummaryLabel: "R\xE9sum\xE9 op\xE9rationnel",
  operationalSummaryPlaceholder: "Court descriptif du parcours...",
  corridorGeneratorHeading: "G\xE9n\xE9rateur d'itin\xE9raire cyclable",
  corridorGeneratorSub: "Calcul du trac\xE9 v\xE9lo et de la distance via OSRM",
  originCityLabel: "Ville de d\xE9part",
  destinationLabel: "Destination",
  locationSearchPlaceholder: "Rechercher une ville, rue, gare...",
  autocompleteSearching: "Recherche de lieux...",
  autocompleteNoResults: "Aucun lieu trouv\xE9",
  autocompleteClear: "Effacer",
  autocompletePopularHubs: "Lieux sugg\xE9r\xE9s",
  swapCorridorBtn: "Inverser d\xE9part et destination",
  locationVerifiedTooltip: "Coordonn\xE9es r\xE9solues et v\xE9rifi\xE9es",
  fetchRouteBtn: "Tracer",
  routeUpdatedMsg: "Itin\xE9raire mis \xE0 jour : trac\xE9 v\xE9lo de {dist} km charg\xE9",
  routeErrorDefault: "Erreur lors du calcul de l'itin\xE9raire cyclable.",
  activeCorridorMsg: "Corridor actif : {origin} \u2192 {dest} ({dist} km)",
  scheduleWeatherHeading: "Horaires & synchro m\xE9t\xE9o",
  scheduleWeatherSub: "Aligne les vecteurs m\xE9t\xE9o horaires sur votre date de d\xE9part pr\xE9vue",
  horizonBaseline: "Saisonnier ({offset})",
  horizonLiveToday: "Direct aujourd'hui",
  horizonPlanned: "Planifi\xE9 ({offset})",
  departureDateLabel: "Date de d\xE9part",
  rolloutTimeLabel: "Heure de d\xE9part",
  syncWeatherBtn: "Synchro m\xE9t\xE9o",
  weatherBaselineApplied: "Moyenne saisonni\xE8re appliqu\xE9e ({offset} > fen\xEAtre m\xE9t\xE9o 14j)",
  weatherSyncedMsg: "Pr\xE9visions Open-Meteo synchronis\xE9es pour le {date} \xB7 {time}",
  weatherSyncUnavailable: "Synchro m\xE9t\xE9o indisponible \u2014 v\xE9rifiez votre connexion r\xE9seau.",
  currentConditionsSummary: "Conditions actuelles : {temp}\xB0C \xB7 Vent {wind} km/h \xB7 \u03C1 {rho} kg/m\xB3",
  liveTelemetryHeading: "T\xE9l\xE9m\xE9trie en direct",
  calculatedHardRollout: "D\xE9part imp\xE9ratif calcul\xE9",
  targetTimeLabel: "Cible {time}",
  movingPlusBuffer: "Roulage {moving} + {buffer}m marge",
  requiredLegOutput: "Puissance jambes requise",
  aeroDragRow: "Tra\xEEn\xE9e a\xE9ro (CdA {cda})",
  rollingRow: "Roulement (Crr {crr})",
  drivetrainLossRow: "Perte transmission",
  headwindSurchargeRow: "Surco\xFBt vent de face",
  metabolicExpenditureHeading: "D\xE9pense m\xE9tabolique",
  caloricBurnRow: "Calories br\xFBl\xE9es",
  carbOxidationRow: "Oxydation glucides",
  protocolSport: "Protocole d'allure sportive",
  protocolBikepacking: "Autonomie compl\xE8te",
  protocolEscapade: "Synchro check-in r\xE9ception",
  protocolDeskFoodBan: "Interdiction repas open space : {state}",
  enforcedState: "Stricte",
  advisoryState: "Conseill\xE9e",
  targetWithBuffer: "Cible {time} \xB7 +{buffer}m marge",
  // ── Natural Language Prompt ──
  nlpHeading: "Configuration en langage naturel",
  nlpSub: "D\xE9crivez votre trajet, heure d'arriv\xE9e, allure et bagages en fran\xE7ais ou en anglais pour remplir tous les champs",
  nlpAppliedBadge: "Appliqu\xE9",
  nlpTemplatesLabel: "Mod\xE8les :",
  nlpPlaceholder: "ex. Je veux rouler vers un h\xF4tel \xE0 Clisson le 15 d\xE9cembre, check-in \xE0 15h \xE0 25 km/h...",
  nlpParseApplyBtn: "Analyser & appliquer",
  nlpHint: "Comprend nativement le fran\xE7ais et l'anglais : v\xE9lotaf, check-in, allure, dates, sacoches, ravito et kit anti-cr\xE8ve.",
  nlpPresetCommuteLabel: "Protocole V\xE9lotaf",
  nlpPresetCommuteText: "V\xE9lotaf gravel de 22 km par le pont de l'estuaire vers Porte 17, arriv\xE9e \xE0 08h30 pour prise de poste \xE0 09h00. Cycliste 74 kg, v\xE9lo 9,4 kg, sacoche 4 kg, allure 27,5 km/h avec vent de face de 8 km/h. Ravito vestiaire, pas de nourriture en open space.",
  nlpPresetEscapadeLabel: "Escapade h\xF4tel",
  nlpPresetEscapadeText: "Je veux rouler de Nantes vers un h\xF4tel \xE0 Clisson le 15 d\xE9cembre 2026, check-in \xE0 15h, partir \xE0 10h30 avec 6,5 kg de bagages, allure de 24 km/h sur 45 km.",
  nlpPresetBikepackingLabel: "Raid Bikepacking",
  nlpPresetBikepackingText: "Bikepacking bivouac le 28 octobre. D\xE9part \xE0 07h00, distance 85 km, 12 kg de sacoches, v\xE9lo 11,5 kg, cycliste 72 kg, allure 21 km/h, pause ravito 15 min et marge anti-cr\xE8ve 10 min.",
  nlpPresetSportLabel: "Sport Gran Fondo",
  nlpPresetSportText: "Sortie Sport Gran Fondo demain. Sans sacoche, 110 km, vitesse cible 33 km/h, partir \xE0 6h30 avec kit anti-cr\xE8ve.",
  nlpFeedbackRollout: "D\xE9part {time}",
  nlpFeedbackArrival: "Arriv\xE9e {time}",
  nlpFeedbackGear: "{mass} kg bagages",
  nlpFeedbackRider: "{mass} kg cycliste",
  nlpFeedbackBike: "{mass} kg v\xE9lo",
  nlpFeedbackDeskBan: "Z\xE9ro repas open space",
  nlpFeedbackRavito: "Ravito : {info}",
  nlpFeedbackPuncture: "Anti-cr\xE8ve : {info}",
  // ── Parameter Tabs ──
  tabPhysics: "Physique & masse",
  tabRoute: "Parcours & allure",
  tabOffice: "Horaires & acc\xE8s",
  tabWeather: "Vent & m\xE9t\xE9o",
  totalSystemMassTitle: "Masse totale en mouvement",
  systemMassFormula: "Cycliste {rider} kg + V\xE9lo {bike} kg + Bagages {gear} kg",
  riderMassInputLabel: "Masse du cycliste (kg)",
  bikeMassInputLabel: "Masse du v\xE9lo (kg)",
  gearMassInputLabel: "Masse \xE9quipement & sacoches (kg)",
  aeroMechConstantsHeading: "Constantes a\xE9rodynamiques & m\xE9caniques",
  dragAreaLabel: "Surface frontale CdA (m\xB2)",
  dragAreaHint: "0.40 m\xB2 mains aux cocottes",
  rollingResLabel: "R\xE9sistance au roulement Crr",
  rollingResHint: "0.006 gravel sur bitume",
  drivetrainEffLabel: "Rendement transmission",
  drivetrainEffHint: "0.95 cha\xEEne propre",
  muscularEffLabel: "Rendement musculaire",
  muscularEffHint: "0.21 rendement humain brut",
  routeDistInputLabel: "Distance du parcours (km)",
  targetCruisingSpeedLabel: "Allure de croisi\xE8re cible (km/h)",
  trafficBufferLabel: "Marge feux & intersections (min)",
  trafficBufferHint: "Int\xE8gre les travers\xE9es urbaines et les approches de pont",
  gateBufferLabel: "Marge portillon & antivol (min)",
  gateBufferHint: "Scan du badge et stationnement au local v\xE9lo s\xE9curis\xE9",
  openSpaceRestrictionTitle: "Restriction repas en open space",
  openSpaceRestrictionDesc: "Planifie le ravito vestiaire et le petit-d\xE9jeuner en salle de pause avant la prise de poste.",
  shiftStartInputLabel: "Prise de poste / heure limite",
  targetArrivalInputLabel: "Heure d'arriv\xE9e cible",
  checkpointGateLabel: "Nom du point d'acc\xE8s / porte",
  lockerRefuelInputLabel: "Ravito vestiaire (min)",
  showerChangeInputLabel: "Douche & tenue (min)",
  breakRoomMealInputLabel: "Repas salle de pause (min)",
  opposingHeadwindTitle: "Vent de face contraire",
  headwindActiveBtn: "Actif",
  headwindCalmBtn: "Calme",
  opposingHeadwindDesc: "Mod\xE9lise un vecteur vent d\xE9favorable sur les secteurs expos\xE9s.",
  baseWindSpeedLabel: "Vitesse moyenne du vent (km/h)",
  ambientTempLabel: "Temp\xE9rature ambiante (\xB0C)",
  precipRiskLabel: "Risque de pr\xE9cipitations (%)",
  // ── Rider & Bike Specs Modal ──
  specsModalTitle: "Sp\xE9cifications cycliste & v\xE9lo",
  specsModalSub: "Base physique appliqu\xE9e automatiquement aux nouveaux profils cr\xE9\xE9s",
  closeModalAria: "Fermer la fen\xEAtre",
  riderPhysiologyHeading: "Physiologie du cycliste",
  weightLabel: "Poids",
  heightLabel: "Taille",
  ftpBaselineLabel: "FTP de base",
  activeBikeBuildHeading: "Monture active",
  modelNameLabel: "Mod\xE8le du v\xE9lo",
  tireCrrLabel: "Crr pneus",
  tireCrrHint: "0.0055 gravel",
  aeroCdaLabel: "CdA a\xE9ro",
  aeroCdaHint: "0.38 m\xB2 cocottes",
  savedLocallyNotice: "Enregistr\xE9 localement dans le navigateur",
  cancelBtn: "Annuler",
  saveSpecsBtn: "Enregistrer",
  // ── Print Flight Sheet ──
  printHeaderTagline: "BIKE TRIP ENGINE \xB7 FEUILLE DE ROUTE OP\xC9RATIONNELLE (A4)",
  printClassification: "Classification :",
  printDestination: "Destination :",
  printShiftLock: "Prise de poste :",
  printDecision: "D\xC9CISION : {status}",
  printGenerated: "G\xE9n\xE9r\xE9 le :",
  printSection1: "1. T\xC9L\xC9M\xC9TRIE PHYSIQUE & PARAM\xC8TRES R\xC9SISTIFS",
  printSystemMass: "MASSE TOTALE",
  printSystemMassBreak: "Cycliste {rider} + V\xE9lo {bike} + Bagages {gear}",
  printTargetPower: "PUISSANCE CIBLE",
  printWheelPower: "@{speed} km/h (Roue : {wheel}W)",
  printAeroRolling: "A\xC9RO / ROULEMENT",
  printRhoEff: "Rho 1.225 kg/m\xB3 \xB7 Rend. 95%",
  printMetabolicWork: "TRAVAIL M\xC9TABOLIQUE",
  printCarbOx: "Oxyd. glucides : {carbs} g/h",
  printSection2: "2. R\xC9TRO-PLANNING HORAIRE (CONTRAINTES STRICTES BUREAU)",
  printZeroFoodMandate: "DIRECTIVE Z\xC9RO NOURRITURE EN OPEN SPACE",
  printColTime: "HEURE",
  printColCheckpoint: "POINT CL\xC9",
  printColLocation: "LIEU",
  printColDirective: "DIRECTIVE OP\xC9RATIONNELLE",
  printColCheck: "VALID.",
  printSection3: "3. PROTOCOLE NUTRITIONNEL ALIMENTS BRUTS (Z\xC9RO POUDRE / LAIT / BANANE)",
  printSection4: "4. CONTR\xD4LE DU MAT\xC9RIEL & VALIDATION PR\xC9-D\xC9PART",
  printAuthorization: "Validation Chef de Bord Cycliste : _________________________",
  printAllVerified: "T\xE9l\xE9m\xE9trie, pression des pneus et ravito v\xE9rifi\xE9s.",
  printClearanceId: "ID Autorisation Acc\xE8s :"
};

// src/context/LanguageContext.tsx
var import_jsx_runtime = __toESM(require_jsx_runtime(), 1);
var STORAGE_KEY_LANG = "velotaf_lang";
function getCurrentLanguage() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY_LANG);
    if (saved === "fr" || saved === "en") {
      return saved;
    }
  } catch {
  }
  return "en";
}
function translate(lang, key, params) {
  const dict = lang === "fr" ? fr : en;
  let str = dict[key] ?? en[key] ?? key;
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
    }
  }
  return str;
}
var LanguageContext = (0, import_react.createContext)(void 0);

// src/utils/physics.ts
var GRAVITY = 9.81;
function calculatePhysics(physics, route, weather, lang = getCurrentLanguage()) {
  const {
    riderWeightKg,
    bikeWeightKg,
    gearWeightKg,
    cda,
    crr,
    rho,
    drivetrainEfficiency,
    grossMechanicalEfficiency,
    gradientPercent
  } = physics;
  const systemMassKg = Number(Math.max(10, riderWeightKg + bikeWeightKg + gearWeightKg).toFixed(1));
  const targetSpeedKmH = Math.max(5, route.targetSpeedKmH);
  const groundSpeedMs = targetSpeedKmH / 3.6;
  const windSpeedKmH = weather.isHeadwindActive ? weather.baseWindSpeedKmH : 0;
  const windSpeedMs = windSpeedKmH / 3.6;
  const airSpeedMs = groundSpeedMs + windSpeedMs;
  const rollingResistanceWatts = crr * systemMassKg * GRAVITY * groundSpeedMs;
  const aerodynamicDragWatts = 0.5 * rho * cda * Math.pow(airSpeedMs, 2) * groundSpeedMs;
  const gradeFraction = gradientPercent / 100;
  const gravityWatts = systemMassKg * GRAVITY * Math.sin(Math.atan(gradeFraction)) * groundSpeedMs;
  const wheelWatts = Math.max(0, rollingResistanceWatts + aerodynamicDragWatts + gravityWatts);
  const eff = Math.min(0.99, Math.max(0.7, drivetrainEfficiency));
  const legWatts = wheelWatts / eff;
  const baselineAirSpeedMs = groundSpeedMs;
  const baselineAeroWatts = 0.5 * rho * cda * Math.pow(baselineAirSpeedMs, 2) * groundSpeedMs;
  const baselineLegWatts = (rollingResistanceWatts + baselineAeroWatts + gravityWatts) / eff;
  const powerDeltaWatts = weather.isHeadwindActive ? legWatts - baselineLegWatts : 0;
  const distanceMeters = route.distanceKm * 1e3;
  const movingTimeSeconds = distanceMeters / groundSpeedMs;
  const hours = Math.floor(movingTimeSeconds / 3600);
  const minutes = Math.floor(movingTimeSeconds % 3600 / 60);
  const seconds = Math.floor(movingTimeSeconds % 60);
  const movingTimeFormatted = `${hours > 0 ? `${hours}h ` : ""}${minutes}m ${seconds.toString().padStart(2, "0")}s`;
  const totalWorkKj = legWatts * movingTimeSeconds / 1e3;
  const grossEff = Math.min(0.26, Math.max(0.15, grossMechanicalEfficiency));
  const totalKcalBurn = totalWorkKj / (grossEff * 4.184);
  const hourlyBurnKcal = movingTimeSeconds > 0 ? totalKcalBurn / (movingTimeSeconds / 3600) : 0;
  const carbFraction = Math.min(0.85, Math.max(0.45, 0.45 + legWatts / 450 * 0.4));
  const carbOxidationGramPerHour = movingTimeSeconds > 0 ? Math.round(hourlyBurnKcal * carbFraction / 4) : 0;
  const totalCarbsBurnedGrams = movingTimeSeconds > 0 ? Math.round(carbOxidationGramPerHour * (movingTimeSeconds / 3600)) : 0;
  const speedDeltaKmH = weather.isHeadwindActive ? Number((windSpeedKmH * 0.38).toFixed(1)) : 0;
  let goStatus = "GO";
  let goStatusReason = translate(lang, "goReasonCalm");
  const windKmh = weather.isHeadwindActive ? weather.baseWindSpeedKmH || 0 : 0;
  if (windKmh >= 30 || weather.estuaryGustKmH && weather.estuaryGustKmH >= 50) {
    goStatus = "NO-GO";
    goStatusReason = translate(lang, "goReasonGale", { wind: windKmh });
  } else if (windKmh >= 15 || legWatts > 225) {
    goStatus = "CAUTION";
    if (windKmh >= 15) {
      goStatusReason = translate(lang, "goReasonHeadwind", {
        wind: windKmh,
        watts: Math.round(powerDeltaWatts)
      });
    } else {
      goStatusReason = translate(lang, "goReasonPower", {
        watts: Math.round(legWatts)
      });
    }
  } else {
    goStatus = "GO";
    goStatusReason = windKmh > 0 ? translate(lang, "goReasonBreeze", { wind: windKmh }) : translate(lang, "goReasonCalm");
  }
  return {
    systemMassKg,
    groundSpeedMs,
    airSpeedMs,
    rollingResistanceWatts,
    aerodynamicDragWatts,
    gravityWatts,
    wheelWatts,
    legWatts,
    movingTimeSeconds,
    movingTimeFormatted,
    totalWorkKj,
    totalKcalBurn,
    carbOxidationGramPerHour,
    totalCarbsBurnedGrams,
    speedDeltaKmH,
    powerDeltaWatts,
    goStatus,
    goStatusReason
  };
}

// src/utils/nutrition.ts
function subtractMinutesFromTime(timeStr, minutesToSub) {
  const [h, m] = timeStr.split(":").map(Number);
  let totalMin = h * 60 + m - minutesToSub;
  while (totalMin < 0) totalMin += 1440;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${newH.toString().padStart(2, "0")}:${newM.toString().padStart(2, "0")}`;
}
function addMinutesToTime(timeStr, minutesToAdd) {
  const [h, m] = timeStr.split(":").map(Number);
  let totalMin = h * 60 + m + minutesToAdd;
  const newH = Math.floor(totalMin / 60) % 24;
  const newM = totalMin % 60;
  return `${newH.toString().padStart(2, "0")}:${newM.toString().padStart(2, "0")}`;
}

// src/utils/timeline.ts
function calculateReverseTimeline(route, office, weather, tripTag = "V\xC9LOTAF", destinationName = "", lang = getCurrentLanguage()) {
  const isFr = lang === "fr";
  const tagUpper = tripTag.toUpperCase();
  const isSport = tagUpper.includes("SPORT") || tagUpper.includes("FONDO") || tagUpper.includes("TEMPO");
  const isBikepacking = tagUpper.includes("BIKEPACK") || tagUpper.includes("BIVOUAC");
  const isEscapade = !isSport && !isBikepacking && (tagUpper.includes("ESCAPADE") || tagUpper.includes("TOURING") || tagUpper.includes("LEISURE") || tagUpper.includes("WEEKEND"));
  const speed = Math.max(5, route.targetSpeedKmH || 25);
  const rawMovingMinutes = Math.round(route.distanceKm / speed * 60);
  const windKmh = weather.isHeadwindActive ? weather.baseWindSpeedKmH || 0 : 0;
  const speedPenaltyKmH = windKmh * 0.3;
  const effectiveSpeedKmH = Math.max(8, speed - speedPenaltyKmH);
  const actualMovingMinutes = Math.round(route.distanceKm / effectiveSpeedKmH * 60);
  const weatherHeadwindImpactMinutes = Math.max(0, actualMovingMinutes - rawMovingMinutes);
  const totalRideMinutes = rawMovingMinutes + weatherHeadwindImpactMinutes;
  const routeBuffer = isEscapade || isBikepacking ? 15 : isSport ? 5 : route.urbanTrafficDelayMinutes || 8;
  const arrivalBuffer = isEscapade || isBikepacking ? 10 : isSport ? 5 : route.gateSecurityDelayMinutes || 5;
  const defaultAnchor = isSport ? "11:00" : isBikepacking ? "18:00" : isEscapade ? "15:00" : "08:30";
  const targetArrival = office.targetGateArrivalTime || office.shiftStartTime || defaultAnchor;
  const totalEnRouteMinutes = totalRideMinutes + routeBuffer + arrivalBuffer;
  const hardDepartureTime = subtractMinutesFromTime(targetArrival, totalEnRouteMinutes);
  const bikePrepTime = subtractMinutesFromTime(hardDepartureTime, 15);
  const preRideMealTime = subtractMinutesFromTime(hardDepartureTime, 45);
  const wakeUpTime = subtractMinutesFromTime(hardDepartureTime, 60);
  const destTitle = destinationName || route.destination || "Destination";
  const rawGate = office.gateName || (isFr ? "Porte" : "Gate");
  const localizedGate = isFr ? rawGate.replace(/^Gate\b/i, "Porte") : rawGate.replace(/^Porte\b/i, "Gate");
  let steps = [];
  if (isSport) {
    const warmupTime = hardDepartureTime;
    const midIntervalTime = addMinutesToTime(hardDepartureTime, Math.round(totalRideMinutes * 0.5));
    const recoveryWindowTime = addMinutesToTime(targetArrival, 15);
    steps = [
      {
        id: "sport-fuel-primer",
        time: wakeUpTime,
        title: isFr ? "Hydratation & Charge Glucides Rapides" : "Hydration & Fast Carbs Primer",
        location: isFr ? "Domicile" : "Home Base",
        category: "nutrition",
        isCrucialCheckpoint: true,
        description: isFr ? "500 ml de boisson \xE9lectrolytes + 60 g de glucides \xE0 IG \xE9lev\xE9. V\xE9rifiez la charge du compteur GPS et de la ceinture cardio." : "500ml electrolyte mix + 60g high-glycemic carbs. Top off bike computer & heart rate monitor.",
        iconName: "AlarmClock"
      },
      {
        id: "sport-cockpit-check",
        time: bikePrepTime,
        title: isFr ? "Calibrage Transmission & Pression Pneus" : "Drivetrain & Tire Pressure Calibration",
        location: isFr ? "Zone de d\xE9part" : "Launch Pad",
        category: "prep",
        isCrucialCheckpoint: false,
        description: isFr ? "Pression ajust\xE9e pour minimiser le Crr. V\xE9rification lubrification cha\xEEne et mise en place des 2 bidons de 750 ml." : "Tire pressures dialed for low rolling resistance. Lube check and bottle cage staging (2x 750ml).",
        iconName: "CheckCircle2"
      },
      {
        id: "sport-rollout",
        time: warmupTime,
        title: isFr ? "D\xC9PART & \xC9CHAUFFEMENT PROGRESSIF ZONE 2" : "ROLLOUT & ZONE 2 PROGRESSIVE WARMUP",
        location: isFr ? "D\xE9part" : "Origin",
        category: "ride",
        isCrucialCheckpoint: true,
        description: isFr ? `15 min de v\xE9locit\xE9 progressive avant de caler l'allure cible (~${route.targetSpeedKmH || 30} km/h).` : `15-min progressive spin before settling into target pace (~${route.targetSpeedKmH || 30} km/h).`,
        iconName: "Navigation"
      },
      {
        id: "sport-mid-fuel",
        time: midIntervalTime,
        title: isFr ? "Fen\xEAtre Ravito Glucides & \xC9lectrolytes" : "Mid-Ride Carb & Electrolyte Window",
        location: isFr ? "Secteur Allure" : "Pacing Corridor",
        category: "nutrition",
        isCrucialCheckpoint: false,
        description: isFr ? "Prise de gel ou p\xE2te de fruits en selle (cible 60\u201390 g glucides/h). Contr\xF4le des watts moyens et de la d\xE9rive cardiaque." : "In-flight gel/chew intake (60-90g carbs/hr target). Check average wattage and heart rate drift.",
        iconName: "Wind"
      },
      {
        id: "sport-session-finish",
        time: targetArrival,
        title: isFr ? `Arriv\xE9e d'\xE9tape : ${destTitle}` : `Stage Finish: ${destTitle}`,
        location: destTitle,
        category: "transit",
        isCrucialCheckpoint: true,
        description: isFr ? "Passage de la ligne d\u2019arriv\xE9e. 5 min de retour au calme souple sous 120 bpm." : "Cross route finish marker. 5-min easy spin down below 120 bpm.",
        iconName: "ShieldCheck"
      },
      {
        id: "sport-post-recovery",
        time: recoveryWindowTime,
        title: isFr ? "Fen\xEAtre M\xE9tabolique R\xE9cup & \xC9tirements" : "Anabolic Recovery Window & Stretch",
        location: isFr ? "Zone R\xE9cup" : "Recovery Staging",
        category: "prep",
        isCrucialCheckpoint: false,
        description: isFr ? "25 g de prot\xE9ines + 500 ml d\u2019eau fra\xEEche. Rel\xE2chement ischio-jambiers et fl\xE9chisseurs de hanche." : "25g whey/plant protein + 500ml cold water. Hamstring & hip flexor release protocol.",
        iconName: "Coffee"
      }
    ];
  } else if (isBikepacking) {
    const midStageTime = addMinutesToTime(hardDepartureTime, Math.round(totalRideMinutes * 0.5));
    const campPitchTime = addMinutesToTime(targetArrival, 20);
    steps = [
      {
        id: "bp-stowage-check",
        time: wakeUpTime,
        title: isFr ? "Chargement des Sacoches & Calories" : "Rig Packing & Calorie Staging",
        location: isFr ? "Camp / Domicile" : "Camp / Home Base",
        category: "prep",
        isCrucialCheckpoint: true,
        description: isFr ? "Compression des sacs \xE9tanches, \xE9quilibrage de la sacoche de cadre, contr\xF4le du couchage et de la filtration d\u2019eau." : "Pack dry bags, balance frame bag weight, inspect sleeping kit and water filtration gear.",
        iconName: "AlarmClock"
      },
      {
        id: "bp-harness-inspection",
        time: bikePrepTime,
        title: isFr ? "Contr\xF4le Harnais, Freins & Kit Anti-Cr\xE8ve" : "Harness & Brake Pad Clearance Inspection",
        location: isFr ? "Point de D\xE9part" : "Trailhead Staging",
        category: "prep",
        isCrucialCheckpoint: false,
        description: isFr ? "Serrage du harnais de cintre, maintien de la sacoche de selle et v\xE9rification des flancs de pneus sous charge." : "Torque check handlebar harness, secure seat-pack sway, check tire sidewalls for loaded clearance.",
        iconName: "CheckCircle2"
      },
      {
        id: "bp-departure",
        time: hardDepartureTime,
        title: isFr ? `D\xC9PART EXP\xC9DITION VERS ${destTitle.toUpperCase()}` : `TRAILHEAD ROLLOUT TOWARD ${destTitle.toUpperCase()}`,
        location: isFr ? "D\xE9part" : "Origin",
        category: "ride",
        isCrucialCheckpoint: true,
        description: isFr ? `Cadence d\u2019endurance r\xE9guli\xE8re (~${route.targetSpeedKmH || 18} km/h) avec v\xE9lo charg\xE9.` : `Steady endurance cadence (~${route.targetSpeedKmH || 18} km/h) under loaded cargo mass.`,
        iconName: "Navigation"
      },
      {
        id: "bp-mid-refuel",
        time: midStageTime,
        title: isFr ? "Ravito Mi-\xC9tape, Eau & Sanglage" : "Mid-Stage Water Resupply & Bag Check",
        location: isFr ? "Mi-Parcours" : "Midway Sector",
        category: "nutrition",
        isCrucialCheckpoint: false,
        description: isFr ? "Contr\xF4le de tension des sangles apr\xE8s vibrations et remplissage des r\xE9serves d\u2019eau." : "Check frame bag straps for trail vibration looseness. Top off water bladders.",
        iconName: "Wind"
      },
      {
        id: "bp-destination-arrive",
        time: targetArrival,
        title: isFr ? `Arriv\xE9e \xE0 ${destTitle}` : `Arrival at ${destTitle}`,
        location: destTitle,
        category: "transit",
        isCrucialCheckpoint: true,
        description: isFr ? "Arriv\xE9e sur la zone de bivouac avant le cr\xE9puscule. Rep\xE9rage d\u2019un sol plat." : "Reach destination or bivouac zone. Survey ground for camp setup.",
        iconName: "ShieldCheck"
      },
      {
        id: "bp-camp-settle",
        time: campPitchTime,
        title: isFr ? "Montage Bivouac & Repas Chaud" : "Bivouac Setup & Calorie Refuel",
        location: isFr ? "Zone de Bivouac" : "Bivouac Site",
        category: "prep",
        isCrucialCheckpoint: false,
        description: isFr ? "Montage de la tente, a\xE9ration de la tenue et r\xE9chaud pour un d\xEEner riche de r\xE9cup\xE9ration." : "Pitch shelter, hang bike kit to air dry, fire stove for warm calorie-dense recovery meal.",
        iconName: "Coffee"
      }
    ];
  } else if (isEscapade) {
    const arrivalTime = subtractMinutesFromTime(targetArrival, 5);
    const roomSettleTime = addMinutesToTime(targetArrival, 25);
    const exploreTime = addMinutesToTime(roomSettleTime, 30);
    steps = [
      {
        id: "prep-hydration",
        time: wakeUpTime,
        title: isFr ? "Pr\xE9paration Bagages & Hydratation" : "Stage Equipment & Hydration Primer",
        location: isFr ? "Domicile" : "Home Base",
        category: "prep",
        isCrucialCheckpoint: false,
        description: isFr ? "Boire 400 ml d\u2019eau avec \xE9lectrolytes. Dernier contr\xF4le des sacoches (chargeurs, tenue du soir)." : "Drink 400ml water with electrolytes. Final pack check (chargers, overnight kit).",
        iconName: "AlarmClock"
      },
      {
        id: "pre-ride-fuel",
        time: preRideMealTime,
        title: isFr ? "Allumage \xC9nerg\xE9tique Pr\xE9-D\xE9part" : "Pre-Ride Energy Staging",
        location: isFr ? "Cuisine" : "Kitchen Counter",
        category: "nutrition",
        isCrucialCheckpoint: true,
        description: isFr ? "Glucides digestes + expresso. Remplissage des 2 bidons pour la route." : "Complex carbs + espresso. Fill 2x water bidons for the road.",
        iconName: "Utensils"
      },
      {
        id: "garage-rollout",
        time: bikePrepTime,
        title: isFr ? "Contr\xF4le V\xE9lo, Pression & Anti-Cr\xE8ve" : "Rig & Cockpit Pre-Check",
        location: isFr ? "Point de D\xE9part" : "Rollout Point",
        category: "prep",
        isCrucialCheckpoint: false,
        description: isFr ? "Pression pneus cyclo, sacoches sangl\xE9es, kit anti-cr\xE8ve et trace GPS charg\xE9e." : "Tire pressures at touring spec, panniers strapped, GPS route locked.",
        iconName: "CheckCircle2"
      },
      {
        id: "hard-departure",
        time: hardDepartureTime,
        title: isFr ? `D\xC9PART IMP\xC9RATIF VERS ${destTitle.toUpperCase()}` : `ROLLOUT FOR ${destTitle.toUpperCase()}`,
        location: isFr ? "D\xE9part" : "Origin",
        category: "ride",
        isCrucialCheckpoint: true,
        description: isFr ? `Allure cyclo r\xE9guli\xE8re (~${route.targetSpeedKmH} km/h). Arriv\xE9e cible \xE0 ${targetArrival}.` : `Steady touring pace (~${route.targetSpeedKmH} km/h). Target arrival by ${targetArrival}.`,
        iconName: "Navigation"
      },
      {
        id: "mid-ride-transit",
        time: addMinutesToTime(hardDepartureTime, Math.round(totalRideMinutes * 0.5)),
        title: isFr ? "Pause Ravito & Mi-Parcours" : "Scenic Mid-Route Transition",
        location: isFr ? "Mi-Parcours" : "Midway Sector",
        category: "ride",
        isCrucialCheckpoint: false,
        description: isFr ? "Hydratation & encas \xE9nerg\xE9tique. Gardez une cadence souple et confortable." : "Hydration check & energy bar. Maintain smooth, sustainable cadence.",
        iconName: "Wind"
      },
      {
        id: "destination-arrival",
        time: arrivalTime,
        title: isFr ? `Arriv\xE9e \xE0 ${destTitle}` : `Arrival in ${destTitle}`,
        location: destTitle,
        category: "transit",
        isCrucialCheckpoint: true,
        description: isFr ? `Entr\xE9e dans ${destTitle}. Approche calme jusqu'\xE0 la r\xE9ception de l'h\xE9bergement.` : `Roll into ${destTitle}. Navigate to accommodation entrance.`,
        iconName: "ShieldCheck"
      },
      {
        id: "hotel-checkin",
        time: targetArrival,
        title: isFr ? "Check-In & Local V\xE9lo S\xE9curis\xE9" : "Check-In & Secure Bike Storage",
        location: isFr ? "R\xE9ception H\xF4tel" : "Hotel Reception",
        category: "office",
        isCrucialCheckpoint: true,
        description: isFr ? "Enregistrement \xE0 la r\xE9ception, rangement du v\xE9lo au local ferm\xE9 et d\xE9p\xF4t des bagages." : "Check in, secure bike in dedicated room/rack, and drop luggage.",
        iconName: "Briefcase"
      },
      {
        id: "freshen-up",
        time: roomSettleTime,
        title: isFr ? "Douche, R\xE9cup & Tenue Civile" : "Shower, Refresh & Casual Kit Change",
        location: isFr ? "Chambre d'H\xF4tel" : "Hotel Room",
        category: "prep",
        isCrucialCheckpoint: false,
        description: isFr ? "Douche chaude, r\xE9hydratation et passage en tenue de ville confortable." : "Hot shower, rehydrate, slip into off-bike walking clothes.",
        iconName: "ShowerHead"
      },
      {
        id: "town-explore",
        time: exploreTime,
        title: isFr ? `D\xE9couverte de ${destTitle} & D\xEEner` : `Explore ${destTitle} & Evening Dining`,
        location: isFr ? `Centre de ${destTitle}` : `${destTitle} Center`,
        category: "nutrition",
        isCrucialCheckpoint: false,
        description: isFr ? "Balade \xE0 pied dans le centre, d\xE9couverte locale et d\xEEner d\xE9tendu sans contrainte horaire." : "Stroll town center, visit local sights, relaxed dinner without timeline stress.",
        iconName: "Coffee"
      }
    ];
  } else {
    const gateArrivalAnchor = office.targetGateArrivalTime || "08:30";
    const gateTurnstileTime = subtractMinutesFromTime(gateArrivalAnchor, arrivalBuffer);
    const lockerRefuelEnd = addMinutesToTime(gateArrivalAnchor, office.lockerRefuelMinutes || 10);
    steps = [
      {
        id: "wake-prep",
        time: wakeUpTime,
        title: isFr ? "R\xE9veil & Hydratation Matinale" : "Wake Up & Hydration Primer",
        location: isFr ? "Domicile" : "Home Base",
        category: "prep",
        isCrucialCheckpoint: false,
        description: isFr ? "Boire 300 ml d\u2019eau fra\xEEche avec une pinc\xE9e de sel. Mise en route." : "Drink 300ml fresh water with pinch of salt. Systems boot.",
        iconName: "AlarmClock"
      },
      {
        id: "pre-ride-fuel",
        time: preRideMealTime,
        title: isFr ? "Repas Allumage Pr\xE9-V\xE9lotaf" : "Pre-Ride Ignition Meal",
        location: isFr ? "Cuisine" : "Kitchen Counter",
        category: "nutrition",
        isCrucialCheckpoint: true,
        description: isFr ? "Baguette blanche grill\xE9e + miel de fleurs + double expresso. Z\xE9ro lait ni poudre." : "White toasted baguette + wildflower honey + double espresso. Zero milk/powders.",
        iconName: "Utensils"
      },
      {
        id: "garage-rollout",
        time: bikePrepTime,
        title: isFr ? "Contr\xF4le Poste de Pilotage & Pneus" : "Cockpit & Tire Pre-Flight Check",
        location: isFr ? "Garage / D\xE9part" : "Staging Area",
        category: "prep",
        isCrucialCheckpoint: false,
        description: isFr ? "V\xE9rifier pression des pneus, batteries feux/radar, bidons mont\xE9s et badge d\u2019acc\xE8s." : "Verify tire pressure, battery status, bottles mounted, badge secured.",
        iconName: "CheckCircle2"
      },
      {
        id: "hard-departure",
        time: hardDepartureTime,
        title: isFr ? "D\xC9PART IMP\xC9RATIF (Tol\xE9rance Z\xE9ro Retard)" : "HARD DEPARTURE (Zero Delay Tolerance)",
        location: isFr ? "Point de D\xE9part" : "Rollout Point",
        category: "ride",
        isCrucialCheckpoint: true,
        description: isFr ? `D\xE9part \xE0 l'allure cible (${route.targetSpeedKmH} km/h). Marge vent de face : +${weatherHeadwindImpactMinutes}m.` : `Roll out at target pace (${route.targetSpeedKmH} km/h). Headwind buffer: +${weatherHeadwindImpactMinutes}m.`,
        iconName: "Navigation"
      },
      {
        id: "estuary-transit",
        time: addMinutesToTime(hardDepartureTime, Math.round(totalRideMinutes * 0.45)),
        title: isFr ? "Secteur Allure & Travers\xE9e Expos\xE9e" : "Transit Corridor Pacing Sector",
        location: isFr ? "Corridor Ouvert" : "Open Corridor",
        category: "ride",
        isCrucialCheckpoint: false,
        description: weather.isHeadwindActive ? isFr ? `Vent de face d\xE9tect\xE9 (${windKmh} km/h). Position a\xE9ro sur les cocottes pour \xE9conomiser ~${Math.round(windKmh * 3.5)}W.` : `Headwind detected (${windKmh} km/h). Hold aero tuck to conserve ~${Math.round(windKmh * 3.5)}W.` : isFr ? "Vent calme sur le parcours. Cadence d\u2019endurance r\xE9guli\xE8re (88\u201392 tr/min)." : "Corridor calm. Cruise at steady endurance cadence (88-92 RPM).",
        iconName: "Wind"
      },
      {
        id: "gate-security",
        time: gateTurnstileTime,
        title: isFr ? `Arriv\xE9e au Portillon S\xE9curit\xE9 (${localizedGate})` : `Arrival at Security Perimeter (${localizedGate})`,
        location: localizedGate,
        category: "transit",
        isCrucialCheckpoint: true,
        description: isFr ? `Scan du badge \xE0 ${localizedGate}. Stationnement s\xE9curis\xE9 au parking v\xE9lo.` : `Badge scan at ${localizedGate}. Lock bike in secure facility.`,
        iconName: "ShieldCheck"
      },
      {
        id: "locker-refuel",
        time: gateArrivalAnchor,
        title: isFr ? "Ravito Phase 1 au Vestiaire" : "Phase 1 Locker Refuel",
        location: isFr ? "Vestiaires" : "Locker Area",
        category: "nutrition",
        isCrucialCheckpoint: true,
        description: isFr ? "Recharge glyc\xE9mique et prot\xE9in\xE9e rapide avant la douche." : "Fast glycemic reload before shower.",
        iconName: "Zap"
      },
      {
        id: "shower-groom",
        time: lockerRefuelEnd,
        title: isFr ? "Douche & Tenue de Travail" : "Shower & Clean Kit Change",
        location: isFr ? "Douches Vestiaires" : "Locker Showers",
        category: "office",
        isCrucialCheckpoint: false,
        description: isFr ? "Douche et passage en tenue de bureau propre." : "Shower and swap into work attire.",
        iconName: "ShowerHead"
      },
      {
        id: "shift-start",
        time: office.shiftStartTime || "09:00",
        title: isFr ? "Prise de Poste / Bureau" : "Shift Start / On-Desk Presence",
        location: isFr ? "Poste de Travail" : "Work Desk",
        category: "office",
        isCrucialCheckpoint: true,
        description: isFr ? "Installation au poste \xE0 l\u2019heure, ravitaill\xE9 et pr\xEAt pour la journ\xE9e." : "Arrive composed, fully fueled, and ready for work.",
        iconName: "Briefcase"
      }
    ];
  }
  const totalDoorToDeskMinutes = 60 + totalRideMinutes + routeBuffer + arrivalBuffer + 30;
  return {
    shiftStartTime: office.shiftStartTime || targetArrival,
    gateArrivalTime: targetArrival,
    hardDepartureTime,
    preRideMealTime,
    wakeUpTime,
    totalDoorToDeskMinutes,
    pureMovingMinutes: rawMovingMinutes,
    bufferMinutes: routeBuffer + arrivalBuffer + weatherHeadwindImpactMinutes,
    steps,
    weatherHeadwindImpactMinutes
  };
}

// src/types/trip.ts
function generateTripChecklist(tag = "V\xC9LOTAF", distanceKm = 35, weather, options) {
  const isFr = options?.lang === "fr";
  const t = (tag || "").toUpperCase();
  const isEscapade = t.includes("ESCAPADE") || t.includes("HOTEL") || t.includes("LEISURE") || t.includes("TOURING");
  const isSport = t.includes("SPORT") || t.includes("TRAINING") || t.includes("RACE");
  const isBikepacking = t.includes("BIKEPACKING") || t.includes("TOUR");
  const bar = distanceKm > 60 ? "3.0" : "3.2";
  const items = [
    {
      id: "mech-pressure",
      label: isFr ? `Pression des pneus calibr\xE9e \xE0 ${bar.replace(".", ",")} bar` : `Tire pressure calibrated to ${bar} bar`,
      checked: false,
      category: "mechanics",
      critical: true
    },
    {
      id: "mech-spares",
      label: isFr ? distanceKm > 50 ? "Multi-outil, 2 d\xE9monte-pneus, chambre \xE0 air & mini-pompe (kit anti-cr\xE8ve)" : "Multi-outil & kit anti-cr\xE8ve (chambre \xE0 air)" : distanceKm > 50 ? "Multi-tool, 2x tire levers, spare tube & mini pump" : "Multi-tool & spare tube",
      checked: false,
      category: "mechanics",
      critical: true
    }
  ];
  if (options?.includePunctureKit) {
    items.push({
      id: "mech-puncture-kit",
      label: isFr ? "Kit anti-cr\xE8ve renforc\xE9 : m\xE8ches tubeless, cartouche CO2 & chambre \xE0 air" : "Full anti-puncture kit: tubeless plugs, CO2 cartridge & spare tube",
      checked: false,
      category: "mechanics",
      critical: true
    });
  }
  if (weather?.temperatureC !== void 0 && weather.temperatureC < 9) {
    items.push({
      id: "gear-thermal",
      label: isFr ? "Gants thermiques coupe-vent & tour de cou" : "Thermal windproof gloves & neck gaiter",
      checked: false,
      category: "gear",
      critical: true
    });
  }
  if (isEscapade) {
    items.push(
      { id: "esc-id", label: isFr ? "Confirmation de r\xE9servation d'h\xF4tel & pi\xE8ce d'identit\xE9" : "Hotel reservation booking & national ID", checked: false, category: "logistics", critical: true },
      { id: "esc-clothes", label: isFr ? "Tenue civile pour le soir & chaussures de marche l\xE9g\xE8res" : "Casual off-bike evening clothes & walking shoes", checked: false, category: "gear", critical: true },
      { id: "esc-charge", label: isFr ? "Chargeur t\xE9l\xE9phone & batterie externe" : "Phone charger & portable power bank", checked: false, category: "gear", critical: true },
      { id: "esc-lock", label: isFr ? "Antivol compact pour le local v\xE9lo de l\u2019h\xF4tel" : "Compact bike lock for hotel storage", checked: false, category: "mechanics", critical: true },
      { id: "esc-fuel", label: isFr ? distanceKm > 40 ? "2 bidons de 650 ml + encas ravito" : "1 bidon + encas ravito" : distanceKm > 40 ? "2x 650ml bidons + energy snacks" : "1x Bidon + snack", checked: false, category: "nutrition", critical: true },
      { id: "esc-lights", label: isFr ? "\xC9clairage avant & feu arri\xE8re flash de s\xE9curit\xE9" : "Front headlight & rear safety flasher", checked: false, category: "mechanics", critical: true }
    );
  } else if (isSport) {
    items.push(
      { id: "sport-fuel", label: isFr ? "Boisson glucidique en bidons (~60g/h) & gels ravito" : "Carb mix in bottles (~60g/hr) & energy gels", checked: false, category: "nutrition", critical: true },
      { id: "sport-computer", label: isFr ? "Compteur GPS synchronis\xE9 avec capteurs" : "GPS computer synced with sensors", checked: false, category: "gear", critical: true },
      { id: "sport-kit", label: isFr ? "Tenue a\xE9ro ajust\xE9e & gilet coupe-vent l\xE9ger" : "Aero kit & lightweight wind gilet", checked: false, category: "gear", critical: true },
      { id: "sport-plugs", label: isFr ? "Kit m\xE8ches tubeless anti-cr\xE8ve & gonfleur CO2" : "Tubeless plug kit & CO2 inflator", checked: false, category: "mechanics", critical: true }
    );
  } else if (isBikepacking) {
    items.push(
      { id: "bp-sleep", label: isFr ? "Sac de bivouac / tente compacte & matelas isolant" : "Bivouac bag / compact tent & sleeping pad", checked: false, category: "gear", critical: true },
      { id: "bp-power", label: isFr ? "Batterie externe haute capacit\xE9 20 000 mAh & c\xE2bles" : "High-capacity 20,000mAh power bank & cables", checked: false, category: "gear", critical: true },
      { id: "bp-water", label: isFr ? "Flasque filtrante + capacit\xE9 hydrique de 2 L" : "Water filtration flask + 2L hydration capacity", checked: false, category: "nutrition", critical: true },
      { id: "bp-chain", label: isFr ? "D\xE9rive-cha\xEEne, maillons rapides & patte de d\xE9railleur" : "Chain tool, quick-links & spare hanger", checked: false, category: "mechanics", critical: true }
    );
  } else {
    items.push(
      { id: "com-badge", label: isFr ? "Badge d'acc\xE8s entreprise & identifiants" : "Facility security badge & credentials", checked: false, category: "logistics", critical: true },
      { id: "com-laptop", label: isFr ? "Ordinateur portable pro & chargeur USB-C" : "Work laptop & USB-C charger", checked: false, category: "gear", critical: true },
      { id: "com-clothes", label: isFr ? "Tenue de travail propre rang\xE9e en sac \xE9tanche" : "Clean work clothes packed in dry-bag", checked: false, category: "gear", critical: true },
      { id: "com-shower", label: isFr ? "Trousse de douche & serviette microfibre s\xE9chage rapide" : "Shower kit & microfiber quick-dry towel", checked: false, category: "gear", critical: true },
      { id: "com-lock", label: isFr ? "Antivol U haute s\xE9curit\xE9 pour le parking v\xE9lo" : "Heavy-duty U-Lock for bike shelter", checked: false, category: "mechanics", critical: true },
      { id: "com-recovery", label: isFr ? "Ravito de r\xE9cup\xE9ration vestiaire pr\xEAt dans le sac" : "Post-arrival recovery nutrition packed", checked: false, category: "nutrition", critical: true }
    );
  }
  if (options?.includeExtraRavito) {
    items.push({
      id: "ravito-extra",
      label: isFr ? "Rations ravito suppl\xE9mentaires (p\xE2tes de fruits, dattes & \xE9lectrolytes)" : "Extra whole-food fueling rations & electrolytes packed",
      checked: false,
      category: "nutrition",
      critical: false
    });
  }
  return items;
}

// src/utils/nlpParser.ts
function parseDecimal(raw) {
  return parseFloat(raw.replace(",", "."));
}
function cleanPlacePhrase(raw) {
  let cleaned = raw.trim().replace(/^[,.;:!\-–—]+|[,.;:!\-–—]+$/g, "").trim();
  const venuePrefixMatch = cleaned.match(
    /^(?:(?:un|une|le|la|l'|l’|mon|notre|the|a|an)\s+)?(?:h[ôo]tel|bivouac|camp(?:ing)?|g[îi]te|auberge|bistro|resto|restaurant|bureau|travail|boulot)\s+(?:à|a|au|aux|de\s+la|du|des|de|d'|d’|en|in|at|near)\s+(.+)$/i
  );
  if (venuePrefixMatch) {
    cleaned = venuePrefixMatch[1].trim();
  }
  const venueSuffixMatch = cleaned.match(/^(.+?)\s+(?:h[ôo]tel|bivouac)$/i);
  if (venueSuffixMatch && venueSuffixMatch[1].trim().length >= 2) {
    cleaned = venueSuffixMatch[1].trim();
  }
  if (cleaned.length > 0 && cleaned === cleaned.toLowerCase()) {
    cleaned = cleaned.split(/(\s+|-)/).map((part) => {
      if (/^[a-zà-ÿ]+$/i.test(part) && !["de", "du", "des", "sur", "en", "sous"].includes(part.toLowerCase())) {
        return part.charAt(0).toUpperCase() + part.slice(1);
      }
      return part;
    }).join("");
  }
  return cleaned;
}
function parseTripDescription(text, baseTrip, lang = getCurrentLanguage()) {
  const isFr = lang === "fr";
  const lower = text.toLowerCase();
  const norm = lower.replace(/[’‘]/g, "'").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const currentYear = (/* @__PURE__ */ new Date()).getFullYear();
  const parsedValues = {
    physics: { ...baseTrip?.physics || {} },
    route: { ...baseTrip?.route || {} },
    office: { ...baseTrip?.office || {} },
    weather: { ...baseTrip?.weather || {} }
  };
  const detected = {};
  const extractedSummary = [];
  const monthMap = {
    jan: 1,
    janv: 1,
    january: 1,
    janvier: 1,
    feb: 2,
    fev: 2,
    fevr: 2,
    february: 2,
    fevrier: 2,
    mar: 3,
    march: 3,
    mars: 3,
    apr: 4,
    avr: 4,
    april: 4,
    avril: 4,
    may: 5,
    mai: 5,
    jun: 6,
    june: 6,
    juin: 6,
    jul: 7,
    juil: 7,
    july: 7,
    juillet: 7,
    aug: 8,
    august: 8,
    aout: 8,
    sep: 9,
    sept: 9,
    september: 9,
    septembre: 9,
    oct: 10,
    october: 10,
    octobre: 10,
    nov: 11,
    november: 11,
    novembre: 11,
    dec: 12,
    december: 12,
    decembre: 12
  };
  const monthNamesPattern = Object.keys(monthMap).sort((a, b) => b.length - a.length).join("|");
  function parseTimeString(timeStr, meridian) {
    if (!timeStr) return null;
    const trimmed = timeStr.trim().toLowerCase();
    if (trimmed === "midi" || trimmed === "noon") return "12:00";
    if (trimmed === "minuit" || trimmed === "midnight") return "00:00";
    let hours = 0;
    let minutes = 0;
    const hFormat = trimmed.match(/^(\d{1,2})\s*h(?:\s*(\d{2}))?$/i);
    const colonFormat = trimmed.match(/^(\d{1,2})\s*:\s*(\d{2})$/);
    const plainH = trimmed.match(/^(\d{1,2})$/);
    if (hFormat) {
      hours = parseInt(hFormat[1], 10);
      minutes = hFormat[2] ? parseInt(hFormat[2], 10) : 0;
    } else if (colonFormat) {
      hours = parseInt(colonFormat[1], 10);
      minutes = parseInt(colonFormat[2], 10);
    } else if (plainH) {
      hours = parseInt(plainH[1], 10);
      minutes = 0;
    } else {
      return null;
    }
    if (meridian) {
      const mer = meridian.toLowerCase();
      if (mer === "pm" && hours < 12) hours += 12;
      if (mer === "am" && hours === 12) hours = 0;
    } else if (/après-midi|apres-midi|du\s+soir/.test(norm) && hours >= 1 && hours <= 11) {
      hours += 12;
    }
    if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;
    return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}`;
  }
  const speedMatch = norm.match(
    /(?:cruising\s*(?:speed|pace)?\s*(?:would\s+be|is|around|at)?|target\s*(?:speed|pace)\s*(?:of|is|at)?|vitesse\s*(?:de\s*croisiere|cible|moyenne)?\s*(?:de|d'|a|autour\s*de|environ)?|allure\s*(?:cible|moyenne|de\s*croisiere)?\s*(?:de|d'|a|autour\s*de|environ)?|moyenne\s*(?:de|d'|a)?|rythme\s*(?:de|d'|a)?|speed\s*(?:of|is|around)?|pace\s*(?:of|is|around)?|holding\s*|rouler\s*a\s*|a\s*|at\s*)(\d+(?:[.,]\d+)?)\s*(?:km\s*\/\s*h|kph|kmh)\b/i
  ) || norm.match(/(\d+(?:[.,]\d+)?)\s*(?:km\s*\/\s*h|kph|kmh)\b/i) || norm.match(
    /\b(?:target\s*speed|cruising\s*speed|vitesse\s*(?:cible|moyenne|de\s*croisiere)|allure\s*(?:cible|moyenne)?|moyenne\s*de|rythme\s*de)\s*(?:is|of|at|around|de|d'|a)?\s*(\d+(?:[.,]\d+)?)\b/i
  );
  let targetSpeed = baseTrip?.route?.targetSpeedKmH || 25;
  if (speedMatch) {
    const val = parseDecimal(speedMatch[1]);
    if (val >= 10 && val <= 60) {
      targetSpeed = val;
      parsedValues.route.targetSpeedKmH = val;
      detected.speed = val;
      extractedSummary.push(`Target Speed: ${val} km/h`);
    }
  }
  const distMatch = norm.match(
    /(?:distance|route|ride|commute|length|parcours|trajet|etape|sortie|boucle)?\s*(?:of|is|around|over|for|de|d'|sur)?\s*(\d+(?:[.,]\d+)?)\s*(?:km|kilometers|kilometres|kilos|bornes)\b(?!\s*\/\s*h)/i
  ) || norm.match(/(\d+(?:[.,]\d+)?)\s*(?:km|kilometers|kilometres|kilos|bornes)\b(?!\s*\/\s*h)/i);
  let distanceKm = baseTrip?.route?.distanceKm || 35;
  if (distMatch) {
    const val = parseDecimal(distMatch[1]);
    if (val > 0 && val < 500) {
      distanceKm = val;
      parsedValues.route.distanceKm = val;
      detected.distance = val;
      extractedSummary.push(`Route Distance: ${val} km`);
    }
  }
  const riderMatch = norm.match(
    /\b(?:rider|cyclist|body|i\s+weigh|je\s+pese|pesant|mon\s+poids|cycliste|poids\s*du\s*cycliste)\s*(?:weight|mass|poids|est\s*de|de|is|around|of|a)?\s*(\d+(?:[.,]\d+)?)\s*kg\b/i
  ) || norm.match(/(\d+(?:[.,]\d+)?)\s*kg\s*(?:rider|cyclist|cycliste)\b/i);
  if (riderMatch) {
    const val = parseDecimal(riderMatch[1]);
    if (val >= 40 && val <= 160) {
      parsedValues.physics.riderWeightKg = val;
      detected.riderMass = val;
      extractedSummary.push(`Rider Mass: ${val} kg`);
    }
  }
  const bikeMatch = norm.match(
    /\b(?:bike|bicycle|gravel|frame|velo|monture)\s*(?:weight|mass|poids)?\s*(?:is|around|of|de|a)?\s*(\d+(?:[.,]\d+)?)\s*kg\b/i
  ) || norm.match(/(\d+(?:[.,]\d+)?)\s*kg\s*(?:bike|bicycle|gravel|frame|velo|monture)\b/i);
  if (bikeMatch) {
    const val = parseDecimal(bikeMatch[1]);
    if (val >= 4 && val <= 35) {
      parsedValues.physics.bikeWeightKg = val;
      detected.bikeMass = val;
      extractedSummary.push(`Bike Mass: ${val} kg`);
    }
  }
  const zeroCargo = /\b(?:zero\s*(?:bag|sac)s?|no\s*bags?|nothing\s*on\s*(?:the\s*)?bike|without\s*(?:bags?|luggage)|sans\s*(?:bagages?|sacoches?|sacs?|chargement)|a\s*vide|0\s*kg\s*(?:gear|backpack|bags?|sac|sacoches?|bagages?))\b/i.test(
    norm
  );
  const gearMatch = norm.match(
    /\b(?:gear|backpack|kit|luggage|panniers?|bags?|cargo|sac(?:\s*a\s*dos)?|sacoches?|bagages?|chargement|equipement|matos|affaires)\s*(?:weight|mass|poids)?\s*(?:is|around|of|de|a)?\s*(\d+(?:[.,]\d+)?)\s*kg\b/i
  ) || norm.match(
    /\b(?:carrying|hauling|with|pack(?:ing)?|setup\s*with|avec|portant|charge\s*de)\s*(\d+(?:[.,]\d+)?)\s*kg\b/i
  ) || norm.match(
    /(\d+(?:[.,]\d+)?)\s*kg\s*(?:of\s*|de\s*|d')?(?:gear|backpack|kit|luggage|panniers?|bags?|cargo|tent|sac(?:\s*a\s*dos)?|sacoches?|bagages?|chargement|equipement|matos|affaires)\b/i
  );
  if (zeroCargo) {
    parsedValues.physics.gearWeightKg = 0;
    detected.cargo = 0;
    extractedSummary.push(`Gear/Backpack Mass: 0 kg`);
  } else if (gearMatch) {
    const val = parseDecimal(gearMatch[1]);
    if (val >= 0 && val <= 40) {
      parsedValues.physics.gearWeightKg = val;
      detected.cargo = val;
      extractedSummary.push(`Gear/Backpack Mass: ${val} kg`);
    }
  }
  const gateRegex = /\b(?:(north|south|east|west|main|nord|sud|est|ouest|principale?)\s+)?(gate|porte|portillon|entrance|acces|entree)(?:\s+(\d+[a-z\-]?|[a-z]\b))?\b/i;
  const rawGateMatch = norm.match(gateRegex);
  if (rawGateMatch && rawGateMatch[3]) {
    const direction = rawGateMatch[1];
    const noun = rawGateMatch[2].toLowerCase();
    const id = rawGateMatch[3].toUpperCase();
    const isFrenchNoun = ["porte", "portillon", "acces", "entree"].includes(noun) || isFr;
    const baseLabel = isFrenchNoun ? "Porte" : "Gate";
    const gateName = direction ? `${direction.charAt(0).toUpperCase() + direction.slice(1).toLowerCase()} ${baseLabel} ${id}` : `${baseLabel} ${id}`;
    parsedValues.office.gateName = gateName;
    detected.gate = gateName;
    extractedSummary.push(`Checkpoint: ${gateName}`);
  } else if (/\b(?:gate|portillon)\b/i.test(norm) && rawGateMatch) {
    const direction = rawGateMatch[1];
    const gateName = direction ? `${direction.charAt(0).toUpperCase() + direction.slice(1).toLowerCase()} ${isFr ? "Porte" : "Gate"}` : isFr ? "Porte" : "Gate";
    parsedValues.office.gateName = gateName;
    detected.gate = gateName;
    extractedSummary.push(`Checkpoint: ${gateName}`);
  }
  const explicitBufferMatch = norm.match(
    /(?:(\d{1,2})\s*-?\s*(?:minute|min)s?\s*(?:de\s*)?(?:buffer|marge|securite)|(?:buffer|marge(?:\s*de\s*securite)?)\s*(?:of|de)?\s*(\d{1,2})\s*(?:min|minutes?))/i
  );
  let extraBufferMinutes = 0;
  if (/\b(?:ravitos?|ravitaillements?|pause\s+cafe|arret\s+boulangerie)\b/i.test(norm)) {
    const ravitoMinMatch = norm.match(
      /\b(?:pause\s+|arret\s+)?(?:ravitos?|ravitaillements?|pause\s+cafe)\s*(?:de|d'|of|for)?\s*(\d{1,2})\s*(?:min|minutes?|m\b)/i
    ) || norm.match(
      /(\d{1,2})\s*(?:min|minutes?)\s*(?:de\s*)?(?:pause\s+)?(?:ravitos?|ravitaillements?)/i
    );
    if (/\b(?:ravitos?|ravitaillements?)\s+(?:au\s+)?(?:vestiaires?|lockers?)\b/i.test(norm)) {
      const mins = ravitoMinMatch ? parseInt(ravitoMinMatch[1], 10) : 10;
      parsedValues.office.lockerRefuelMinutes = mins;
      detected.ravito = isFr ? `Vestiaire (${mins}m)` : `Locker (${mins}m)`;
    } else if (ravitoMinMatch) {
      const mins = parseInt(ravitoMinMatch[1], 10);
      extraBufferMinutes += mins;
      detected.ravito = `+${mins} min`;
      detected.includeExtraRavito = true;
    } else if (/\bsans\s+ravito\b/i.test(norm)) {
      detected.ravito = isFr ? "Sans arr\xEAt" : "Non-stop";
    } else {
      extraBufferMinutes += 10;
      detected.ravito = isFr ? "Pr\xE9vu (+10m)" : "Planned (+10m)";
      detected.includeExtraRavito = true;
    }
    extractedSummary.push(`Fueling / Ravito: ${detected.ravito}`);
  }
  if (/\b(?:anti[\s\-]?creve|anti[\s\-]?crevaison|creves?|crevaisons?|crever|kit\s+meches|chambre\s+a\s+air|puncture|flat\s+tire)\b/i.test(
    norm
  )) {
    detected.includePunctureKit = true;
    const creveMinMatch = norm.match(
      /(?:marge|buffer)?\s*(?:anti[\s\-]?creve|anti[\s\-]?crevaison|en\s+cas\s+de\s+creve|creve|crevaison)\s*(?:de|of)?\s*(\d{1,2})\s*(?:min|minutes?|m\b)/i
    ) || norm.match(
      /(\d{1,2})\s*(?:min|minutes?)\s*(?:de\s+marge\s+)?(?:anti[\s\-]?creve|en\s+cas\s+de\s+creve|creve|crevaison)/i
    );
    if (creveMinMatch) {
      const mins = parseInt(creveMinMatch[1], 10);
      extraBufferMinutes += mins;
      detected.puncturePrep = `+${mins} min`;
    } else if (/\b(?:marge|en\s+cas\s+de|risque\s+de|buffer)\b.*?\b(?:creve|crevaison|puncture)\b/i.test(norm)) {
      extraBufferMinutes += 10;
      detected.puncturePrep = isFr ? "Marge +10m & kit" : "+10m & kit";
    } else {
      detected.puncturePrep = isFr ? "Kit anti-cr\xE8ve" : "Puncture kit";
    }
    extractedSummary.push(`Puncture Prep: ${detected.puncturePrep}`);
  }
  const baseBufferMinutes = explicitBufferMatch ? parseInt(explicitBufferMatch[1] || explicitBufferMatch[2], 10) : 15;
  const totalBufferMinutes = baseBufferMinutes + extraBufferMinutes;
  if (extraBufferMinutes > 0) {
    parsedValues.route.urbanTrafficDelayMinutes = (baseTrip?.route?.urbanTrafficDelayMinutes ?? 8) + extraBufferMinutes;
  }
  const timeSearchText = norm.replace(
    /\b(?:(?:north|south|east|west|main|nord|sud|est|ouest)\s+)?(gate|porte|portillon|entrance)(?:\s+(\d+[a-z\-]?|[a-z]\b))?\b/gi,
    "gate_checkpoint"
  );
  const timeTokenPattern = `(midi|minuit|noon|midnight|\\d{1,2}(?:\\s*:\\s*\\d{2}|\\s*h(?:\\s*\\d{2})?(?!\\s*\\/)|(?=\\s*(?:am|pm)\\b|\\b)))(?!\\d|\\s*(?:[.,]\\d|\\/|km|kph|kmh|kilo|bornes|kg|g\\b|w\\b|watt|min|sec|%|\xB0|deg|bar|ans\\b|jours?\\b|${monthNamesPattern}))\\s*(am|pm)?`;
  const depRegex = new RegExp(
    `\\b(?:roll(?:ing)?\\s*out|leav(?:e|ing)|depart(?:ing|ure)?|out\\s*the\\s*door|setting\\s*off|take-?off|partir|je\\s+pars|on\\s+part|en\\s+partant|decollage|mise\\s+en\\s+route)\\s*(?:imperativement\\s+|prevu\\s+|vers\\s+|autour\\s+de\\s+|at\\s+|around\\s+|by\\s+|d[e']s\\s+|pour\\s+|a\\s+)?${timeTokenPattern}`,
    "i"
  );
  const depMatch = timeSearchText.match(depRegex);
  const arrRegex = new RegExp(
    `\\b(?:check\\s*-?\\s*in|enregistrement|arriv(?:e|ing|al|ee|er)|etre\\s+(?:arrive|la|sur\\s+place)|reach(?:ing)?|rendez\\s*-?\\s*vous|rdv|reunion|hotel\\s*by|bistro\\s*by|reservation|meeting|appointment|at\\s*gate_checkpoint)(?:\\s+(?:prevu(?:e)?|imperative(?:ment)?|strictly))?(?:\\s+(?:at|a|au|aux|en|in|to)\\s+(?:gate_checkpoint|(?:(?:un|une|le|la|mon|notre|the)\\s+|l')?(?!midi\\b|minuit\\b|noon\\b|midnight\\b)[a-z'\u2019_\\-]{2,24}))?\\s*(?:is\\s*(?:at|by)?|strictly\\s*(?:at|by)?|by|at|around|before|for|vers|avant|pour|d[e']s|a)?\\s*${timeTokenPattern}`,
    "i"
  );
  const arrMatch = timeSearchText.match(arrRegex);
  const shiftAfterKeyword = new RegExp(
    `\\b(?:prise\\s+de\\s+poste|embauche|debut\\s+(?:du\\s+)?(?:travail|poste|service)|shift|work|office|desk|bureau|boulot|taf)\\s*(?:starts?|lock|badge\\s*in)?\\s*(?:strictly|by|at|is\\s*(?:at|by)?|prevu(?:e)?\\s*a|avant|pour|a)\\s*${timeTokenPattern}`,
    "i"
  );
  const shiftBeforeKeyword = new RegExp(
    `${timeTokenPattern}\\s*(?:shift|work|prise\\s+de\\s+poste)`,
    "i"
  );
  const shiftMatch = timeSearchText.match(shiftAfterKeyword) || timeSearchText.match(shiftBeforeKeyword);
  let explicitDepTime = null;
  let explicitArrTime = null;
  let explicitShiftTime = null;
  if (depMatch) {
    explicitDepTime = parseTimeString(depMatch[1], depMatch[2]);
  }
  if (arrMatch) {
    explicitArrTime = parseTimeString(arrMatch[1], arrMatch[2]);
  }
  if (shiftMatch) {
    explicitShiftTime = parseTimeString(shiftMatch[1], shiftMatch[2]);
  }
  if (!explicitDepTime) {
    if (norm.includes("quarter past seven") || norm.includes("7h et quart") || norm.includes("sept heures et quart")) {
      explicitDepTime = "07:15";
    } else if (norm.includes("quarter to eight") || norm.includes("8h moins le quart") || norm.includes("huit heures moins le quart")) {
      explicitDepTime = "07:45";
    }
  }
  const rideDurationMinutes = Math.round(distanceKm / targetSpeed * 60) + totalBufferMinutes;
  if (explicitDepTime) {
    parsedValues.departureTime = explicitDepTime;
    detected.rolloutTime = explicitDepTime;
    extractedSummary.push(`Rollout Time: ${explicitDepTime}`);
  }
  if (explicitArrTime) {
    parsedValues.office.targetGateArrivalTime = explicitArrTime;
    detected.arrivalTarget = explicitArrTime;
    extractedSummary.push(`Target Arrival: ${explicitArrTime}`);
  }
  if (explicitShiftTime) {
    parsedValues.office.shiftStartTime = explicitShiftTime;
    extractedSummary.push(`Shift Start: ${explicitShiftTime}`);
  }
  let effectiveArrTime = explicitArrTime;
  if (!effectiveArrTime && explicitShiftTime) {
    const [shH, shM] = explicitShiftTime.split(":").map(Number);
    let gateTotal = shH * 60 + shM - 30;
    if (gateTotal < 0) gateTotal += 24 * 60;
    const gH = Math.floor(gateTotal / 60);
    const gM = gateTotal % 60;
    effectiveArrTime = `${gH.toString().padStart(2, "0")}:${gM.toString().padStart(2, "0")}`;
    parsedValues.office.targetGateArrivalTime = effectiveArrTime;
    detected.arrivalTarget = effectiveArrTime;
    extractedSummary.push(`Target Gate Arrival: ${effectiveArrTime}`);
  }
  if (effectiveArrTime && !explicitDepTime) {
    const [arrH, arrM] = effectiveArrTime.split(":").map(Number);
    let depTotal = arrH * 60 + arrM - rideDurationMinutes;
    if (depTotal < 0) depTotal += 24 * 60;
    const depH = Math.floor(depTotal / 60);
    const depM = depTotal % 60;
    const calculatedDep = `${depH.toString().padStart(2, "0")}:${depM.toString().padStart(2, "0")}`;
    parsedValues.departureTime = calculatedDep;
    detected.rolloutTime = calculatedDep;
    extractedSummary.push(`Est. Rollout: ${calculatedDep}`);
  }
  if (explicitDepTime && !effectiveArrTime) {
    const [depH, depM] = explicitDepTime.split(":").map(Number);
    let arrTotal = depH * 60 + depM + rideDurationMinutes;
    if (arrTotal >= 24 * 60) arrTotal -= 24 * 60;
    const arrH = Math.floor(arrTotal / 60);
    const arrM = arrTotal % 60;
    const calculatedArr = `${arrH.toString().padStart(2, "0")}:${arrM.toString().padStart(2, "0")}`;
    parsedValues.office.targetGateArrivalTime = calculatedArr;
    parsedValues.office.shiftStartTime = calculatedArr;
    detected.arrivalTarget = calculatedArr;
    extractedSummary.push(`Est. Arrival: ${calculatedArr}`);
  }
  if (explicitArrTime && !explicitShiftTime) {
    parsedValues.office.shiftStartTime = explicitArrTime;
  }
  const monthFirstMatch = norm.match(
    new RegExp(
      `\\b(${monthNamesPattern})\\.?\\s+(\\d{1,2})(?:st|nd|rd|th|er|re|eme|e)?(?:,?\\s*(\\d{4}))?\\b`,
      "i"
    )
  );
  const dayFirstMatch = norm.match(
    new RegExp(
      `\\b(\\d{1,2})(?:st|nd|rd|th|er|re|eme|e)?\\s*(?:of\\s*)?(${monthNamesPattern})\\.?(?:,?\\s*(\\d{4}))?\\b`,
      "i"
    )
  );
  const isoDateMatch = norm.match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
  const slashDateMatch = norm.match(/\b(\d{1,2})[\/\-](\d{1,2})(?:[\/\-](\d{4}))?\b/) || norm.match(/\b(\d{1,2})\.(\d{1,2})\.(\d{4})\b/);
  let pYear = currentYear;
  let pMonth = null;
  let pDay = null;
  if (monthFirstMatch) {
    pMonth = monthMap[monthFirstMatch[1].toLowerCase()];
    pDay = parseInt(monthFirstMatch[2], 10);
    if (monthFirstMatch[3]) pYear = parseInt(monthFirstMatch[3], 10);
  } else if (dayFirstMatch) {
    pDay = parseInt(dayFirstMatch[1], 10);
    pMonth = monthMap[dayFirstMatch[2].toLowerCase()];
    if (dayFirstMatch[3]) pYear = parseInt(dayFirstMatch[3], 10);
  } else if (isoDateMatch) {
    pYear = parseInt(isoDateMatch[1], 10);
    pMonth = parseInt(isoDateMatch[2], 10);
    pDay = parseInt(isoDateMatch[3], 10);
  } else if (slashDateMatch) {
    pDay = parseInt(slashDateMatch[1], 10);
    pMonth = parseInt(slashDateMatch[2], 10);
    if (slashDateMatch[3]) pYear = parseInt(slashDateMatch[3], 10);
  } else if (norm.includes("apres-demain") || norm.includes("apres demain") || norm.includes("day after tomorrow")) {
    const d = /* @__PURE__ */ new Date();
    d.setDate(d.getDate() + 2);
    pYear = d.getFullYear();
    pMonth = d.getMonth() + 1;
    pDay = d.getDate();
  } else if (norm.includes("tomorrow") || norm.includes("demain")) {
    const tomorrow = /* @__PURE__ */ new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    pYear = tomorrow.getFullYear();
    pMonth = tomorrow.getMonth() + 1;
    pDay = tomorrow.getDate();
  } else if (norm.includes("today") || norm.includes("aujourd") || norm.includes("ce matin") || norm.includes("ce soir")) {
    const today = /* @__PURE__ */ new Date();
    pYear = today.getFullYear();
    pMonth = today.getMonth() + 1;
    pDay = today.getDate();
  } else {
    const weekdayMap = {
      sunday: 0,
      dimanche: 0,
      monday: 1,
      lundi: 1,
      tuesday: 2,
      mardi: 2,
      wednesday: 3,
      mercredi: 3,
      thursday: 4,
      jeudi: 4,
      friday: 5,
      vendredi: 5,
      saturday: 6,
      samedi: 6
    };
    const wdMatch = norm.match(
      /\b(lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/i
    );
    if (wdMatch) {
      const targetDow = weekdayMap[wdMatch[1].toLowerCase()];
      const d = /* @__PURE__ */ new Date();
      const currentDow = d.getDay();
      let delta = (targetDow - currentDow + 7) % 7;
      if (delta === 0) delta = 7;
      d.setDate(d.getDate() + delta);
      pYear = d.getFullYear();
      pMonth = d.getMonth() + 1;
      pDay = d.getDate();
    }
  }
  const monthShortFr = ["janv.", "f\xE9vr.", "mars", "avr.", "mai", "juin", "juil.", "ao\xFBt", "sept.", "oct.", "nov.", "d\xE9c."];
  const monthShortEn = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  if (pMonth && pDay && pMonth >= 1 && pMonth <= 12 && pDay >= 1 && pDay <= 31) {
    const formattedDate = `${pYear}-${pMonth.toString().padStart(2, "0")}-${pDay.toString().padStart(2, "0")}`;
    parsedValues.departureDate = formattedDate;
    detected.date = isFr ? `${pDay.toString().padStart(2, "0")} ${monthShortFr[pMonth - 1]} ${pYear}` : `${monthShortEn[pMonth - 1]} ${pDay.toString().padStart(2, "0")}, ${pYear}`;
    extractedSummary.push(`Departure Date: ${detected.date}`);
  }
  if (/\b(?:bikepack(?:ing)?|bivouac|multi-?day|tent|tente|towpath|self-?supported|autonomie|itinerance)\b/i.test(
    norm
  )) {
    parsedValues.tag = "BIKEPACKING";
    detected.tripMode = isFr ? "Bikepacking / Bivouac" : "Bikepacking / Adventure";
    extractedSummary.push(`Trip Mode: Bikepacking`);
  } else if (/\b(?:sport|gran\s*fondo|cyclosportive|peloton|tempo|paceline|zone\s*[345]|training|intervals?|fractionne|foncier|race|fast\s*sunrise|grinder|entrainement|course)\b/i.test(
    norm
  )) {
    parsedValues.tag = "SPORT";
    detected.tripMode = "Sport / Gran Fondo";
    extractedSummary.push(`Trip Mode: Sport / Gran Fondo`);
  } else if (/\b(?:escapade|hotel|check\s*-?\s*in|enregistrement|touring|cyclotourisme|bistro|dinner|diner|leisure|vacation|vacances|getaway|week\s*-?\s*end|echappee|sejour|gite|auberge)\b/i.test(
    norm
  )) {
    parsedValues.tag = "ESCAPADE";
    detected.tripMode = isFr ? "Escapade / S\xE9jour" : "Escapade / Leisure Stay";
    if (!detected.gate) {
      parsedValues.office.gateName = isFr ? "R\xE9ception H\xF4tel" : "Hotel Reception";
    }
    extractedSummary.push(`Trip Mode: Escapade`);
  } else if (/\b(?:commute|velotaf|taf|boulot|work|shift|office|desk|locker|vestiaire|badge|travail|bureau|prise\s+de\s+poste|embauche|domicile[\s\-]travail)\b/i.test(
    norm
  )) {
    parsedValues.tag = "V\xC9LOTAF";
    detected.tripMode = isFr ? "Mission V\xE9lotaf" : "Commute Mission";
    extractedSummary.push(`Trip Mode: Commute`);
  }
  const stopLookahead = `(?=$|[,.;!?]|\\s+(?:le\\s+(?:\\d|1er|premier|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|matin|soir)|ce\\s+(?:matin|soir|week)|demain|aujourd|apr[e\xE8]s-demain|apres-demain|tomorrow|today|lundi|mardi|mercredi|jeudi|vendredi|samedi|dimanche|on\\b|with\\b|without\\b|at\\b|by\\b|for\\b|around\\b|check\\s*-?\\s*in|enregistrement|arriv[e\xE9i]|rendez\\s*-?\\s*vous|rdv|partir|je\\s+pars|d[e\xE9]part|leaving|rolling|setting|prise\\s+de\\s+poste|embauche|pour\\s+un|pour\\s+une|[\xE0a]\\s*\\d|allure|vitesse|moyenne|rythme|pace|speed|cruising|target|avec|sans|sous|vent|headwind|ravito|marge|en\\s+\\d|sur\\s+\\d|\\d+\\s*(?:km|kg|h\\b)))`;
  const origDestRegex = new RegExp(
    `\\b(?:from|leaving\\s+from|starting\\s+from|depuis|au\\s+d[e\xE9]part\\s+de|partir\\s+de|en\\s+partant\\s+de|de)\\s+([A-Za-z\xC0-\xFF'\u2019\\- ]{2,40}?)\\s+(?:to|toward|towards|vers|jusqu'\xE0|jusqu\u2019\xE0|jusqu'a|direction|\xE0|a)\\s+([A-Za-z\xC0-\xFF'\u20190-9\\- ]{2,55}?)${stopLookahead}`,
    "i"
  );
  const destOnlyVerbRegex = new RegExp(
    `\\b(?:rouler|aller|p[e\xE9]daler|filer|sortie|balade|vir[e\xE9]e|escapade|week-?end|v[e\xE9]lotaf|velotaf|trajet|itin[e\xE9]raire|parcours|randonn[e\xE9]e|[e\xE9]tape|rendez-?vous|rdv|ride|riding|cycling|commut(?:e|ing)|heading|going|trip|tour)(?:\\s+[\xE0a]\\s+v[e\xE9]lo)?\\s+(?:to|toward|towards|vers|jusqu'\xE0|jusqu\u2019\xE0|jusqu'a|direction|sur|\xE0|a)\\s+([A-Za-z\xC0-\xFF'\u20190-9\\- ]{2,55}?)${stopLookahead}`,
    "i"
  );
  const destOnlyDirectRegex = new RegExp(
    `\\b(?:direction|cap\\s+sur|destination)\\s+([A-Za-z\xC0-\xFF'\u20190-9\\- ]{2,45}?)${stopLookahead}`,
    "i"
  );
  const nonPlaceWords = /^(?:vitesse|allure|moyenne|rythme|pause|marge|plus|moins|autour|environ|sac|sacoches?|bagages?|chargement|matos|[eé]quipement|velo|v[eé]lo|face|croisi[eè]re|pluie|\d)/i;
  const rawOrigDestMatch = text.match(origDestRegex);
  const origDestMatch = rawOrigDestMatch && !nonPlaceWords.test(rawOrigDestMatch[1].trim()) ? rawOrigDestMatch : null;
  const destVerbMatch = !origDestMatch ? text.match(destOnlyVerbRegex) : null;
  const destDirectMatch = !origDestMatch && !destVerbMatch ? text.match(destOnlyDirectRegex) : null;
  if (origDestMatch) {
    const orig = cleanPlacePhrase(origDestMatch[1]);
    const dest = cleanPlacePhrase(origDestMatch[2]);
    const isGateOnly = /^(?:gate|porte|portillon)\s*\d*$/i.test(dest);
    if (orig && dest && !isGateOnly) {
      parsedValues.route.origin = orig;
      parsedValues.route.destination = dest;
      parsedValues.name = isFr ? `${orig} \u2192 ${dest}` : `${orig} \u2192 ${dest} Tour`;
      detected.origin = orig;
      detected.destination = dest;
      extractedSummary.push(`Route: ${orig} \u2192 ${dest}`);
    }
  } else if (destVerbMatch || destDirectMatch) {
    const rawDest = (destVerbMatch ? destVerbMatch[1] : destDirectMatch[1]).trim();
    const dest = cleanPlacePhrase(rawDest);
    const isGateOnly = /^(?:gate|porte|portillon)\s*\d*$/i.test(dest);
    if (dest && !nonPlaceWords.test(dest) && !isGateOnly) {
      parsedValues.route.destination = dest;
      parsedValues.name = isFr ? parsedValues.tag === "ESCAPADE" ? `Escapade \xE0 ${dest}` : `Trajet vers ${dest}` : `Ride to ${dest}`;
      detected.destination = dest;
      extractedSummary.push(`Destination: ${dest}`);
    }
  }
  if (/\b(?:sans\s+vent|pas\s+de\s+vent|vent\s+calme|no\s+wind|calm\s+wind)\b/i.test(norm)) {
    parsedValues.weather.isHeadwindActive = false;
    parsedValues.weather.windDirection = "calm";
    parsedValues.weather.baseWindSpeedKmH = 2;
    detected.headwind = isFr ? "Calme" : "Calm";
    extractedSummary.push("Wind: Calm");
  } else if (norm.includes("headwind") || norm.includes("estuary wind") || norm.includes("vent de face") || norm.includes("vent contraire") || norm.includes("gusts") || norm.includes("rafales")) {
    parsedValues.weather.isHeadwindActive = true;
    parsedValues.weather.windDirection = "headwind";
    let windSpeed = 8;
    const m1 = norm.match(
      /(\d+(?:[.,]\d+)?)\s*(?:km\s*\/\s*h|kmh|kph)?\s*(?:de\s+)?(?:headwind|wind|gusts|vent(?:\s+de\s+face|\s+contraire)?|rafales)/i
    );
    const m2 = norm.match(
      /(?:headwind|wind|gusts|vent(?:\s+de\s+face|\s+contraire)?|rafales)\s*(?:of|de|d'|at|a|is|around)?\s*(\d+(?:[.,]\d+)?)\s*(?:km\s*\/\s*h|kmh|kph)?/i
    );
    if (m1) {
      windSpeed = parseDecimal(m1[1]);
    } else if (m2) {
      windSpeed = parseDecimal(m2[1]);
    }
    parsedValues.weather.baseWindSpeedKmH = windSpeed;
    detected.headwind = `${windSpeed} km/h`;
    extractedSummary.push(`Headwind: Active (${windSpeed} km/h)`);
  }
  const tempMatch = norm.match(/(-?\d{1,2})\s*(?:°\s*c?|degres?\b)/i);
  if (tempMatch) {
    const tempVal = parseInt(tempMatch[1], 10);
    if (tempVal >= -15 && tempVal <= 45) {
      parsedValues.weather.temperatureC = tempVal;
      extractedSummary.push(`Temperature: ${tempVal}\xB0C`);
    }
  }
  if (/\b(?:pluie|averses?|orage|rain|wet)\b/i.test(norm)) {
    const rainPctMatch = norm.match(/(\d{1,3})\s*%\s*(?:de\s*)?(?:pluie|rain)/i) || norm.match(/(?:pluie|rain)\s*(?:a\s*)?(\d{1,3})\s*%/i);
    parsedValues.weather.precipitationRiskPercent = rainPctMatch ? Math.min(100, parseInt(rainPctMatch[1], 10)) : 65;
  }
  if (norm.includes("no food") || norm.includes("open space") || norm.includes("desk policy") || norm.includes("pas de nourriture") || norm.includes("pas de bouffe") || norm.includes("pas de repas") || norm.includes("interdit de manger")) {
    parsedValues.office.strictNoFoodInOpenSpace = true;
    detected.strictFoodRule = true;
    extractedSummary.push(`Strict Office Rule: Desk food ban`);
  }
  return {
    parsedValues,
    detected,
    extractedSummary
  };
}

// src/services/weatherService.ts
function parseLocalDate(dateStr) {
  const parts = dateStr.split("-").map(Number);
  if (parts.length === 3 && !parts.some(Number.isNaN)) {
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }
  const fallback = new Date(dateStr);
  fallback.setHours(0, 0, 0, 0);
  return fallback;
}
function checkForecastHorizon(targetDateStr) {
  const now = /* @__PURE__ */ new Date();
  now.setHours(0, 0, 0, 0);
  const target = parseLocalDate(targetDateStr);
  target.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  const daysOffset = Math.round(diffMs / (1e3 * 60 * 60 * 24));
  const isAvailable = daysOffset >= -2 && daysOffset <= 14;
  return { isAvailable, daysOffset };
}
function calculateAirDensity(tempC, pressureHpa) {
  const tempK = tempC + 273.15;
  const pressurePa = pressureHpa * 100;
  const R_SPECIFIC = 287.058;
  const rho = pressurePa / (R_SPECIFIC * tempK);
  return Number(rho.toFixed(3));
}

// scripts/stressTestHarness.ts
var fs = __toESM(require("fs"), 1);
var path = __toESM(require("path"), 1);
if (typeof globalThis.localStorage === "undefined") {
  const store = {};
  globalThis.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, val) => {
      store[key] = String(val);
    },
    removeItem: (key) => {
      delete store[key];
    },
    clear: () => {
      for (const k in store) delete store[k];
    },
    key: (i) => Object.keys(store)[i] || null,
    length: 0
  };
}
var defaultTrip = {
  id: "base-trip",
  name: "Base Trip",
  tag: "V\xC9LOTAF",
  description: "Default test trip",
  createdAt: "2026-10-27T00:00:00Z",
  updatedAt: "2026-10-27T00:00:00Z",
  physics: {
    riderWeightKg: 74,
    bikeWeightKg: 9.4,
    gearWeightKg: 4.2,
    cda: 0.4,
    crr: 6e-3,
    rho: 1.225,
    drivetrainEfficiency: 0.95,
    grossMechanicalEfficiency: 0.21,
    gradientPercent: 0.3
  },
  route: {
    origin: "Nantes Quai",
    destination: "Gate 17 Campus",
    distanceKm: 22,
    targetSpeedKmH: 27.5,
    urbanTrafficDelayMinutes: 8,
    gateSecurityDelayMinutes: 5,
    coordinates: [
      [47.2184, -1.5536],
      [47.284, -2.208]
    ]
  },
  office: {
    shiftStartTime: "09:00",
    targetGateArrivalTime: "08:30",
    gateName: "Gate 17",
    lockerRefuelMinutes: 10,
    showerChangeMinutes: 10,
    breakRoomBreakfastMinutes: 15,
    strictNoFoodInOpenSpace: true,
    badgeRequiredForGate: true,
    notes: "Standard morning shift"
  },
  weather: {
    isHeadwindActive: true,
    baseWindSpeedKmH: 8,
    windDirection: "headwind",
    windDirectionDegrees: 245,
    temperatureC: 11,
    precipitationRiskPercent: 15,
    estuaryGustKmH: 14,
    visibilityKm: 12
  },
  checklist: generateTripChecklist("V\xC9LOTAF", 22)
};
function createScenario(id, name, category, overrides) {
  const trip = {
    ...defaultTrip,
    id: `scenario-${id}`,
    name,
    tag: overrides.tag || (category === "COMMUTE" ? "V\xC9LOTAF" : category),
    departureDate: overrides.departureDate,
    departureTime: overrides.departureTime,
    physics: { ...defaultTrip.physics, ...overrides.physics || {} },
    route: { ...defaultTrip.route, ...overrides.route || {} },
    office: { ...defaultTrip.office, ...overrides.office || {} },
    weather: { ...defaultTrip.weather, ...overrides.weather || {} },
    checklist: generateTripChecklist(
      overrides.tag || category,
      overrides.route?.distanceKm ?? defaultTrip.route.distanceKm,
      { ...defaultTrip.weather, ...overrides.weather || {} },
      { lang: overrides.lang || "en" }
    )
  };
  return {
    id,
    name,
    category,
    nlpPrompt: overrides.nlpPrompt,
    lang: overrides.lang || "en",
    trip
  };
}
var SCENARIOS = [
  // ══════════════════════════════════════════════════════════════════
  // GROUP 1: COMMUTE & STRICT OFFICE PROTOCOLS (1 to 25)
  // ══════════════════════════════════════════════════════════════════
  createScenario(1, "Baseline Estuary Commute (Gate 17)", "COMMUTE", {
    route: { distanceKm: 22, targetSpeedKmH: 27.5 },
    weather: { baseWindSpeedKmH: 8, isHeadwindActive: true },
    office: { shiftStartTime: "09:00", targetGateArrivalTime: "08:30", gateName: "Gate 17" }
  }),
  createScenario(2, "Early Dawn Commute (06:00 Shift)", "COMMUTE", {
    route: { distanceKm: 16, targetSpeedKmH: 25 },
    office: { shiftStartTime: "06:00", targetGateArrivalTime: "05:30", gateName: "North Gate" },
    weather: { baseWindSpeedKmH: 4, isHeadwindActive: false }
  }),
  createScenario(3, "Estuary Gale Surcharge (NO-GO Trigger)", "COMMUTE", {
    route: { distanceKm: 32, targetSpeedKmH: 24 },
    weather: { baseWindSpeedKmH: 34, estuaryGustKmH: 52, isHeadwindActive: true },
    office: { shiftStartTime: "09:00", targetGateArrivalTime: "08:30" }
  }),
  createScenario(4, "Estuary Strong Headwind Warning (CAUTION Trigger)", "COMMUTE", {
    route: { distanceKm: 26, targetSpeedKmH: 26 },
    weather: { baseWindSpeedKmH: 20, estuaryGustKmH: 32, isHeadwindActive: true },
    office: { shiftStartTime: "08:30", targetGateArrivalTime: "08:00" }
  }),
  createScenario(5, "Ultra-Short Urban Commute Sprint", "COMMUTE", {
    route: { distanceKm: 3.8, targetSpeedKmH: 22, urbanTrafficDelayMinutes: 5, gateSecurityDelayMinutes: 2 },
    office: { shiftStartTime: "09:00", targetGateArrivalTime: "08:45", lockerRefuelMinutes: 5, showerChangeMinutes: 5 }
  }),
  createScenario(6, "Long-Range Interurban Mega-Commute", "COMMUTE", {
    route: { distanceKm: 48, targetSpeedKmH: 29, urbanTrafficDelayMinutes: 12, gateSecurityDelayMinutes: 5 },
    weather: { baseWindSpeedKmH: 12, isHeadwindActive: true },
    office: { shiftStartTime: "09:00", targetGateArrivalTime: "08:20" }
  }),
  createScenario(7, "Heavy E-Commuter with Full Cargo Panniers", "COMMUTE", {
    physics: { bikeWeightKg: 24.5, gearWeightKg: 16, riderWeightKg: 82 },
    route: { distanceKm: 20, targetSpeedKmH: 22 },
    office: { shiftStartTime: "09:00", targetGateArrivalTime: "08:30" }
  }),
  createScenario(8, "Minimalist Fixie Courier Commute (Zero Cargo)", "COMMUTE", {
    physics: { bikeWeightKg: 7.8, gearWeightKg: 0, riderWeightKg: 70, cda: 0.36 },
    route: { distanceKm: 14, targetSpeedKmH: 28 },
    office: { shiftStartTime: "09:30", targetGateArrivalTime: "09:05" }
  }),
  createScenario(9, "Zero-Buffer High-Risk Commute", "COMMUTE", {
    route: { distanceKm: 22, targetSpeedKmH: 27, urbanTrafficDelayMinutes: 0, gateSecurityDelayMinutes: 0 },
    office: { shiftStartTime: "08:30", targetGateArrivalTime: "08:30" }
  }),
  createScenario(10, "Congested Urban Chokepoint (45m Traffic Delay)", "COMMUTE", {
    route: { distanceKm: 15, targetSpeedKmH: 20, urbanTrafficDelayMinutes: 45, gateSecurityDelayMinutes: 15 },
    office: { shiftStartTime: "09:00", targetGateArrivalTime: "08:30" }
  }),
  createScenario(11, "Sub-Zero Winter Commute (-6\xB0C)", "COMMUTE", {
    weather: { temperatureC: -6, baseWindSpeedKmH: 14, isHeadwindActive: true },
    physics: { rho: 1.32 },
    route: { distanceKm: 22, targetSpeedKmH: 25 }
  }),
  createScenario(12, "Summer Heatwave Commute (38\xB0C)", "COMMUTE", {
    weather: { temperatureC: 38, baseWindSpeedKmH: 6, isHeadwindActive: false },
    physics: { rho: 1.135 },
    route: { distanceKm: 24, targetSpeedKmH: 26 }
  }),
  createScenario(13, "Strict Subterranean Shelter Token (Gate 17)", "COMMUTE", {
    office: { gateName: "Porte 17 Sous-Sol", badgeRequiredForGate: true, strictNoFoodInOpenSpace: true },
    lang: "fr"
  }),
  createScenario(14, "Public Access Commute (No Badge Required)", "COMMUTE", {
    office: { gateName: "Public Bike Hub", badgeRequiredForGate: false, strictNoFoodInOpenSpace: false }
  }),
  createScenario(15, "Late Evening Shift Commute (22:00 Shift)", "COMMUTE", {
    office: { shiftStartTime: "22:00", targetGateArrivalTime: "21:30" },
    route: { distanceKm: 22, targetSpeedKmH: 26 }
  }),
  createScenario(16, "Midnight Graveyard Shift Commute (00:00 Shift)", "COMMUTE", {
    office: { shiftStartTime: "00:00", targetGateArrivalTime: "23:30" },
    route: { distanceKm: 25, targetSpeedKmH: 25 }
  }),
  createScenario(17, "Post-Midnight 01:15 Shift (Rollover Prior Day)", "COMMUTE", {
    office: { shiftStartTime: "01:15", targetGateArrivalTime: "00:45" },
    route: { distanceKm: 32, targetSpeedKmH: 26 }
  }),
  createScenario(18, "Early Morning 05:00 Shift (Pre-Dawn Rollout)", "COMMUTE", {
    office: { shiftStartTime: "05:00", targetGateArrivalTime: "04:30" },
    route: { distanceKm: 35, targetSpeedKmH: 26 }
  }),
  createScenario(19, "French Natural Language Commute Prompt", "COMMUTE", {
    nlpPrompt: "Je pars de Nantes pour aller au bureau Porte 17, arriv\xE9e 8h25, shift \xE0 9h, 22km \xE0 27 km/h avec 4kg de sacoche",
    lang: "fr"
  }),
  createScenario(20, "Bilingual Mixed Commute Prompt", "COMMUTE", {
    nlpPrompt: "V\xE9lotaf from Saint-Herblain to Gate 17, 18 km at 26km/h, vent de face 15 km/h, strict no food",
    lang: "en"
  }),
  createScenario(21, "Extended Executive Shower & Groom Protocol", "COMMUTE", {
    office: { showerChangeMinutes: 25, lockerRefuelMinutes: 15, breakRoomBreakfastMinutes: 20 },
    route: { distanceKm: 22, targetSpeedKmH: 27 }
  }),
  createScenario(22, "Ultra-Compressed 5-Minute Locker Turnaround", "COMMUTE", {
    office: { showerChangeMinutes: 5, lockerRefuelMinutes: 5, breakRoomBreakfastMinutes: 5 },
    route: { distanceKm: 18, targetSpeedKmH: 26 }
  }),
  createScenario(23, "Cross-Headwind Estuary Bridge Crossing", "COMMUTE", {
    weather: { windDirection: "cross-headwind", windDirectionDegrees: 270, baseWindSpeedKmH: 18, isHeadwindActive: true },
    route: { distanceKm: 24, targetSpeedKmH: 26 }
  }),
  createScenario(24, "Commute with NLP Puncture Margin & Tubeless Kit", "COMMUTE", {
    nlpPrompt: "Trajet v\xE9lotaf de 26 km \xE0 28 km/h, arriv\xE9e 8h30 Porte 4, pr\xE9voir marge anti-cr\xE8ve de 10 min et kit m\xE8ches",
    lang: "fr"
  }),
  createScenario(25, "Commute with Bakery Coffee Stop Added", "COMMUTE", {
    nlpPrompt: "Commute to Gate 17, 22km at 26 km/h, shift at 9am, pause caf\xE9 ravito 15 min",
    lang: "en"
  }),
  // ══════════════════════════════════════════════════════════════════
  // GROUP 2: SPORT, TEMPO & GRAN FONDO (26 to 50)
  // ══════════════════════════════════════════════════════════════════
  createScenario(26, "Standard Gran Fondo Fast Pace", "SPORT", {
    route: { distanceKm: 42, targetSpeedKmH: 31.5 },
    physics: { cda: 0.34, crr: 52e-4, drivetrainEfficiency: 0.97 },
    office: { shiftStartTime: "11:30", targetGateArrivalTime: "11:00", gateName: "Finish Line" }
  }),
  createScenario(27, "Elite Aero Time Trial Posture", "SPORT", {
    route: { distanceKm: 50, targetSpeedKmH: 38 },
    physics: { cda: 0.26, crr: 42e-4, drivetrainEfficiency: 0.97, grossMechanicalEfficiency: 0.23 },
    office: { targetGateArrivalTime: "10:00" }
  }),
  createScenario(28, "High Threshold Wattage Surge (>300W)", "SPORT", {
    route: { distanceKm: 35, targetSpeedKmH: 35 },
    physics: { cda: 0.38, gradientPercent: 1.2 },
    office: { targetGateArrivalTime: "09:30" }
  }),
  createScenario(29, "Gran Fondo Mountain Pass (6.5% Climbing)", "SPORT", {
    route: { distanceKm: 65, targetSpeedKmH: 21 },
    physics: { gradientPercent: 6.5, riderWeightKg: 68, bikeWeightKg: 7.5, gearWeightKg: 1.5 },
    office: { targetGateArrivalTime: "13:00" }
  }),
  createScenario(30, "Steep Wall Assault (12% Gradient Sector)", "SPORT", {
    route: { distanceKm: 12, targetSpeedKmH: 15 },
    physics: { gradientPercent: 12 },
    office: { targetGateArrivalTime: "11:00" }
  }),
  createScenario(31, "High-Speed Mountain Descent (-4% Gradient)", "SPORT", {
    route: { distanceKm: 30, targetSpeedKmH: 48 },
    physics: { gradientPercent: -4 },
    office: { targetGateArrivalTime: "14:00" }
  }),
  createScenario(32, "Metric Century Endurance (100 km)", "SPORT", {
    route: { distanceKm: 100, targetSpeedKmH: 29 },
    office: { targetGateArrivalTime: "13:30" }
  }),
  createScenario(33, "Double Metric Century Ultra (200 km)", "SPORT", {
    route: { distanceKm: 200, targetSpeedKmH: 28 },
    office: { targetGateArrivalTime: "16:00" }
  }),
  createScenario(34, "Blistering Summer Fast Sunrise Ride (34\xB0C)", "SPORT", {
    route: { distanceKm: 60, targetSpeedKmH: 33 },
    weather: { temperatureC: 34, baseWindSpeedKmH: 5 },
    physics: { rho: 1.15 }
  }),
  createScenario(35, "Freezing Winter Tempo Miles (-3\xB0C)", "SPORT", {
    route: { distanceKm: 70, targetSpeedKmH: 28 },
    weather: { temperatureC: -3, baseWindSpeedKmH: 15, isHeadwindActive: true },
    physics: { rho: 1.31 }
  }),
  createScenario(36, "Featherweight Climber on Carbon Superlight", "SPORT", {
    physics: { riderWeightKg: 52, bikeWeightKg: 6.1, gearWeightKg: 1.2, gradientPercent: 5 },
    route: { distanceKm: 45, targetSpeedKmH: 25 }
  }),
  createScenario(37, "Heavy Flatland Rouleur on Deep Section Wheels", "SPORT", {
    physics: { riderWeightKg: 94, bikeWeightKg: 8.2, gearWeightKg: 1.8, cda: 0.33 },
    route: { distanceKm: 65, targetSpeedKmH: 36 }
  }),
  createScenario(38, "Mud-Clogged Drivetrain Efficiency Drop (88%)", "SPORT", {
    physics: { drivetrainEfficiency: 0.88, crr: 75e-4 },
    route: { distanceKm: 50, targetSpeedKmH: 28 }
  }),
  createScenario(39, "Sub-Par Metabolic Efficiency Rider (17%)", "SPORT", {
    physics: { grossMechanicalEfficiency: 0.17 },
    route: { distanceKm: 40, targetSpeedKmH: 30 }
  }),
  createScenario(40, "World-Class Efficiency Pro (24% GME)", "SPORT", {
    physics: { grossMechanicalEfficiency: 0.24 },
    route: { distanceKm: 80, targetSpeedKmH: 35 }
  }),
  createScenario(41, "French Gran Fondo NLP Prompt with Noon Finish", "SPORT", {
    nlpPrompt: "Sortie gran fondo 55 km \xE0 32 km/h, arriv\xE9e midi, 2 bidons de ravito et kit anti-cr\xE8ve",
    lang: "fr"
  }),
  createScenario(42, "Sport Ride with Fast Sunrise NLP Phrasing", "SPORT", {
    nlpPrompt: "Fast sunrise tempo training ride, 65km at 33 km/h, finish at 10:30am, 2kg gear",
    lang: "en"
  }),
  createScenario(43, "High Altitude Pass Simulation (rho 0.95 kg/m\xB3)", "SPORT", {
    physics: { rho: 0.95, gradientPercent: 4.5 },
    route: { distanceKm: 45, targetSpeedKmH: 22 }
  }),
  createScenario(44, "Sea Level Dense Coastal Air (rho 1.26 kg/m\xB3)", "SPORT", {
    physics: { rho: 1.26 },
    route: { distanceKm: 50, targetSpeedKmH: 32 }
  }),
  createScenario(45, "Paceline Aerodynamic Drafting (CdA 0.22)", "SPORT", {
    physics: { cda: 0.22 },
    route: { distanceKm: 75, targetSpeedKmH: 37 }
  }),
  createScenario(46, "Violent Coastal Crosswind Blast (32 km/h wind)", "SPORT", {
    weather: { baseWindSpeedKmH: 32, estuaryGustKmH: 48, isHeadwindActive: true },
    route: { distanceKm: 40, targetSpeedKmH: 27 }
  }),
  createScenario(47, "Short Explosive Criterium Prep (15 km)", "SPORT", {
    route: { distanceKm: 15, targetSpeedKmH: 38 },
    office: { targetGateArrivalTime: "08:00" }
  }),
  createScenario(48, "Low-Intensity Zone 1 Recovery Spin", "SPORT", {
    route: { distanceKm: 25, targetSpeedKmH: 19 },
    physics: { cda: 0.42 },
    office: { targetGateArrivalTime: "16:00" }
  }),
  createScenario(49, "Combined 8% Gradient & 20 km/h Headwind", "SPORT", {
    physics: { gradientPercent: 8 },
    weather: { baseWindSpeedKmH: 20, isHeadwindActive: true },
    route: { distanceKm: 20, targetSpeedKmH: 16 }
  }),
  createScenario(50, "Evening Gran Fondo Finishing at Dusk (20:30)", "SPORT", {
    office: { shiftStartTime: "21:00", targetGateArrivalTime: "20:30" },
    route: { distanceKm: 70, targetSpeedKmH: 30 }
  }),
  // ══════════════════════════════════════════════════════════════════
  // GROUP 3: BIKEPACKING & MULTI-DAY EXPEDITION (51 to 70)
  // ══════════════════════════════════════════════════════════════════
  createScenario(51, "Loire Estuary 2-Day Adventure Stage 1", "BIKEPACKING", {
    route: { distanceKm: 68, targetSpeedKmH: 21 },
    physics: { gearWeightKg: 12, bikeWeightKg: 10.5, cda: 0.44, crr: 68e-4 },
    office: { targetGateArrivalTime: "18:00", shiftStartTime: "19:00", gateName: "Pornic Bivouac Cove" }
  }),
  createScenario(52, "Heavy Expedition Trans-Continental Rig", "BIKEPACKING", {
    physics: { bikeWeightKg: 14.5, gearWeightKg: 24, riderWeightKg: 85, cda: 0.48, crr: 85e-4 },
    route: { distanceKm: 85, targetSpeedKmH: 17.5 },
    office: { targetGateArrivalTime: "18:30" }
  }),
  createScenario(53, "Ultralight Fastpack Bivouac Setup", "BIKEPACKING", {
    physics: { bikeWeightKg: 9, gearWeightKg: 5.5, cda: 0.4, crr: 6e-3 },
    route: { distanceKm: 95, targetSpeedKmH: 24 },
    office: { targetGateArrivalTime: "19:00" }
  }),
  createScenario(54, "Chunky Gravel Knobby Tire Resistance (Crr 0.012)", "BIKEPACKING", {
    physics: { crr: 0.012, gearWeightKg: 14 },
    route: { distanceKm: 48, targetSpeedKmH: 16.5 },
    office: { targetGateArrivalTime: "17:30" }
  }),
  createScenario(55, "Sunset Dusk Cutoff Rush (Target 17:45)", "BIKEPACKING", {
    route: { distanceKm: 62, targetSpeedKmH: 19.5 },
    office: { targetGateArrivalTime: "17:45", shiftStartTime: "18:00" }
  }),
  createScenario(56, "Late Night Bivouac Arrival (21:30 Pitch)", "BIKEPACKING", {
    route: { distanceKm: 88, targetSpeedKmH: 20 },
    office: { targetGateArrivalTime: "21:30", shiftStartTime: "22:00" }
  }),
  createScenario(57, "Mountain Singletrack Bikepacking (4.8% Grade)", "BIKEPACKING", {
    physics: { gradientPercent: 4.8, gearWeightKg: 16 },
    route: { distanceKm: 45, targetSpeedKmH: 14 },
    office: { targetGateArrivalTime: "17:00" }
  }),
  createScenario(58, "Exposed Coastal Headwind Bikepacking", "BIKEPACKING", {
    weather: { baseWindSpeedKmH: 22, isHeadwindActive: true, estuaryGustKmH: 35 },
    route: { distanceKm: 55, targetSpeedKmH: 17.5 },
    physics: { gearWeightKg: 15, cda: 0.46 },
    office: { targetGateArrivalTime: "18:00" }
  }),
  createScenario(59, "Multi-Day Stage 2 Dawn Departure (06:00 Rollout)", "BIKEPACKING", {
    departureTime: "06:00",
    route: { distanceKm: 110, targetSpeedKmH: 19 },
    office: { targetGateArrivalTime: "14:00" }
  }),
  createScenario(60, "Heavy Rain & Mud Bikepacking Stage", "BIKEPACKING", {
    weather: { precipitationRiskPercent: 95, temperatureC: 8, baseWindSpeedKmH: 16 },
    route: { distanceKm: 52, targetSpeedKmH: 16 },
    office: { targetGateArrivalTime: "16:30" }
  }),
  createScenario(61, "French Bikepacking NLP Prompt with Filtration", "BIKEPACKING", {
    nlpPrompt: "Bikepacking de 75 km vers Pornic, d\xE9part 9h, allure 19 km/h avec tente et 14kg de sacoches, ravito eau",
    lang: "fr"
  }),
  createScenario(62, "English Self-Supported Adventure NLP Prompt", "BIKEPACKING", {
    nlpPrompt: "Bikepacking adventure trip, 85km at 18 km/h, camp pitch by 6pm at coastal cove, 12kg gear",
    lang: "en"
  }),
  createScenario(63, "Heavy Cargo Rig with 30 kg Equipment", "BIKEPACKING", {
    physics: { gearWeightKg: 30, bikeWeightKg: 16 },
    route: { distanceKm: 40, targetSpeedKmH: 15 },
    office: { targetGateArrivalTime: "16:00" }
  }),
  createScenario(64, "Frame Bags Only (Zero Backpack Comfort)", "BIKEPACKING", {
    nlpPrompt: "Bikepacking 65km vers Gu\xE9rande \xE0 20 km/h sans sac a dos avec 8kg sacoches",
    lang: "fr"
  }),
  createScenario(65, "Century Stage Bikepacking Expedition (140 km)", "BIKEPACKING", {
    route: { distanceKm: 140, targetSpeedKmH: 21 },
    physics: { gearWeightKg: 11 },
    office: { targetGateArrivalTime: "19:30" }
  }),
  createScenario(66, "Desert Gravel Summer Expedition (36\xB0C)", "BIKEPACKING", {
    weather: { temperatureC: 36, precipitationRiskPercent: 0 },
    route: { distanceKm: 75, targetSpeedKmH: 19 },
    office: { targetGateArrivalTime: "17:00" }
  }),
  createScenario(67, "Alpine Valley Descent with Loaded Rig", "BIKEPACKING", {
    physics: { gradientPercent: -2.5, gearWeightKg: 18 },
    route: { distanceKm: 45, targetSpeedKmH: 26 },
    office: { targetGateArrivalTime: "15:00" }
  }),
  createScenario(68, "Bikepacking with Spare Derailleur Hanger Check", "BIKEPACKING", {
    route: { distanceKm: 70, targetSpeedKmH: 20 },
    lang: "fr"
  }),
  createScenario(69, "Bikepacking Expedition with 20,000mAh Power Staging", "BIKEPACKING", {
    route: { distanceKm: 80, targetSpeedKmH: 19.5 }
  }),
  createScenario(70, "Bikepacking Stove & Warm Recovery Nutrition Check", "BIKEPACKING", {
    route: { distanceKm: 60, targetSpeedKmH: 18.5 },
    office: { targetGateArrivalTime: "18:15" }
  }),
  // ══════════════════════════════════════════════════════════════════
  // GROUP 4: ESCAPADE, LEISURE & HOTEL TOURING (71 to 85)
  // ══════════════════════════════════════════════════════════════════
  createScenario(71, "Weekend Escapade to Clisson (H\xF4tel Villa Saint-Antoine)", "ESCAPADE", {
    route: { origin: "Nantes Ch\xE2teau", destination: "H\xF4tel Villa Saint-Antoine (Clisson)", distanceKm: 38, targetSpeedKmH: 24 },
    office: { targetGateArrivalTime: "15:00", shiftStartTime: "16:00", gateName: "Hotel Reception" },
    physics: { gearWeightKg: 5.5, bikeWeightKg: 9.8 }
  }),
  createScenario(72, "Vineyard Country Hotel Tour to Vallet", "ESCAPADE", {
    route: { destination: "Ch\xE2teau du Cl\xE9ray Vallet", distanceKm: 32, targetSpeedKmH: 21 },
    office: { targetGateArrivalTime: "14:30", shiftStartTime: "15:30" }
  }),
  createScenario(73, "Coastal Resort Getaway to Pornichet", "ESCAPADE", {
    route: { destination: "H\xF4tel des Bains Pornichet", distanceKm: 58, targetSpeedKmH: 23.5 },
    office: { targetGateArrivalTime: "16:00", shiftStartTime: "17:00" }
  }),
  createScenario(74, "Medieval Ramparts Boutique G\xEEte in Gu\xE9rande", "ESCAPADE", {
    route: { destination: "G\xEEte des Remparts Gu\xE9rande", distanceKm: 48, targetSpeedKmH: 22 },
    office: { targetGateArrivalTime: "16:30" }
  }),
  createScenario(75, "Scenic River Bank Tour to Ancenis Bistro", "ESCAPADE", {
    route: { destination: "Bistro de la Loire Ancenis", distanceKm: 36, targetSpeedKmH: 20 },
    office: { targetGateArrivalTime: "12:30" }
  }),
  createScenario(76, "Tidal Passage Crossing to Noirmoutier Island", "ESCAPADE", {
    route: { destination: "H\xF4tel du Passage Gois Noirmoutier", distanceKm: 52, targetSpeedKmH: 23 },
    office: { targetGateArrivalTime: "13:15" }
  }),
  createScenario(77, "Early Check-In Escapade (13:00 Arrival)", "ESCAPADE", {
    route: { destination: "Manoir de Belle-\xCEle", distanceKm: 35, targetSpeedKmH: 24 },
    office: { targetGateArrivalTime: "13:00" }
  }),
  createScenario(78, "Late Evening Dining Escapade (19:30 Check-In)", "ESCAPADE", {
    route: { destination: "Auberge du Vignoble", distanceKm: 65, targetSpeedKmH: 25 },
    office: { targetGateArrivalTime: "19:30", shiftStartTime: "20:30" }
  }),
  createScenario(79, "French Escapade NLP Prompt with Hotel Check-in", "ESCAPADE", {
    nlpPrompt: "Escapade \xE0 Clisson d\xE9part samedi 10h, h\xF4tel r\xE9serv\xE9 pour 15h, 38km allure 22 km/h avec 6kg bagages",
    lang: "fr"
  }),
  createScenario(80, "English Weekend Getaway NLP Prompt", "ESCAPADE", {
    nlpPrompt: "Weekend leisure tour to seaside hotel by 4pm, 45km ride at 24 km/h, dinner reservation at 7pm",
    lang: "en"
  }),
  createScenario(81, "Gentle Couples Touring Pace (18 km/h)", "ESCAPADE", {
    route: { distanceKm: 28, targetSpeedKmH: 18 },
    office: { targetGateArrivalTime: "14:30" }
  }),
  createScenario(82, "Autumn Rain Winery Tour (12\xB0C, 75% Rain)", "ESCAPADE", {
    weather: { temperatureC: 12, precipitationRiskPercent: 75 },
    route: { distanceKm: 34, targetSpeedKmH: 21 },
    office: { targetGateArrivalTime: "15:00" }
  }),
  createScenario(83, "Escapade with 45-Minute Mid-Route Gourmet Picnic", "ESCAPADE", {
    nlpPrompt: "Escapade 42km vers Clisson avec pause ravito pique-nique de 45 min, arriv\xE9e h\xF4tel 16h",
    lang: "fr"
  }),
  createScenario(84, "Escapade with Locked Bike Storage Flag", "ESCAPADE", {
    office: { gateName: "Local V\xE9lo Ferm\xE9 H\xF4tel", notes: "Private locked bike garage confirmed" },
    route: { distanceKm: 40, targetSpeedKmH: 23 }
  }),
  createScenario(85, "Escapade Return Leg (Hotel to Home Base)", "ESCAPADE", {
    route: { origin: "H\xF4tel Clisson", destination: "Nantes Domicile", distanceKm: 38, targetSpeedKmH: 24.5 },
    office: { targetGateArrivalTime: "18:00", gateName: "Home Garage" }
  }),
  // ══════════════════════════════════════════════════════════════════
  // GROUP 5: BOUNDARY, STRESS & ADVERSARIAL EDGE CASES (86 to 100)
  // ══════════════════════════════════════════════════════════════════
  createScenario(86, "Boundary: Zero Distance (0.0 km)", "BOUNDARY_EDGE", {
    route: { distanceKm: 0, targetSpeedKmH: 25 }
  }),
  createScenario(87, "Boundary: Micro-Commute (0.5 km)", "BOUNDARY_EDGE", {
    route: { distanceKm: 0.5, targetSpeedKmH: 20 }
  }),
  createScenario(88, "Boundary: Minimal Target Speed (5.0 km/h walking clamp)", "BOUNDARY_EDGE", {
    route: { distanceKm: 20, targetSpeedKmH: 5 }
  }),
  createScenario(89, "Boundary: Extreme Pro Speed (60.0 km/h)", "BOUNDARY_EDGE", {
    route: { distanceKm: 30, targetSpeedKmH: 60 }
  }),
  createScenario(90, "Boundary: Ultra-Endurance Audax (350.0 km)", "BOUNDARY_EDGE", {
    route: { distanceKm: 350, targetSpeedKmH: 26 },
    office: { targetGateArrivalTime: "22:00" }
  }),
  createScenario(91, "Boundary: Featherweight System Mass (Rider 40kg, Bike 5kg, Gear 0kg)", "BOUNDARY_EDGE", {
    physics: { riderWeightKg: 40, bikeWeightKg: 5, gearWeightKg: 0 }
  }),
  createScenario(92, "Boundary: Super-Heavy Cargo Rig (Rider 130kg, Bike 28kg, Gear 35kg)", "BOUNDARY_EDGE", {
    physics: { riderWeightKg: 130, bikeWeightKg: 28, gearWeightKg: 35 }
  }),
  createScenario(93, "Boundary: Extreme Negative Gradient (-12.0% Steep Descent)", "BOUNDARY_EDGE", {
    physics: { gradientPercent: -12 },
    route: { distanceKm: 25, targetSpeedKmH: 45 }
  }),
  createScenario(94, "Boundary: Extreme Wall Climb (+16.0% Gradient)", "BOUNDARY_EDGE", {
    physics: { gradientPercent: 16 },
    route: { distanceKm: 10, targetSpeedKmH: 12 }
  }),
  createScenario(95, "Boundary: Hurricane Storm Gale (75 km/h Wind, 95 km/h Gusts)", "BOUNDARY_EDGE", {
    weather: { baseWindSpeedKmH: 75, estuaryGustKmH: 95, isHeadwindActive: true }
  }),
  createScenario(96, "Boundary: Dead Sea Dense Atmosphere (rho 1.35 kg/m\xB3, -10\xB0C, 1045 hPa)", "BOUNDARY_EDGE", {
    physics: { rho: 1.35 },
    weather: { temperatureC: -10 }
  }),
  createScenario(97, "Boundary: Extreme High-Altitude Air (rho 0.82 kg/m\xB3 at 4200m)", "BOUNDARY_EDGE", {
    physics: { rho: 0.82 }
  }),
  createScenario(98, "Boundary: Midnight Minute Crossing (Shift 00:10, 2h Ride)", "BOUNDARY_EDGE", {
    office: { shiftStartTime: "00:10", targetGateArrivalTime: "23:45" },
    route: { distanceKm: 50, targetSpeedKmH: 25 }
  }),
  createScenario(99, "Boundary: Missing/Empty Text Strings & Edge Flags", "BOUNDARY_EDGE", {
    route: { origin: "", destination: "", distanceKm: 20 },
    office: { gateName: "", notes: "" }
  }),
  createScenario(100, "Boundary: Complex Jargon Bilingual French Slang NLP Stress Test", "BOUNDARY_EDGE", {
    nlpPrompt: "Salut l'\xE9quipe ! V\xE9lotaf demain matin, d\xE9part Nantes direction Porte 17, shift \xE0 9h p\xE9tantes, 24 bornes \xE0 27 km/h, 15 km/h de vent dans la gueule sur le pont, pr\xE9voir 10 min de marge anti-crevaison et un ravito vestiaire de 12 min. J'ai 4,5 kg de matos.",
    lang: "fr"
  })
];
function runFullStressTestAudit() {
  const results = [];
  const globalAnomalies = /* @__PURE__ */ new Set();
  for (const scen of SCENARIOS) {
    const anomalies = [];
    const warnings = [];
    let trip = { ...scen.trip };
    let nlpFeedback;
    if (scen.nlpPrompt) {
      try {
        const parseRes = parseTripDescription(scen.nlpPrompt, trip, scen.lang || "en");
        nlpFeedback = {
          extractedCount: parseRes.extractedSummary.length,
          detectedSpeed: parseRes.detected.speed,
          detectedDist: parseRes.detected.distance,
          detectedArrival: parseRes.detected.arrivalTarget,
          detectedRollout: parseRes.detected.rolloutTime
        };
        trip = {
          ...trip,
          ...parseRes.parsedValues,
          physics: { ...trip.physics, ...parseRes.parsedValues.physics || {} },
          route: { ...trip.route, ...parseRes.parsedValues.route || {} },
          office: { ...trip.office, ...parseRes.parsedValues.office || {} },
          weather: { ...trip.weather, ...parseRes.parsedValues.weather || {} }
        };
      } catch (err) {
        anomalies.push(`NLP Parsing threw exception: ${err.message}`);
      }
    }
    let physResult = {};
    try {
      physResult = calculatePhysics(trip.physics, trip.route, trip.weather, scen.lang || "en");
      if (Number.isNaN(physResult.legWatts)) anomalies.push("Physics: legWatts is NaN");
      if (!Number.isFinite(physResult.legWatts)) anomalies.push("Physics: legWatts is not finite");
      if (Number.isNaN(physResult.totalWorkKj)) anomalies.push("Physics: totalWorkKj is NaN");
      if (Number.isNaN(physResult.totalKcalBurn)) anomalies.push("Physics: totalKcalBurn is NaN");
      if (Number.isNaN(physResult.carbOxidationGramPerHour)) anomalies.push("Physics: carbOxidationGramPerHour is NaN");
      if (Number.isNaN(physResult.totalCarbsBurnedGrams)) anomalies.push("Physics: totalCarbsBurnedGrams is NaN");
      if (physResult.legWatts < 0) {
        warnings.push(`Physics: legWatts is negative (${physResult.legWatts}W) on gradient ${trip.physics.gradientPercent}%`);
      }
      if (physResult.movingTimeSeconds < 0) {
        anomalies.push(`Physics: movingTimeSeconds is negative (${physResult.movingTimeSeconds}s)`);
      }
    } catch (err) {
      anomalies.push(`Physics Engine threw exception: ${err.message}`);
    }
    let timeResult = {};
    try {
      timeResult = calculateReverseTimeline(
        trip.route,
        trip.office,
        trip.weather,
        trip.tag,
        trip.route.destination,
        scen.lang || "en"
      );
      if (!timeResult.hardDepartureTime || timeResult.hardDepartureTime.includes("NaN")) {
        anomalies.push(`Timeline: hardDepartureTime is invalid ("${timeResult.hardDepartureTime}")`);
      }
      if (!timeResult.wakeUpTime || timeResult.wakeUpTime.includes("NaN")) {
        anomalies.push(`Timeline: wakeUpTime is invalid ("${timeResult.wakeUpTime}")`);
      }
      if (Number.isNaN(timeResult.pureMovingMinutes)) anomalies.push("Timeline: pureMovingMinutes is NaN");
      if (Number.isNaN(timeResult.totalDoorToDeskMinutes)) anomalies.push("Timeline: totalDoorToDeskMinutes is NaN");
      if (!timeResult.steps || timeResult.steps.length === 0) {
        warnings.push("Timeline: generated 0 steps");
      }
      const depHour = parseInt((timeResult.hardDepartureTime || "00").split(":")[0], 10);
      const arrHour = parseInt((timeResult.gateArrivalTime || "00").split(":")[0], 10);
      if (depHour > arrHour && (arrHour < 12 && depHour > 12)) {
      }
    } catch (err) {
      anomalies.push(`Timeline Engine threw exception: ${err.message}`);
    }
    let chkItems = [];
    try {
      chkItems = generateTripChecklist(trip.tag, trip.route.distanceKm, trip.weather, { lang: scen.lang || "en" });
      if (chkItems.length === 0) warnings.push("Checklist: 0 items generated");
    } catch (err) {
      anomalies.push(`Checklist Generator threw exception: ${err.message}`);
    }
    try {
      const rhoCalc = calculateAirDensity(trip.weather.temperatureC, 1013);
      if (Number.isNaN(rhoCalc) || rhoCalc <= 0) {
        anomalies.push(`Weather: calculateAirDensity returned invalid rho (${rhoCalc})`);
      }
      const horizon = checkForecastHorizon(trip.departureDate || "2026-10-27");
      if (typeof horizon.isAvailable !== "boolean") {
        anomalies.push("Weather: checkForecastHorizon returned invalid boolean");
      }
    } catch (err) {
      anomalies.push(`Weather Service threw exception: ${err.message}`);
    }
    anomalies.forEach((a) => globalAnomalies.add(a));
    const status = anomalies.length > 0 ? "FAIL" : warnings.length > 0 ? "WARN" : "PASS";
    results.push({
      id: scen.id,
      name: scen.name,
      category: scen.category,
      status,
      physics: {
        systemMassKg: physResult.systemMassKg || 0,
        legWatts: Math.round(physResult.legWatts || 0),
        aeroWatts: Math.round(physResult.aerodynamicDragWatts || 0),
        rollingWatts: Math.round(physResult.rollingResistanceWatts || 0),
        gravityWatts: Math.round(physResult.gravityWatts || 0),
        movingTimeFormatted: physResult.movingTimeFormatted || "0m",
        totalKcalBurn: Math.round(physResult.totalKcalBurn || 0),
        totalCarbsGrams: Math.round(physResult.totalCarbsBurnedGrams || 0),
        carbRateGramsPerHour: Math.round(physResult.carbOxidationGramPerHour || 0),
        goStatus: physResult.goStatus || "UNKNOWN",
        goStatusReason: physResult.goStatusReason || ""
      },
      timeline: {
        wakeUpTime: timeResult.wakeUpTime || "",
        preRideMealTime: timeResult.preRideMealTime || "",
        hardDepartureTime: timeResult.hardDepartureTime || "",
        gateArrivalTime: timeResult.gateArrivalTime || "",
        shiftStartTime: timeResult.shiftStartTime || "",
        pureMovingMinutes: timeResult.pureMovingMinutes || 0,
        totalDoorToDeskMinutes: timeResult.totalDoorToDeskMinutes || 0,
        bufferMinutes: timeResult.bufferMinutes || 0,
        stepCount: timeResult.steps?.length || 0,
        hasMidnightCrossing: Boolean(
          timeResult.hardDepartureTime && timeResult.gateArrivalTime && parseInt(timeResult.hardDepartureTime.split(":")[0], 10) > parseInt(timeResult.gateArrivalTime.split(":")[0], 10)
        )
      },
      checklist: {
        totalItems: chkItems.length,
        criticalCount: chkItems.filter((c) => c.critical).length,
        hasThermalKit: chkItems.some((c) => c.id === "gear-thermal"),
        hasPunctureKit: chkItems.some((c) => c.id.includes("mech-") || c.id.includes("creve"))
      },
      nlpFeedback,
      anomalies,
      warnings
    });
  }
  const passedCount = results.filter((r) => r.status === "PASS").length;
  const warnCount = results.filter((r) => r.status === "WARN").length;
  const failCount = results.filter((r) => r.status === "FAIL").length;
  return {
    totalScenarios: results.length,
    passedCount,
    warnCount,
    failCount,
    results,
    globalAnomalies: Array.from(globalAnomalies)
  };
}
var audit = runFullStressTestAudit();
var outputPath = path.resolve(__dirname, "audit_results.json");
fs.writeFileSync(outputPath, JSON.stringify(audit, null, 2), "utf-8");
console.log("AUDIT_COMPLETE: Total=" + audit.totalScenarios + ", Passed=" + audit.passedCount + ", Warn=" + audit.warnCount + ", Fail=" + audit.failCount);
console.log("Global Anomalies:", JSON.stringify(audit.globalAnomalies));
console.log("Results written to:", outputPath);
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  SCENARIOS,
  runFullStressTestAudit
});
/*! Bundled license information:

react/cjs/react.production.min.js:
  (**
   * @license React
   * react.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react.development.js:
  (**
   * @license React
   * react.development.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react-jsx-runtime.production.min.js:
  (**
   * @license React
   * react-jsx-runtime.production.min.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)

react/cjs/react-jsx-runtime.development.js:
  (**
   * @license React
   * react-jsx-runtime.development.js
   *
   * Copyright (c) Facebook, Inc. and its affiliates.
   *
   * This source code is licensed under the MIT license found in the
   * LICENSE file in the root directory of this source tree.
   *)
*/
