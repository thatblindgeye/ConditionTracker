/**
 * BarThresholds
 *
 * Version 1.0
 * Last updated: August 25, 2022
 * Author: thatblindgeye
 * GitHub: https://github.com/thatblindgeye
 */

const BarThresholds = (function () {
  "use strict";

  const VERSION = "1.0";
  const LAST_UPDATED = 1661428595876;
  const THRESH_DISPLAY_NAME = `BarThresholds v${VERSION}`;
  const THRESH_CONFIG_NAME = "BarThresholds Config";

  const COMMANDS = {
    ADD_THRESHOLD: "add",
    DELETE_THRESHOLD: "delete",
    EDIT_THRESHOLD: "edit",
    CONFIG: "config",
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
    AURA_RADIUS: /^[^\D]\d*\.?\d?$/,
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

  const DEFAULT_STATE = {
    bar1: [],
    bar2: [],
    bar3: [],
    configId: "",
    currentTab: "",
    version: "1.0",
  };

  const configNavActiveCSS = "background-color: #e4dfff;";
  const configNavCSS =
    "padding: 10px; border-radius: 25px; margin-right: 10px;";

  const thresholdCardHeaderCSS = "margin-right: 10px;";
  const thresholdCardSeparatorCSS =
    "margin-left: 10px; padding-left: 10px; border-left: 1px solid rgb(100, 100, 100);";
  const thresholdCardButtonCSS =
    "font-weight:bold; border-radius: 25px; border: 1px solid rgba(100, 100, 100, 0.5); padding: 4px 8px;";

  const listCSS = "margin: 0px; list-style: none;";
  const thresholdCardCSS =
    "margin-bottom: 10px; padding: 10px 5px; border: 1px solid rgb(100, 100, 100);";

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

      if (parseFloat(values[0]) > parseFloat(values[1])) {
        throw new Error(
          `When using the <code>${GREATER_LESS}</code> or <code>${GREATER_LESS_EQUAL}</code> comparison types, the first value passed in (the "greater than..." comparison value) must be smaller than the second value passed in (the "less than..." comparison value). A threshold will not trigger because a bar value cannot be both greater than (or equal to) <code>${values[0]}</code> and less than (or equal to) <code>${values[1]}</code>.`
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
          `${values[0]} is not a valid value for the aura radius. Aura radius must be a positive integer, e.g. <code>5</code>, or <code>0</code> to remove the aura.`
        );
      }

      if (!REGEX.AURA_SHAPE.test(values[1].trim())) {
        throw new Error(
          `${values[1]} is not a valid value for the aura shape. You must pass in either <code>square</code> or <code>false</code> or <code>circle</code> as an aura shape value.`
        );
      }
    }

    return values;
  }

  function setThresholdTargets(targets, selectedTokens) {
    const { ONLY_TOKENS, EXCEPT_TOKENS } = THRESHOLD_KEYS;
    const { ALL, ONLY_SELECTED } = TARGET_TYPES;

    if (selectedTokens && targets !== ALL) {
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

  function getEditedThresholdValues(
    propertyToEdit,
    selectedTokens,
    commandArgs
  ) {
    const { COMPARE_TYPE, EFFECT_TYPE } = THRESHOLD_KEYS;
    let editedThresholdValues = {};

    if (propertyToEdit === "targets") {
      editedThresholdValues = {
        ...setThresholdTargets(commandArgs[1], selectedTokens),
      };
    } else if (propertyToEdit === "comparison") {
      const newCompareValues = commandArgs[2]
        .split(/\s*,\s*/)
        .map((value) => trimWhitespace(value));

      editedThresholdValues = {
        [COMPARE_TYPE]: commandArgs[1],
        ...validateComparisonValues(commandArgs[1], newCompareValues),
      };
    } else if (propertyToEdit === "effect") {
      editedThresholdValues = {
        [EFFECT_TYPE]: commandArgs[1],
        ...formatEffectValues(commandArgs[1], commandArgs[2]),
      };
    }

    return editedThresholdValues;
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
      return Math.floor(parseInt(barMax) * percentAsDecimal);
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
    const auraRadius = auraValues[0] != "0" ? parseFloat(auraValues[0]) : "";
    const isSquareAura = /^(square)$/i.test(auraValues[1]);

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

  function createQueryStrings(command, bar) {
    let targetsQuery = "?{Threshold targets";
    _.each(TARGET_TYPES, (targetTypeValue) => {
      targetsQuery += `|${targetTypeValue}`;
    });

    let comparisonTypeQuery = "?{Comparison type";
    _.each(COMPARISON_TYPES, (comparisonTypeValue) => {
      comparisonTypeQuery += `|${comparisonTypeValue}`;
    });

    let effectTypeQuery = "?{Effect type";
    _.each(EFFECT_TYPES, (effectTypeValue) => {
      effectTypeQuery += `|${effectTypeValue}`;
    });

    targetsQuery += "}";
    comparisonTypeQuery += "}";
    effectTypeQuery += "}";

    return { targetsQuery, comparisonTypeQuery, effectTypeQuery };
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

  function buildInstructionsContent() {
    state.BarThresholds.currentTab = CONFIG_TABS.INSTRUCTIONS;
    return `
      <h1>${THRESH_CONFIG_NAME}</h1>
        <h2>Adding a Threshold</h2>
        <p>Each token bar has its own section in the "Thresholds" tab of the BarThresholds Config character bio. Clicking the "Add threshold" button within a section will trigger a series of dialogs for you to enter threshold data.</p>
          <h3>Threshold Targets</h3>
            <p>This dialog determines which tokens a threshold will affect. The possible options are:</p>
            <ul>
              <li><span style="font-weight: bold;">All tokens</span>: The threshold will affect every token.</li>
              <li><span style="font-weight: bold;">Only selected tokens</span>: The threshold will affect only the tokens that are selected when the threshold is created.</li>
              <li><span style="font-weight: bold;">Except selected tokens</span>: The opposite of the previous option. The threshold will affect all tokens except ones that are selected when the threshold is created.</li>
            </ul>
            <p>When choosing the "Only selected tokens" or "Except selected tokens" option, you should ensure you select any tokens before clicking "submit" on the final "Effect value(s)" step.</p>
          <h3>Comparison Type</h3>
            <p>This dialog determines what comparison is made against the applicable bar value when a threshold runs. If a comparison returns <code>false</code> for a threshold target the threshold will stop executing, and if the comparison returns <code>true</code> it will continue executing to run the linked effect. The possible options are:</p>
            <ul>
              <li><span style='font-weight: bold;'>Equal to</span>: The comparison will return <code>true</code> only when the bar value is equal to the comparison value. This comparison type can be used for both numbers or strings, and the comparison does not check for strict equality. For example, if the comparison value is <code>5</code>, the comparison will return <code>true</code> when the bar value is also <code>5</code>, regardless if the value type is a number or string. Note that this is the only comparison type that can have non-integers or non-percentages entered as a comparison value.</li>
              <li><span style='font-weight: bold;'>Greater than</span>: The comparison will return <code>true</code> only when the bar value is greater than the comparison value.</li>
              <li><span style='font-weight: bold;'>Less than</span>: The comparison will return <code>true</code> only when the bar value is less than the comparison value.</li>
              <li><span style='font-weight: bold;'>Greater than or equal to</span>: The comparison will return <code>true</code> when the bar value is either greater than or equal to the comparison value.</li>
              <li><span style='font-weight: bold;'>Less than or equal to</span>: The comparison will return <code>true</code> when the bar value is either less than or equal to the comparison value.</li>
              <li><span style='font-weight: bold;'>Greater than X and Less than Y</span>: The comparison will return <code>true</code> only when the bar value is both greater than one comparison value and less than another comparison value.</li>
              <li><span style='font-weight: bold;'>Greater than or equal to X and Less than or equal to Y</span>: The comparison will return <code>true</code> only when the bar value is both greater than or equal to one comparison value, and less than or equal to another comparison value.</li>
            </ul>
            <p>When the "Greater than X and Less than Y" comparison type is selected, you must also make sure the two values entered are not the same (a bar value cannot be both greater than 50 and less than 50).</p>
            <p>When the "Greater than X and Less than Y" or "Greater than or equal to X and Less than or equal to Y" comparison types are selected, you must enter two values as a comma separated list, e.g. <code>10, 20</code>. Additionally, the first value entered must be smaller than the second value entered, otherwise the threshold will not be created (a bar value cannot be both greater than (or equal to) 50 and less than (or equal to) 25).</p>
          <h3>Comparison Value(s)</h3>
            <p>This dialog determines the value to compare a bar value against in the comparison that is ran. You can enter either a string e.g. <code>five</code> (only when using a comparison type of <code>Equal to</code>), an integer e.g. <code>5</code>, or a percentage e.g. <code>25%</code>. If left blank, the threshold will not be created.</p>
            <p>When a percentage is entered, the comparison value will be the specified percentage of the bar max, rounded down. For example, if a value of <code>25%</code> is entered and a threshold target has a bar max of <code>50</code>, the comparison value will be <code>12</code> (50 x 25% = 12.5, rounded down to 12).</p>
            <p>if a threshold target does not have a bar max set when a percentage is entered as the comparison value, the comparison will return <code>false</code> and the threshold's effect will not be called.</p>
          <h3>Effect Type</h3>
            <p>This dialog determines what effect will be ran when a comparison returns <code>true</code>. The possible options are:</p>
            <ul>
              <li><span style='font-weight: bold;'>Add marker</span>: This will add a single marker to the threshold target. This effect will only add a single marker, even if the same threshold executes multiple times on the same target. For all marker effect types, you must enter a marker name that exists in your campaign, otherwise the threshold will not be created.</li>
              <li><span style='font-weight: bold;'>Remove marker</span>: This will remove a single marker from the threshold target. If the target has multiple of the specified marker, all instances of that marker will be removed.</li>
              <li><span style='font-weight: bold;'>Add marker and Remove marker</span>This will add one marker to the threshold target, and remove another marker from them. When entering a value for this effect type, you must enter a comma separated list of values, e.g. <code>red, yellow</code> would add the "red" marker and remove the "yellow" marker.</li>
              <li><span style='font-weight: bold;'>Update tint color</span>: This will update the tint color for the threshold target. When entering a value for this effect type, you must enter a HEX color with 6 digits, e.g. <code>#ff0000</code>. Shorthand HEX values are not allowed.</li>
              <li><span style='font-weight: bold;'>Update aura 1</span> and <span style='font-weight: bold;'>Update aura 2</span>: This will update one of the two aura's on the threshold target. When entering a value for this effect type, you must enter either <code>0</code> to turn the aura off or a comma separated list formatted as <code>aura radius, aura shape, aura color, optional boolean to show the aura to players</code>.<br/><br/>The aura radius must be a positive number, either an integer or decimal. The aura shape must either be a value of <code>circle</code> or <code>square</code>. The aura color must be a HEX color with 6 digits (shorthand HEX values are not allowed). By default, an aura radius is set to not be shown to players, so this value can be omitted if you do not want the aura to be shown to players when set via the threshold.</li>
              <li><span style='font-weight: bold;'>Custom command</span>: This effect type allows you to enter a custom command from another script you have installed in the campaign. Due to how the BarThresholds script handles splitting apart its own commands to parse the various parameters, when entering a custom command you must use the HTML entities for vertical pipes <code>|</code> and commas <code>,</code>. The HTML entitiy for vertical pipes is <code>&#124;</code>, and the HTML entity for commas is <code>&#44;</code>.<br/><br/>For example, to enter a custom command such as <code>!prefix keyword|option1, option2</code>, you would have to enter <code>!prefix keyword&#124;option1&#44; option2</code>. BarThresholds will then replace the entities to the correct characters so that the commands will run correctly when the threshold is triggered.</li>
            </ul>
          <h3>Effect Value(s)</h3>
            <p>This dialog determines the actual value(s) of the chosen effect type. If left blank, the threshold will not be created.</p>
        <h2>Editing and Deleting Thresholds</h2>
          <p>Each individual threshold can be edited or deleted after creation. For each threshold, you can click the "Threshold Targets", "Comparison", or "Effect" buttons to edit the related properties of that threshold.</p>
          <p>After clicking the "Delete threshold" button, a dialog asking you to confirm the deletion will appear, with the default selection being "Cancel" as a precaution to avoid accidental deletion.</p>
        <h2>Running Thresholds in External Scripts</h2>
          <p><code>BarThresholds.RunThresholds(bar, tokenID)</code></p>
          <p>The <code>runThresholds</code> method is exported from the BarThresholds script, allowing you to run thresholds in your own custom commands outside of the <code>change:graphic:barX_value</code> event. This can be especially useful if a token's bar value is set via Roll20's <code>set</code> method, as this will not trigger the <code>change:graphic:barX_value</code> events within the BarThresholds script.</p>
          <p>When using the <code>runThresholds</code> method, you must pass in two parameters: a <code>bar</code> and a <code>tokenID</code>. The<code>bar</code> parameter determines which bar thresholds to run and must be a value of either "bar1", "bar2", or "bar3". The <code>tokenID</code> parameter determines whether the token with that ID is a valid threshold target. This can either be manually passed in as a string, e.g. <code>"-N8u_AM_kks6if4OUmhT"</code>, or it can be passed in by accessing the <code>id</code> property on an object, e.g. <code>obj.id</code>.</p>`;
  }

  function buildThresholdCard(bar, threshold, index) {
    const { targetsQuery, comparisonTypeQuery, effectTypeQuery } =
      createQueryStrings();
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
      `<li style="${thresholdCardCSS}"><div><a href="!thresh ${
        COMMANDS.EDIT_THRESHOLD
      }-${index}-targets|${bar}|${targetsQuery}" style="${thresholdCardHeaderCSS}; ${thresholdCardButtonCSS}">Threshold Targets</a><span>${targetsText}</span><span style="${thresholdCardSeparatorCSS}">${targetsList.join(
        ", "
      )}</span></div>` +
      `<div style="margin-top: 10px"><a href="!thresh ${
        COMMANDS.EDIT_THRESHOLD
      }-${index}-comparison|${bar}|${comparisonTypeQuery}|?{Comparison value(s)}" style="${thresholdCardHeaderCSS}; ${thresholdCardButtonCSS}">Comparison</a><span>${
        threshold[COMPARE_TYPE]
      }</span><span style="${thresholdCardSeparatorCSS}">${threshold[
        COMPARE_VALUES
      ].join(", ")}</span></div>` +
      `<div style="margin-top: 10px"><a href="!thresh ${
        COMMANDS.EDIT_THRESHOLD
      }-${index}-effect|${bar}|${effectTypeQuery}|?{Effect value(s)}" style="${thresholdCardHeaderCSS}; ${thresholdCardButtonCSS}">Effect</a><span>${
        threshold[EFFECT_TYPE]
      }</span><span style="${thresholdCardSeparatorCSS}">${threshold[
        EFFECT_VALUES
      ].join(", ")}</span></div>` +
      `<div style="margin-top: 25px;"><a href="!thresh ${COMMANDS.DELETE_THRESHOLD}-${index}|${bar}|?{Confirm deletion|Cancel|Confirm}" style="color: red; ${thresholdCardButtonCSS}">Delete threshold</a></div></li>`
    );
  }

  function buildThresholdList() {
    const { targetsQuery, comparisonTypeQuery, effectTypeQuery } =
      createQueryStrings();
    const { bar1, bar2, bar3 } = state.BarThresholds;
    let fullThresholdList = "";

    _.each([bar1, bar2, bar3], (bar, barIndex) => {
      let barThresholdList = "";
      const barName = `bar${barIndex + 1}`;
      _.each(bar, (thresholdItem, thresholdIndex) => {
        barThresholdList += buildThresholdCard(
          barName,
          thresholdItem,
          thresholdIndex
        );
      });

      fullThresholdList += `<div style="margin-bottom: 10px"><h2>Bar ${
        barIndex + 1
      } Thresholds</h2><a style="margin-top: 10px; ${thresholdCardButtonCSS}" href="!thresh ${
        COMMANDS.ADD_THRESHOLD
      }|${barName}|${targetsQuery}|${comparisonTypeQuery}|?{Comparison value(s)}|${effectTypeQuery}|?{Effect value(s)}">Add ${barName} threshold</a></div><ul style="${listCSS}">${barThresholdList}</ul>`;
    });

    return `<h1>${THRESH_CONFIG_NAME}</h1>${fullThresholdList}`;
  }

  function buildConfigTab(tabName) {
    state.BarThresholds.currentTab = tabName;
    const buildCallback =
      tabName === CONFIG_TABS.INSTRUCTIONS
        ? buildInstructionsContent
        : buildThresholdList;

    const configCharacter = getObj("character", state.BarThresholds.configId);
    configCharacter.set("bio", buildConfigNav() + buildCallback());
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
      const { ADD_THRESHOLD, DELETE_THRESHOLD, EDIT_THRESHOLD, CONFIG } =
        COMMANDS;
      const { THRESHOLDS } = CONFIG_TABS;
      const [prefix, ...commandArgs] = message.content.split(/\|/g);
      let [keyword, editOrDeleteIndex, propertyToEdit] = prefix
        .split(/!thresh\s*|-/i)
        .filter((item) => item !== "");

      switch (keyword.toLowerCase()) {
        case ADD_THRESHOLD:
          state.BarThresholds[commandArgs[0]].push(
            createThreshold(message.selected, commandArgs)
          );
          buildConfigTab(THRESHOLDS);
          break;
        case EDIT_THRESHOLD:
          const editedThresholdValues = getEditedThresholdValues(
            propertyToEdit,
            message.selected,
            commandArgs
          );

          const barStateAfterEdit = _.map(
            state.BarThresholds[commandArgs[0]],
            (threshold, index) => {
              if (index === parseInt(editOrDeleteIndex)) {
                return _.extend({}, threshold, editedThresholdValues);
              }
              return threshold;
            }
          );

          state.BarThresholds[commandArgs[0]] = barStateAfterEdit;
          buildConfigTab(THRESHOLDS);
          break;
        case DELETE_THRESHOLD:
          if (commandArgs[1] !== "Confirm") {
            return;
          }
          const barStateAfterDelete = _.filter(
            state.BarThresholds[commandArgs[0]],
            (threshold, index) => index !== parseInt(editOrDeleteIndex)
          );

          state.BarThresholds[commandArgs[0]] = barStateAfterDelete;
          buildConfigTab(THRESHOLDS);
          break;
        case CONFIG:
          buildConfigTab(commandArgs[0]);
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
      state.BarThresholds.currentTab = CONFIG_TABS.INSTRUCTIONS;
      buildConfigTab(CONFIG_TABS.INSTRUCTIONS);
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
      ).toLocaleDateString("en-US", {
        dateStyle: "long",
      })}.`
    );
  }

  function registerEventHandlers() {
    on("chat:message", handleChatInput);

    _.each([1, 2, 3], (barNumber) => {
      on(`change:graphic:bar${barNumber}_value`, (obj) => {
        runThresholds(`bar${barNumber}`, obj.id);
      });
    });
  }

  return {
    CheckInstall: checkInstall,
    RegisterEventHandlers: registerEventHandlers,
    RunThresholds: runThresholds,
  };
})();

on("ready", () => {
  "use strict";

  BarThresholds.CheckInstall();
  BarThresholds.RegisterEventHandlers();
});
