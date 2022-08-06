/**
 * BarThresholds
 *
 * Version 1.0
 * Last updated: August 6, 2022
 * Author: thatblindgeye
 * GitHub: https://github.com/thatblindgeye
 *
 * !thresh new|<bar>|<targets>|<compareType>|<compareValues>|<effectType>|<effectValues>|
 */

const BarThresholds = (function () {
  "use strict";

  const THRESHOLD_KEYS = {
    ONLY_TOKENS: "onlyTokens",
    EXCEPT_TOKENS: "exceptTokens",
    COMPARE_TYPE: "comparisonType",
    COMPARE_VALUES: "comparisonValues",
    EFFECT_TYPE: "effectType",
    EFFECT_VALUES: "effectValues",
  };

  const TARGET_TYPES = {
    ALL: "All tokens",
    ONLY_SELECTED: "Only selected tokens",
    EXCEPT_SELECTED: "Except selected tokens",
  };

  const COMPARISON_TYPES = {
    EQUAL: "Equal to",
    GREATER: "Greater than",
    LESS: "Less than",
    GREATER_EQUAL: "Greater than or equal to",
    LESS_EQUAL: "Less than or equal to",
    GREATER_LESS: "Greater than X and Less than Y",
    GREATER_LESS_EQUAL:
      "Greater than or equal to X and Less than or equal to Y",
  };

  const EFFECT_TYPES = {
    ADD_TOKEN: "Add token",
    REMOVE_TOKEN: "Remove token",
    ADD_REMOVE_TOKEN: "Add token and Remove token",
    TINT: "Update tint color",
    AURA_1: "Update aura 1",
    AURA_2: "Update aura 2",
    COMMAND: "Custom command",
  };

  const CONFIG_TABS = {
    INSTRUCTIONS: "Instructions",
    THRESHOLDS: "Thresholds",
  };

  const DEFAULT_STATE = {
    bar1: [],
    bar2: [],
    bar3: [],
    currentTab: null,
    version: "1.0",
  };
})();

on("ready", () => {
  "use strict";
});
