/**
 * BarThresholds
 *
 * Version 1.0
 * Last updated: August 8, 2022
 * Author: thatblindgeye
 * GitHub: https://github.com/thatblindgeye
 *
 * Three sections, one for each bar
 * Each section has a "New threshold" button
 *
 * > User presses a "New threshold" button
 *   - Series of dialogs occur:
 *     - A dropdown to select which tokens the threshold will apply to (all, selected, except selected)
 *     - A dropdown to select the comparison type (Equal, Greater than, Less than, Greater/Equal, Less/Equal, Greater and Less, Greater/Equal and Less/Equal)
 *     - An input to enter the value to compare against the bar value
 *     - A dropdown to select the effect type (Add Token, Remove Token, Update Tint, Update Aura 1, Update Aura 2, Command)
 *     - An input/series of inputs to enter the effect info (token name, tint color, aura radius/shape/color, command)
 *
 * To-do:
 *  - Allow multiple markers to be added/removed at once
 *
 */

const BarThresholds = (function () {
  "use strict";

  const VERSION = "1.0";
  const LAST_UPDATED = 1659959975716;
  const THRESH_DISPLAY_NAME = `BarThresholds v${VERSION}`;
  const THRESH_CONFIG_NAME = "BarThresholds Config";

  const COMMANDS = {
    ADD_THRESHOLD: "add",
    DELETE_THRESHOLD: "delete",
    EDIT_THRESHOLD: "edit",
  };

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
    ADD_MARKER: "Add marker",
    REMOVE_MARKER: "Remove marker",
    ADD_REMOVE_MARKER: "Add marker and Remove marker",
    TINT: "Update tint color",
    AURA_1: "Update aura 1",
    AURA_2: "Update aura 2",
    COMMAND: "Custom command",
  };

  const REGEX = {
    COLOR_VALUE: /^(\#[\d|a-f]{6}|transparent)$/i,
    INT_OR_PERCENT: /^\-?\d*%?$/,
    AURA_RADIUS: /^[^\D]\d*$/,
    AURA_SHAPE: /^(square|circle)$/i,
    BOOLEAN: /^(true|false)$/i,
  };

  const ROLL20_MARKERS = [
    {
      name: "red",
    },
    {
      name: "blue",
    },
    {
      name: "green",
    },
    {
      name: "brown",
    },
    {
      name: "purple",
    },
    {
      name: "pink",
    },
    {
      name: "yellow",
    },
    {
      name: "dead",
    },
  ];

  const CONFIG_TABS = {
    INSTRUCTIONS: "Instructions",
    THRESHOLDS: "Thresholds",
  };

  // "-N8u_AM_kks6if4OUmhT"
  const DEFAULT_STATE = {
    bar1: [
      {
        onlyTokens: ["-N8u_AM_kks6if4OUmhT"],
        exceptTokens: [],
        comparisonType: "Equal to",
        comparisonValues: ["10"],
        effectType: "Add marker and Remove marker",
        effectValues: ["red", "yellow"],
      },
    ],
    bar2: [],
    bar3: [],
    configId: "",
    currentTab: "",
    version: "1.0",
  };

  const configNavActiveCSS = "background-color: #e4dfff;";
  const configNavCSS =
    "padding: 10px; border-radius: 25px; margin-right: 10px;";

  const thresholdCardHeaderCSS = "font-weight: bold; margin-right: 10px;";
  const thresholdCardSeparatorCSS =
    "margin-left: 10px; padding-left: 10px; border-left: 1px solid rgb(100, 100, 100);";
  const thresholdCardButtonCSS =
    "border-radius: 25px; border: 1px solid rgba(100, 100, 100, 0.5); padding: 4px 8px;";

  const listCSS = "margin: 0px; list-style: none;";
  const thresholdCardCSS =
    "margin-bottom: 10px; padding: 5px; border: 1px solid rgb(100, 100, 100);";

  function trimWhitespace(str) {
    return str.trim().replace(/&nbsp;|\s{2,}/g, (match) => {
      if (/&nbsp;/.test(match)) {
        return "";
      }

      if (/\s{2,}/.test(match)) {
        return " ";
      }
    });
  }

  function sendErrorMessage(message) {
    sendChat(
      THRESH_DISPLAY_NAME,
      `/w gm <div style="border: 1px solid rgba(255, 0, 0, 1); background-color: rgba(255, 0, 0, 0.25); padding: 8px;">${message}</div>`,
      null,
      { noarchive: true }
    );
  }

  function validateColor(color) {
    if (!REGEX.COLOR_VALUE.test(color)) {
      throw new Error(
        `${color} is not a valid color value. Color value must either be <code>transparent</code>, or be in HEX format with 6 characters following a hash <code>#</code>, e.g. <code>#ff000f</code>.`
      );
    }

    return color;
  }

  function validateComparisonValues(type, values) {
    const { EQUAL, GREATER_LESS, GREATER_LESS_EQUAL } = COMPARISON_TYPES;
    const { COMPARE_VALUES } = THRESHOLD_KEYS;

    if (type !== EQUAL) {
      if (values[0].trim() === "" && values.length === 1) {
        throw new Error(
          `When using a comparison type other than <code>${EQUAL}</code>, the comparison value(s) cannot be blank.`
        );
      }

      const invalidValues = _.filter(
        values,
        (value) => isNaN(parseInt(value)) || !REGEX.INT_OR_PERCENT.test(value)
      ).join(", ");

      if (invalidValues) {
        throw new Error(
          `The following values are not valid: <code>${invalidValues}</code>. When using a comparison type other than <code>${EQUAL}</code>, any value(s) passed in must be a valid integer, e.g. <code>5</code> or <code>-5</code>, or a valid percentage, e.g. <code>25%</code>.`
        );
      }
    }

    if (type === GREATER_LESS && values[0] === values[1]) {
      throw new Error(
        `When using the <code>${GREATER_LESS}</code> comparison types, the values passed in cannot be the same value. A threshold will not trigger because a bar value cannot be both greater than ${values[0]} and less than ${values[1]}.`
      );
    }

    if (type === GREATER_LESS || type === GREATER_LESS_EQUAL) {
      if (values.length !== 2) {
        throw new Error(
          `When using the <code>${GREATER_LESS}</code> or <code>${GREATER_LESS_EQUAL}</code> comparison types you must pass in two values, with the first value being the "greater than..." comparison value and the second value being the "less than..." comparison value.`
        );
      }

      if (values[0] > values[1]) {
        throw new Error(
          `When using the <code>${GREATER_LESS}</code> or <code>${GREATER_LESS_EQUAL}</code> comparison types, the first value passed in (the "greater than..." comparison value) must be smaller than the second value passed in (the "less than..." comparison value). A threshold will not trigger because a bar value cannot be both greater than (or equal to) ${values[0]} and less than (or equal to) ${values[1]}.`
        );
      }
    }

    return { [COMPARE_VALUES]: values };
  }

  function validateEffectValues(type, values) {
    const {
      ADD_MARKER,
      REMOVE_MARKER,
      ADD_REMOVE_MARKER,
      TINT,
      AURA_1,
      AURA_2,
    } = EFFECT_TYPES;

    if (values[0].trim() === "" && values.length === 1) {
      throw new Error("Effect value(s) cannot be blank.");
    }

    if ([ADD_MARKER, REMOVE_MARKER, ADD_REMOVE_MARKER].includes(type)) {
      const campaignMarkers = [
        ...JSON.parse(Campaign().get("token_markers")),
        ...ROLL20_MARKERS,
      ];
      const invalidMarkers = _.filter(
        values,
        (tokenValue) => !_.findWhere(campaignMarkers, { name: tokenValue })
      ).join(", ");

      if (invalidMarkers) {
        throw new Error(
          `The following token markers do not exist in the campaign: <code>${invalidMarkers}</code>. When using the <code>${ADD_MARKER}</code>, <code>${REMOVE_MARKER}</code>, or <code>${ADD_REMOVE_MARKER}</code> effect types, you must pass in valid token markers.`
        );
      }
    }

    if (type === ADD_REMOVE_MARKER) {
      if (values.length !== 2) {
        throw new Error(
          `When using the <code>${ADD_REMOVE_MARKER}</code> effect type, you must pass in two values, with the first value being the token to add and the second value being the token to remove.`
        );
      }
    }

    if (type === TINT) {
      validateColor(values[0]);
    }

    if (type === AURA_1 || type === AURA_2) {
      validateColor(values[2]);

      if (values[3] && !REGEX.BOOLEAN.test(values[3])) {
        throw new Error(
          `${values[3]} is not a valid boolean value. When passing in the optional parameter for showing an aura to players, you must pass in a valid boolean value of <code>true</code> or <code>false</code>.`
        );
      }

      if (values.length < 3 && parseInt(values[0]) !== 0) {
        throw new Error(
          `When using the <code>${AURA_1}</code> or <code>${AURA_2}</code> effect types, you must either pass in a comma separated list of values formatted as <code>radius, shape, color, optional boolean to show the aura to players</code>, or <code>0</code> to turn the aura off.`
        );
      }

      if (!REGEX.AURA_RADIUS.test(values[0])) {
        throw new Error(
          `${values[0]} is not a valid value for the aura radius. Aura radius must be a positive integer, e.g. <code>5</code>, or <code>0</code>.`
        );
      }

      if (!REGEX.AURA_SHAPE.test(values[1]) || !REGEX.BOOLEAN.test(values[1])) {
        throw new Error(
          `${values[1]} is not a valid value for the aura shape. You must pass in either <code>true</code> or <code>square</code> for a square aura, or <code>false</code> or <code>circle</code> for a circle aura.`
        );
      }
    }

    return values;
  }

  function setThresholdTargets(targets, selectedTokens) {
    const { ONLY_TOKENS, EXCEPT_TOKENS } = THRESHOLD_KEYS;
    const { ONLY_SELECTED } = TARGET_TYPES;

    if (selectedTokens) {
      const tokenIds = _.pluck(selectedTokens, "_id");

      if (targets === ONLY_SELECTED) {
        return { [ONLY_TOKENS]: tokenIds, [EXCEPT_TOKENS]: [] };
      }

      return { [ONLY_TOKENS]: [], [EXCEPT_TOKENS]: tokenIds };
    }

    return { [ONLY_TOKENS]: [], [EXCEPT_TOKENS]: [] };
  }

  function formatEffectValues(type, values) {
    const { EFFECT_VALUES } = THRESHOLD_KEYS;
    const { COMMAND } = EFFECT_TYPES;

    if (type !== COMMAND) {
      const formattedEffectValues = values
        .split(/\s*,\s*/)
        .map((value) => trimWhitespace(value));

      return {
        [EFFECT_VALUES]: validateEffectValues(type, formattedEffectValues),
      };
    }

    return {
      [EFFECT_VALUES]: values.replace(/&#124;|&#44;/g, (match) => {
        if (/&#124;/.test(match)) {
          return "|";
        }

        if (/&#44;/.test(match)) {
          return ",";
        }
      }),
    };
  }

  function createThreshold(selectedTokens, commandArgs) {
    const { COMPARE_TYPE, EFFECT_TYPE } = THRESHOLD_KEYS;
    let [
      ,
      targetTokens,
      comparisonType,
      comparisonValues,
      effectType,
      effectValues,
    ] = commandArgs;

    comparisonValues = comparisonValues
      .split(/\s*,\s*/)
      .map((value) => trimWhitespace(value));

    const newThreshold = {
      ...setThresholdTargets(targetTokens, selectedTokens),
      [COMPARE_TYPE]: comparisonType,
      ...validateComparisonValues(comparisonType, comparisonValues),
      [EFFECT_TYPE]: effectType,
      ...formatEffectValues(effectType, effectValues),
    };

    return newThreshold;
  }

  function getValueForCompare(bar, token, compareValue) {
    const barMax = token.get(`${bar}_max`);

    if (/%/.test(compareValue) && !isNaN(compareValue.replace(/%/g, ""))) {
      if (isNaN(parseInt(barMax))) {
        sendErrorMessage(
          `${token.get(
            "name"
          )} does not have a maximum set for ${bar}. Tokens must have a maximum set for a bar when using a percentage comparison value.`
        );
        return;
      }

      const percentAsDecimal = parseInt(compareValue) / 100;
      return parseInt(barMax) * percentAsDecimal;
    }

    return compareValue;
  }

  function runComparison(bar, token, compareType, compareValues) {
    const {
      EQUAL,
      GREATER,
      LESS,
      GREATER_EQUAL,
      LESS_EQUAL,
      GREATER_LESS,
      GREATER_LESS_EQUAL,
    } = COMPARISON_TYPES;

    const barValue =
      compareType === EQUAL
        ? token.get(`${bar}_value`)
        : parseInt(token.get(`${bar}_value`));
    const firstCompareValue =
      compareType === EQUAL
        ? getValueForCompare(bar, token, compareValues[0])
        : parseFloat(getValueForCompare(bar, token, compareValues[0]));
    const secondCompareValue = compareValues[1]
      ? parseFloat(getValueForCompare(bar, token, compareValues[1]))
      : undefined;

    switch (compareType) {
      case EQUAL:
        return barValue == firstCompareValue;
      case GREATER:
        return barValue > firstCompareValue;
      case LESS:
        return barValue < firstCompareValue;
      case GREATER_EQUAL:
        return barValue >= firstCompareValue;
      case LESS_EQUAL:
        return barValue <= firstCompareValue;
      case GREATER_LESS:
        return barValue > firstCompareValue && barValue < secondCompareValue;
      case GREATER_LESS_EQUAL:
        return barValue >= firstCompareValue && barValue <= secondCompareValue;
      default:
        return false;
    }
  }

  function setMarkers(token, effectType, markerValues) {
    let tokenMarkers = token.get("statusmarkers");

    if (/add/i.test(effectType)) {
      if (!tokenMarkers.includes(markerValues[0])) {
        tokenMarkers += `,${markerValues[0]}`;
      }
    }

    if (/remove/i.test(effectType)) {
      const markerValIndex = /add/i.test(effectType) ? 1 : 0;

      if (tokenMarkers.includes(markerValues[markerValIndex])) {
        tokenMarkers = tokenMarkers
          .split(/\s*,\s*/)
          .filter((marker) => marker !== markerValues[markerValIndex])
          .join(",");
      }
    }

    token.set("statusmarkers", tokenMarkers);
  }

  function setAura(token, aura, auraValues) {
    const auraRadius = auraValues[0] != "0" ? parseInt(auraValues[0]) : "";
    const isSquareAura = /^(true|square)$/i.test(auraValues[1]);

    token.set(`${aura}_radius`, auraRadius);
    token.set(`${aura}_square`, isSquareAura);
    token.set(`${aura}_color`, auraValues[2]);

    if (auraValues[3]) {
      token.set(`showplayers_${aura}`, /^true$/i.test(auraValues[3]));
    }
  }

  function runEffect(token, effectType, effectValues) {
    const {
      ADD_MARKER,
      REMOVE_MARKER,
      ADD_REMOVE_MARKER,
      TINT,
      AURA_1,
      AURA_2,
      COMMAND,
    } = EFFECT_TYPES;

    switch (effectType) {
      case ADD_MARKER:
        setMarkers(token, ADD_MARKER, effectValues);
        break;
      case REMOVE_MARKER:
        setMarkers(token, REMOVE_MARKER, effectValues);
        break;
      case ADD_REMOVE_MARKER:
        setMarkers(token, ADD_REMOVE_MARKER, effectValues);
        break;
      case TINT:
        token.set("tint_color", effectValues[0]);
        break;
      case AURA_1:
        setAura(token, "aura1", effectValues);
        break;
      case AURA_2:
        setAura(token, "aura2", effectValues);
        break;
      case COMMAND:
        sendChat("", effectValues[0], null, { noarchive: true });
        break;
      default:
        break;
    }
  }

  function runThresholds(bar, tokenID) {
    const {
      ONLY_TOKENS,
      EXCEPT_TOKENS,
      COMPARE_TYPE,
      COMPARE_VALUES,
      EFFECT_TYPE,
      EFFECT_VALUES,
    } = THRESHOLD_KEYS;

    _.each(state.BarThresholds[bar], (threshold) => {
      if (
        _.contains(threshold[EXCEPT_TOKENS], tokenID) ||
        (threshold[ONLY_TOKENS].length &&
          !_.contains(threshold[ONLY_TOKENS], tokenID))
      ) {
        return;
      }

      const token = getObj("graphic", tokenID);

      if (
        !runComparison(
          bar,
          token,
          threshold[COMPARE_TYPE],
          threshold[COMPARE_VALUES]
        )
      ) {
        return;
      }

      runEffect(token, threshold[EFFECT_TYPE], threshold[EFFECT_VALUES]);
    });
  }

  function renderCommandString(command, bar) {
    let targetsQuery = "?{Threshold targets";
    let comparisonTypeQuery = "?{Comparison type";
    let effectTypeQuery = "?{Effect type";

    _.each(TARGET_TYPES, (targetTypeValue) => {
      targetsQuery += `|${targetTypeValue}`;
    });

    _.each(COMPARISON_TYPES, (comparisonTypeValue) => {
      comparisonTypeQuery += `|${comparisonTypeValue}`;
    });

    _.each(EFFECT_TYPES, (effectTypeValue) => {
      effectTypeQuery += `|${effectTypeValue}`;
    });

    targetsQuery += "}";
    comparisonTypeQuery += "}";
    effectTypeQuery += "}";

    return `!thresh ${command}|${bar}|${targetsQuery}|${comparisonTypeQuery}|?{Comparison value(s)}|${effectTypeQuery}|?{Effect value(s)}`;
  }

  function buildConfigNav() {
    const { currentTab } = state.BarThresholds;
    const { INSTRUCTIONS, THRESHOLDS } = CONFIG_TABS;

    const instructionsTabCSS = `${configNavCSS} ${
      currentTab === INSTRUCTIONS ? configNavActiveCSS : ""
    }`;

    const thresholdsTabCSS = `${configNavCSS} ${
      currentTab === THRESHOLDS ? configNavActiveCSS : ""
    }`;

    return `<div style='margin-bottom: 20px;'><a href='!thresh config|${INSTRUCTIONS}' style='${instructionsTabCSS}'>Instructions</a><a href='!thresh config|${THRESHOLDS}' style='${thresholdsTabCSS}$'>Thresholds</a></div>`;
  }

  function buildThresholdCard(bar, threshold, index) {
    const { ALL, ONLY_SELECTED, EXCEPT_SELECTED } = TARGET_TYPES;
    const {
      ONLY_TOKENS,
      EXCEPT_TOKENS,
      COMPARE_TYPE,
      COMPARE_VALUES,
      EFFECT_TYPE,
      EFFECT_VALUES,
    } = THRESHOLD_KEYS;

    let targetsText;
    let targetsList = [];

    if (
      _.isEmpty(threshold[ONLY_TOKENS]) &&
      _.isEmpty(threshold[EXCEPT_TOKENS])
    ) {
      targetsText = ALL;
    } else {
      const targetsArray = !_.isEmpty(threshold[ONLY_TOKENS])
        ? threshold[ONLY_TOKENS]
        : threshold[EXCEPT_TOKENS];
      targetsText = !_.isEmpty(threshold[ONLY_TOKENS])
        ? ONLY_SELECTED
        : EXCEPT_SELECTED;

      _.each(targetsArray, (target) => {
        const token = getObj("graphic", target);

        targetsList.push(token.get("name"));
      });
    }

    return (
      `<li style="${thresholdCardCSS}"><div><span style="${thresholdCardHeaderCSS}">Threshold Targets:</span><span>${targetsText}</span><span style="${thresholdCardSeparatorCSS}">${targetsList.join(
        ", "
      )}</span></div>` +
      `<div><span style="${thresholdCardHeaderCSS}">Comparison:</span><span>${
        threshold[COMPARE_TYPE]
      }</span><span style="${thresholdCardSeparatorCSS}">${threshold[
        COMPARE_VALUES
      ].join(", ")}</span></div>` +
      `<div><span style="${thresholdCardHeaderCSS}">Effect:</span><span>${
        threshold[EFFECT_TYPE]
      }</span><span style="${thresholdCardSeparatorCSS}">${threshold[
        EFFECT_VALUES
      ].join(", ")}</span></div>` +
      `<div style="margin-top: 10px;"><a href="${renderCommandString(
        `${COMMANDS.EDIT_THRESHOLD}-${index}`,
        bar
      )}" style="margin-right: 10px; ${thresholdCardButtonCSS}">Edit threshold</a><a href="!thresh ${
        COMMANDS.DELETE_THRESHOLD
      }-${index}|${bar}" style="color: red; ${thresholdCardButtonCSS}">Delete threshold</a></div></li>`
    );
  }

  function buildThresholdList() {
    const { bar1, bar2, bar3 } = state.BarThresholds;
    let fullThresholdList = "";

    _.each([bar1, bar2, bar3], (bar, barIndex) => {
      let barThresholdList = "";
      _.each(bar, (thresholdItem, thresholdIndex) => {
        barThresholdList += buildThresholdCard(
          `bar${barIndex + 1}`,
          thresholdItem,
          thresholdIndex
        );
      });

      fullThresholdList += `<h2>Bar ${
        barIndex + 1
      } Thresholds</h2><ul style="${listCSS}">${barThresholdList}</ul>`;
    });

    return fullThresholdList;
  }

  function buildThresholdTab() {
    const configCharacter = getObj("character", state.BarThresholds.configId);

    configCharacter.get("bio", (bio) => {
      configCharacter.set("bio", buildConfigNav() + buildThresholdList());
    });
  }

  function handleChatInput(message) {
    if (
      !playerIsGM(message.playerid) ||
      message.type !== "api" ||
      !/^!thresh/i.test(message.content)
    ) {
      return;
    }

    try {
      const { ADD_THRESHOLD, DELETE_THRESHOLD, EDIT_THRESHOLD } = COMMANDS;
      const [prefix, ...commandArgs] = message.content.split(/\|/g);
      const keyword = prefix.split(/!thresh\s*|-/i)[1].toLowerCase();
      const editOrDeleteIndex = parseInt(prefix.split(/-/i)[1]);

      switch (keyword) {
        case ADD_THRESHOLD:
          state.BarThresholds[commandArgs[0]].push(
            createThreshold(message.selected, commandArgs)
          );
          buildThresholdTab();
          break;
        case EDIT_THRESHOLD:
          const editedThreshold = createThreshold(
            message.selected,
            commandArgs
          );

          const barStateAfterEdit = _.map(
            state.BarThresholds[commandArgs[0]],
            (threshold, index) => {
              if (index === editOrDeleteIndex) {
                return editedThreshold;
              }
              return threshold;
            }
          );

          state.BarThresholds[commandArgs[0]] = barStateAfterEdit;
          buildThresholdTab();
          break;
        case DELETE_THRESHOLD:
          log(editOrDeleteIndex);
          const barStateAfterDelete = _.filter(
            state.BarThresholds[commandArgs[0]],
            (threshold, index) => {
              return index !== editOrDeleteIndex;
            }
          );
          log(barStateAfterDelete);

          state.BarThresholds[commandArgs[0]] = barStateAfterDelete;
          buildThresholdTab();
          break;
        default:
          break;
      }
    } catch (error) {
      sendErrorMessage(error.message);
    }
  }

  function setConfigOnReady() {
    let configCharacter = findObjs({
      type: "character",
      name: THRESH_CONFIG_NAME,
    })[0];

    if (!configCharacter) {
      configCharacter = createObj("character", {
        name: THRESH_CONFIG_NAME,
      });

      state.BarThresholds.configId = configCharacter.id;
    } else if (
      !state.BarThresholds.configId ||
      state.BarThresholds.configId !== configCharacter.id
    ) {
      state.BarThresholds.configId = configCharacter.id;
    }

    if (!state.BarThresholds.currentTab) {
    }
  }

  function checkInstall() {
    if (!_.has(state, "BarThresholds")) {
      log("Installing " + THRESH_DISPLAY_NAME);
      state.BarThresholds = JSON.parse(JSON.stringify(DEFAULT_STATE));
    } else if (state.BarThresholds.version !== VERSION) {
      log("Updating to " + THRESH_DISPLAY_NAME);

      state.BarThresholds = _.extend(
        {},
        JSON.parse(JSON.stringify(DEFAULT_STATE)),
        state.BarThresholds
      );
      state.BarThresholds.version = VERSION;
    }

    setConfigOnReady();
    log(
      `${THRESH_DISPLAY_NAME} installed. Last updated ${new Date(
        LAST_UPDATED
      ).toLocaleDateString()}.`
    );
  }

  function registerEventHandlers() {
    on("chat:message", handleChatInput);
    on("change:graphic:bar1_value", (obj) => {
      runThresholds("bar1", obj.id);
    });
  }

  return {
    renderCommandString,
    CheckInstall: checkInstall,
    RegisterEventHandlers: registerEventHandlers,
  };
})();

on("ready", () => {
  "use strict";

  BarThresholds.CheckInstall();
  BarThresholds.RegisterEventHandlers();

  // sendChat(
  //   "",
  //   `<a href="${BarThresholds.renderCommandString(
  //     "bar1"
  //   )}">Add threshold</a>`
  // );
});
