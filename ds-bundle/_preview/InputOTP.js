"use strict";
var __dsPreview = (() => {
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

  // ds-shim:ds
  var require_ds = __commonJS({
    "ds-shim:ds"(exports, module) {
      module.exports = window.EpicUI;
    }
  });

  // shim:react-shim
  var require_react_shim = __commonJS({
    "shim:react-shim"(exports, module) {
      var R = window.React;
      function jsx2(t, p, k) {
        return R.createElement(t, k === void 0 ? p : Object.assign({ key: k }, p));
      }
      module.exports = R;
      module.exports.jsx = jsx2;
      module.exports.jsxs = jsx2;
      module.exports.jsxDEV = jsx2;
      module.exports.Fragment = R.Fragment;
    }
  });

  // .design-sync/previews/InputOTP.tsx
  var InputOTP_exports = {};
  __export(InputOTP_exports, {
    SixDigit: () => SixDigit
  });
  var import_epic_stack_template = __toESM(require_ds(), 1);
  var import_jsx_runtime = __toESM(require_react_shim(), 1);
  var SixDigit = () => /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_epic_stack_template.InputOTP, { maxLength: 6, value: "123456", onChange: () => {
  }, children: [
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_epic_stack_template.InputOTPGroup, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_epic_stack_template.InputOTPSlot, { index: 0 }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_epic_stack_template.InputOTPSlot, { index: 1 }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_epic_stack_template.InputOTPSlot, { index: 2 })
    ] }),
    /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_epic_stack_template.InputOTPSeparator, {}),
    /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(import_epic_stack_template.InputOTPGroup, { children: [
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_epic_stack_template.InputOTPSlot, { index: 3 }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_epic_stack_template.InputOTPSlot, { index: 4 }),
      /* @__PURE__ */ (0, import_jsx_runtime.jsx)(import_epic_stack_template.InputOTPSlot, { index: 5 })
    ] })
  ] });
  return __toCommonJS(InputOTP_exports);
})();
