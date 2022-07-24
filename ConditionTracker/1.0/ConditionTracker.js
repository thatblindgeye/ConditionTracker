/**
 * ConditionTracker
 *
 * Version 1.0
 * Last updated: July 23, 2022
 * Author: thatblindgeye
 *
 * Command syntax:
 * !ct <keyword>|<options>|<optional modifier>
 *
 * To-do:
 *  Write functions to:
 * DONE   - check whether a character named "ConditionTracker Config" exists in the campaign
 * DONE     - If not, create it
 * DONE   - create a table based on the CT conditions state (see Note 1)
 * DONE     - set CT Config's bio to this table
 * DONE   - convert CT Config's bio table to an array of condition objects
 * DONE     - set CT conditions state to this array
 * DONE   - Update logic for checking duplicate names to not allow any dup regardless of letter case
 *  Refactor code to reduce duplication
 *
 * Note 1:
 * <table class=\"userscript-table userscript-table-bordered\"><thead><tr><th>Condition<br></th><th>Marker<br></th><th>Effects<br></th></tr></thead><tbody><tr><td>blinded<br></td><td>null<br></td><td><ul><li>effect one</li><li>effect two<br></li></ul></td></tr><tr><td>deafened<br></td><td>skull<br></td><td><ul><li>Effect one<br></li></ul></td></tr></tbody></table><p><br></p>
 * <table><thead><tr><th>Condition</th><th>Marker</th><th>Effects</th></tr></thead><tbody><tr><td>blinded</td><td>null</td><td><ul><li>effect one</li><li>effect two</li></ul></td></tr><tr><td>deafened</td><td>skull</td><td><ul><li>Effect one</li></ul></td></tr></tbody></table>
 */

var ConditionTracker =
  ConditionTracker ||
  (function () {
    "use strict";

    /**
     * ************************************************************************
     *
     * Reassignable variables
     *
     * ************************************************************************
     */

    let campaignMarkers;
    let resetAttempted = false;
    let uniqueId = Number(Date.now().toString().slice(-5));

    /**
     * ************************************************************************
     *
     * Constants for global use
     *
     * ************************************************************************
     */

    const VERSION = "1.0";
    const LAST_UPDATED = 1658618628749;
    const CT_DISPLAY_NAME = `ConditionTracker v${VERSION}`;
    const CT_CONFIG_NAME = "ConditionTracker Config";
    const COMMANDS_LIST = {
      help: {
        keyword: "help",
        description:
          "Sends to chat a table of valid ConditionTracker commands and their descriptions.",
        syntax: "<cod>!ct help</code>",
        modifiers: [],
      },
      reset: {
        keyword: "reset",
        description:
          "Resets the ConditionTracker state to version " +
          VERSION +
          "'s default. <strong>This will overwrite any customizatons made to the campaign's current ConditionTracker state and cannot be undone</strong>.",
        syntax:
          "<code>!ct reset</code>, followed by <code>!ct reset|confirm</code> or <code>!ct reset|cancel</code>",
        modifiers: [],
      },
      markers: {
        keyword: "markers",
        description:
          "Sends to chat a table of token markers currently available in the campaign, excluding the default Roll20 color and death markers. The table includes the marker image and name.",
        syntax: "<code>!ct campaign</code>",
        modifiers: [],
      },
      addCondition: {
        keyword: "add",
        description:
          "Cumulatively adds the specified condition(s) to the selected token(s) tooltip. If a valid marker is linked to the condition, the linked marker will also be cumulatively added to the token. Useful if multiple instances of a condition has a different meaning than a single instance.",
        syntax:
          "<code>!ct add|&#60;comma separated list of conditions&#62;</code>, e.g. <code>!ct add|blinded, deafened</code>",
        modifiers: [],
      },
      removeCondition: {
        keyword: "remove",
        description:
          "Removes all instances of the specified condition(s) from the selected token(s) tooltip. If a valid marker is linked to the condition, all instances of the linked marker will also be removed from the token.",
        syntax:
          "<code>!ct remove|&#60;comma separated list of conditions&#62;</code>, e.g. <code>!ct remove|blinded, deafened</code>",
        modifiers: [
          {
            keyword: "single",
            description:
              "Removes only a single instance of the specified condition(s) from the selected token(s).",
          },
        ],
      },
      toggleCondition: {
        keyword: "toggle",
        description:
          "Toggles the specified condition(s) on the selected token(s) tooltip. If a condition is currently applied to a token it will be removed, otherwise the condition will be added. If a valid marker is linked to the condition, the linked marker will also be toggled on the token.",
        syntax:
          "<code>!ct toggle|&#60;comma separated list of conditions&#62;</code>, e.g. <code>!ct toggle|blinded, deafened</code>",
        modifiers: [],
      },
      currentConditions: {
        keyword: "conditions",
        description:
          "Sends to chat conditions and their descriptions depending on how the command is called. If any token is selected and no options are passed in, a list of conditions currently affecting that token is sent to chat. If a token is not selected, all conditions currently set in the campaign's config is sent to chat. If any options are passed in, the specified conditions are sent to chat.",
        syntax:
          "<code>!ct conditions</code> or <code>!ct conditions|&#60;comma separated list of conditions&#62;</code>, e.g. <code>!ct conditions|blinded, deafened</code>",
        modifiers: [],
      },
    };
    const DEFAULT_STATE = {
      version: "1.0",
      /**
       * A list of conditions that can be applied to a token, including descriptions.
       * Conditions that are passed in will be applied to a token's tooltip.
       *
       * By default a marker will only be added to a token if the condition passed in has a valid
       * markerName that matches a token marker within the campaign.
       *
       * Uses D&D 5e conditions as a default, but can be customized by editing the
       * ConditionTracker Config character bio.
       */
      conditions: [
        {
          conditionName: "Blinded",
          markerName: null,
          description: [
            "A blinded creature can't see and automatically fails any ability check that requires sight.",
            "Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage.",
          ],
        },
        {
          conditionName: "Charmed",
          markerName: "skull",
          description: [
            "A charmed creature can't attack the charmer or target the charmer with harmful abilities or magical effects.",
            "The charmer has advantage on any ability check to interact socially with the creature.",
          ],
        },
        {
          conditionName: "Deafened",
          markerName: null,
          description: [
            "A deafened creature can't hear and automatically fails any ability check that requires hearing.",
          ],
        },
      ],
    };

    /**
     * ************************************************************************
     *
     * Styles for HTML sent to chat
     *
     * ************************************************************************
     */

    const borderColorCSS = _.template("rgba(100, 100, 100, <%= opacity %>)");
    const headerBackgroundCSS = "background-color: blue";
    const headerColorCSS = "color: white";

    const containerCSS = _.template(
      `width: 100%; max-width: <%= maxWidth %>; border: 1px solid ${borderColorCSS(
        { opacity: "1" }
      )}`
    );
    const captionCSS = "font-size: 1.75rem; font-weight: bold;";
    const headerCSS = `${headerBackgroundCSS}; ${headerColorCSS}; padding: 5px;`;
    const tableCellCSS = "padding: 15px 5px; vertical-align: top;";
    const tableMarkerCellCSS = "padding: 15px 5px; vertical-align: middle;";
    const configTableHeaders = `vertical-align: top; ${headerBackgroundCSS}; ${headerColorCSS};`;

    const dividerCSS =
      "border-top: 1px solid " + borderColorCSS({ opacity: "0.5" });
    const listCSS = "margin: 0px; list-style: none;";
    const listItemCSS = "margin-bottom: 10px;";
    const descListItemCSS = _.template(
      "font-style: <%= fontStyle %>; opacity: 0.75;"
    );
    const conditionCardDescListCSS = "padding-top: 10px; margin-bottom: 0;";
    const conditionCardBorderCSS = _.template(
      `border-width: <%= width %>; border-style: solid; border-radius: <%= radius %>; border-color: ${borderColorCSS(
        { opacity: "1" }
      )};`
    );
    const conditionCardTermCSS =
      descListItemCSS({ fontStyle: "italic" }) +
      conditionCardBorderCSS({ width: "1px 1px 0", radius: "10px 10px 0 0" }) +
      "padding: 5px;";
    const conditionCardDefCSS =
      descListItemCSS({ fontStyle: "normal" }) +
      conditionCardBorderCSS({ width: "0 1px 1px", radius: "0 0 10px 10px" }) +
      "padding: 5px; margin-bottom: 10px;";

    /**
     * ************************************************************************
     *
     * Utility functions
     *
     * ************************************************************************
     */

    function getConditionMarkers(conditionsArray) {
      const { conditions } = state.ConditionTracker;

      const validMarkerNames = _.map(conditions, (condition) => {
        if (conditionsArray.includes(condition.conditionName.toLowerCase())) {
          return condition.markerName;
        }
      });

      return validMarkerNames.filter((marker) => marker !== null);
    }

    function capitalizeFirstLetter(str) {
      return str[0].toUpperCase() + str.slice(1);
    }

    function sortIgnoringCase(arrayToSort, property) {
      const arrayCopy = JSON.parse(JSON.stringify(arrayToSort));

      return arrayCopy.sort((toSortA, toSortB) => {
        const itemOne = property ? toSortA[property] : toSortA;
        const itemTwo = property ? toSortB[property] : toSortB;

        return itemOne.localeCompare(itemTwo, undefined, {
          sensitivity: "base",
        });
      });
    }

    function trimWhitespace(str, replacement = "") {
      return str.trim().replace(/&nbsp;/g, replacement);
    }

    function formatCommaSeparatedList(list, letterCase) {
      const arrayedList = list
        .split(",")
        .map((listItem) => trimWhitespace(listItem));

      return letterCase && letterCase.toLowerCase() === "lower"
        ? arrayedList.map((arrayItem) => arrayItem.toLowerCase())
        : arrayedList;
    }

    function getMarkersFromToken(
      tokenObj,
      filterCallback = (marker) => marker !== ""
    ) {
      const tokenMarkers = tokenObj.get("statusmarkers");
      const formattedMarkers = formatCommaSeparatedList(tokenMarkers);

      return filterCallback
        ? formattedMarkers.filter(filterCallback)
        : formattedMarkers;
    }

    function setMarkersOnToken(tokenObj, markersToSet) {
      tokenObj.set("statusmarkers", markersToSet.join(","));
    }

    function getTooltipFromToken(tokenObj) {
      const tokenTooltip = tokenObj.get("tooltip");
      return formatCommaSeparatedList(tokenTooltip, "lower");
    }

    function setTooltipOnToken(tokenObj, newTooltip) {
      const { conditions } = state.ConditionTracker;
      const filteredTooltip = newTooltip.filter(
        (tooltipItem) => tooltipItem !== ""
      );

      const formattedTooltip = filteredTooltip.map((tooltipToFormat) => {
        let conditionsIndex = _.findIndex(
          conditions,
          (conditionItem) =>
            conditionItem.conditionName.toLowerCase() === tooltipToFormat
        );

        if (conditionsIndex !== -1) {
          return conditions[conditionsIndex].conditionName;
        }

        return capitalizeFirstLetter(tooltipToFormat);
      });

      tokenObj.set("tooltip", formattedTooltip.sort().join(", "));
    }

    function checkNameValidity(currentConditionsList, conditionName) {
      let trimmedName = trimWhitespace(conditionName);

      if (trimmedName === "") {
        const namePlaceholder = `Condition ${uniqueId++}`;
        sendChat(
          CT_DISPLAY_NAME,
          `Condition name cannot be blank. Created new condition with name "${namePlaceholder}" instead.`
        );
        return namePlaceholder;
      } else if (trimmedName.includes("|")) {
        trimmedName = trimmedName.replace(/\|/g, "");
        sendChat(
          CT_DISPLAY_NAME,
          `Condition name cannot include vertical pipe characters (" | "). Created condition with name "${trimmedName}" instead.`
        );
      }

      const duplicateNames = currentConditionsList.filter(
        (condition) =>
          condition.conditionName.toLowerCase() === trimmedName.toLowerCase()
      );

      if (_.isEmpty(duplicateNames)) {
        return trimmedName;
      }

      const nameCopy = `${trimmedName}-${uniqueId++}`;
      sendChat(
        CT_DISPLAY_NAME,
        `Condition with name "${trimmedName}" already exists. Created condition with name "${nameCopy}" instead.`
      );
      return nameCopy;
    }

    function removeSingleInstance(itemsToRemove, itemsBeforeRemoval) {
      let itemsAfterRemoval;

      _.each(itemsToRemove, (itemToRemove) => {
        const firstItemIndex = itemsBeforeRemoval.indexOf(itemToRemove);

        if (firstItemIndex === -1) {
          return;
        } else if (firstItemIndex === 0) {
          itemsAfterRemoval = itemsBeforeRemoval
            .slice(1)
            .filter((marker) => marker !== "");
        } else {
          itemsAfterRemoval = [
            ...itemsBeforeRemoval.slice(0, firstItemIndex),
            ...itemsBeforeRemoval.slice(firstItemIndex + 1),
          ].filter((marker) => marker !== "");
        }
      });

      return itemsAfterRemoval;
    }

    /**
     * ************************************************************************
     *
     * Command functions
     *
     * ************************************************************************
     */

    function createHelpTable() {
      const createModifiersList = (modifiers) => {
        let modifierItems = "";
        if (!_.isEmpty(modifiers)) {
          _.each(modifiers, (modifier) => {
            modifierItems +=
              "<dt style='" +
              descListItemCSS({ fontStyle: "italic" }) +
              "'>" +
              modifier.keyword +
              "</dt><dd style='" +
              `${descListItemCSS({
                fontStyle: "normal",
              })} margin-bottom: 10px;` +
              "'>" +
              modifier.description +
              "</dd>";
          });
        }

        if (modifierItems) {
          return (
            "<div><div style='font-weight: bold;'>Modifiers</div><dl>" +
            modifierItems +
            "</dl></div>"
          );
        }

        return "<div>No modifiers exist for this command.</div>";
      };

      let commandRows = "";
      _.each(COMMANDS_LIST, (command) => {
        commandRows +=
          "<tr style='" +
          dividerCSS +
          "'><td style='" +
          tableCellCSS +
          "'>" +
          command.keyword +
          "</td><td style='" +
          tableCellCSS +
          "'>" +
          command.description +
          "<br/><br/>" +
          "<div><div style='font-weight: bold;'>Syntax</div><div>" +
          command.syntax +
          "</div></div><br/><br/>" +
          createModifiersList(command.modifiers) +
          "</td></tr>";
      });

      return (
        "<table style='" +
        containerCSS({ maxWidth: "500px" }) +
        "'><caption style='" +
        captionCSS +
        "'>ConditionTracker Commands</caption><thead><tr><th style='" +
        `${headerCSS} width: 30%;` +
        "'>Command</th><th style='" +
        headerCSS +
        "'>Description</th></tr></thead><tbody>" +
        commandRows +
        "</tbody></table>"
      );
    }

    function resetState(resetOption) {
      if (resetOption === "cancel") {
        resetAttempted = false;
        sendChat(
          CT_DISPLAY_NAME,
          "ConditionTracker state reset has been cancelled."
        );
        return;
      }

      if (resetAttempted && resetOption === "confirm") {
        const configCharacter = getObj(
          "character",
          state.ConditionTracker.configId
        );

        state.ConditionTracker = _.extend(
          {},
          JSON.parse(JSON.stringify(DEFAULT_STATE)),
          {
            configId: configCharacter.id,
          }
        );
        configCharacter.set("bio", createConfigFromState());
        resetAttempted = false;
        sendChat(
          CT_DISPLAY_NAME,
          "ConditionTracker state successfully reset to default state."
        );
      } else {
        resetAttempted = true;
        sendChat(
          CT_DISPLAY_NAME,
          "Resetting ConditionTracker state will overwrite any customizations made to the current state. <strong>This cannot be undone</strong>. Send <code>!ct reset|confirm</code> to continue with reset, or <code>~ct reset|cancel</code> to cancel."
        );
      }
    }

    function createMarkersTable(markers) {
      let markerRows = "";
      _.each(markers, (marker) => {
        markerRows +=
          "<tr style='" +
          dividerCSS +
          "'><td style='" +
          `${tableMarkerCellCSS} text-align: center;` +
          "'><img src='" +
          marker.url +
          "'></td><td style='" +
          tableMarkerCellCSS +
          "'>" +
          marker.name +
          "</td></tr>";
      });

      return (
        "<table style='" +
        containerCSS({ maxWidth: "300px" }) +
        "'><caption style='" +
        captionCSS +
        "'>Campaign Token Markers</caption><thead><tr><th style='" +
        `${headerCSS} width: 25%;` +
        "'>Image</th><th style='" +
        headerCSS +
        "'>Name</th></tr></thead><tbody>" +
        markerRows +
        "</tbody></table>"
      );
    }

    function addCondition(commandOptions, chatMessage) {
      const conditionsToAdd = formatCommaSeparatedList(commandOptions, "lower");
      const markersToAdd = getConditionMarkers(conditionsToAdd);

      _.each(chatMessage.selected, (selectedItem) => {
        const token = getObj(selectedItem._type, selectedItem._id);

        if (markersToAdd.length) {
          const markersBeforeAdd = getMarkersFromToken(token);
          setMarkersOnToken(token, [...markersBeforeAdd, ...markersToAdd]);
        }

        const tooltipBeforeAdd = getTooltipFromToken(token);
        setTooltipOnToken(token, [...tooltipBeforeAdd, ...conditionsToAdd]);
      });
    }

    function removeSingleConditionInstance(commandOptions, chatMessage) {
      const conditionsToRemoveSingle = formatCommaSeparatedList(
        commandOptions,
        "lower"
      );
      const markersToRemoveSingle = getConditionMarkers(
        conditionsToRemoveSingle
      );

      _.each(chatMessage.selected, (selectedItem) => {
        const token = getObj(selectedItem._type, selectedItem._id);

        if (markersToRemoveSingle.length) {
          const markersBeforeRemoveSingle = getMarkersFromToken(token);
          const markersAfterRemoveSingle = removeSingleInstance(
            markersToRemoveSingle,
            markersBeforeRemoveSingle
          );

          if (markersAfterRemoveSingle) {
            setMarkersOnToken(token, markersAfterRemoveSingle);
          }
        }

        const tooltipBeforeRemoveSingle = getTooltipFromToken(token);
        const tooltipAfterRemoveSingle = removeSingleInstance(
          conditionsToRemoveSingle,
          tooltipBeforeRemoveSingle
        );

        if (tooltipAfterRemoveSingle) {
          setTooltipOnToken(token, tooltipAfterRemoveSingle);
        } else {
          token.set("tooltip", "");
        }
      });
    }

    function removeAllConditionInstances(commandOptions, chatMessage) {
      const conditionsToRemoveInstances = formatCommaSeparatedList(
        commandOptions,
        "lower"
      );
      const markersToRemoveInstances = getConditionMarkers(
        conditionsToRemoveInstances
      );

      _.each(chatMessage.selected, (selectedItem) => {
        const token = getObj(selectedItem._type, selectedItem._id);

        if (markersToRemoveInstances.length) {
          const markersAfterRemoveInstances = getMarkersFromToken(
            token,
            (marker) =>
              marker !== "" && !markersToRemoveInstances.includes(marker)
          );

          setMarkersOnToken(token, markersAfterRemoveInstances);
        }

        const tooltipAfterRemoveInstances = getTooltipFromToken(token).filter(
          (condition) => !conditionsToRemoveInstances.includes(condition)
        );

        setTooltipOnToken(token, tooltipAfterRemoveInstances);
      });
    }

    function removeAllConditions(chatMessage) {
      _.each(chatMessage.selected, (selectedItem) => {
        const token = getObj(selectedItem._type, selectedItem._id);
        const tooltipBeforeRemoveAll = getTooltipFromToken(token);
        const markersBeforeRemoveAll = getConditionMarkers(
          tooltipBeforeRemoveAll
        );

        if (markersBeforeRemoveAll.length) {
          const markersAfterRemoveAll = getMarkersFromToken(
            token,
            (marker) =>
              marker !== "" && !markersBeforeRemoveAll.includes(marker)
          );

          setMarkersOnToken(token, markersAfterRemoveAll);
        }

        token.set("tooltip", "");
      });
    }

    function toggleCondition(commandOptions, chatMessage) {
      const conditionsToToggle = formatCommaSeparatedList(
        commandOptions,
        "lower"
      );
      const markersToToggle = getConditionMarkers(conditionsToToggle);

      _.each(chatMessage.selected, (selectedItem) => {
        const token = getObj(selectedItem._type, selectedItem._id);

        if (markersToToggle.length) {
          const markersBeforeToggle = getMarkersFromToken(token);
          const sharedMarkers = _.intersection(
            markersBeforeToggle,
            markersToToggle
          );
          const markersAfterToggle = [
            ...markersBeforeToggle,
            ...markersToToggle,
          ].filter((marker) => !sharedMarkers.includes(marker));

          setMarkersOnToken(token, markersAfterToggle);
        }

        const tooltipBeforeToggle = getTooltipFromToken(token);
        const sharedConditions = _.intersection(
          tooltipBeforeToggle,
          conditionsToToggle
        );
        const tooltipAfterToggle = [
          ...tooltipBeforeToggle,
          ...conditionsToToggle,
        ].filter((tooltipItem) => !sharedConditions.includes(tooltipItem));

        setTooltipOnToken(token, tooltipAfterToggle);
      });
    }

    function createConditionCards(currentToken, commandOptions) {
      const { conditions } = state.ConditionTracker;
      let token;
      let caption;
      let conditionsToList;

      if (currentToken) {
        token = getObj(currentToken._type, currentToken._id);
        caption = `Conditions for ${token.get("name")}`;
        conditionsToList = getTooltipFromToken(token);
      } else {
        caption = "Campaign Conditions";

        if (commandOptions) {
          conditionsToList = formatCommaSeparatedList(commandOptions, "lower");
        }
      }

      const captionDiv =
        "<div style='" +
        `${captionCSS + headerCSS}` +
        "'>" +
        caption +
        "</div>";

      if (
        token &&
        conditionsToList.length === 1 &&
        conditionsToList[0] === ""
      ) {
        return (
          "<div style='" +
          containerCSS({ maxWidth: "300px" }) +
          "'>" +
          captionDiv +
          "<div style='padding: 10px;'>No conditions are currently applied to this token.</div></div>"
        );
      }

      const createSingleConditionCard = (
        conditionName,
        conditionDescription
      ) => {
        let conditionDescriptionList = "";

        if (!conditionDescription || _.isEmpty(conditionDescription)) {
          conditionDescriptionList =
            "<div style='" +
            listItemCSS +
            "'>No description has been defined for this condition.</div>";
        } else {
          _.each(conditionDescription, (desc) => {
            conditionDescriptionList +=
              "<div style='" + listItemCSS + "'>" + desc + "</div>";
          });
        }

        return (
          "<dt style='" +
          conditionCardTermCSS +
          "'>" +
          conditionName +
          "</dt><dd style='" +
          conditionCardDefCSS +
          "'>" +
          conditionDescriptionList +
          "</dd>"
        );
      };

      let conditionCards = "";
      if (conditionsToList) {
        _.each(conditionsToList, (condition) => {
          let conditionIndex = _.findIndex(
            conditions,
            (conditionItem) =>
              conditionItem.conditionName.toLowerCase() ===
              condition.toLowerCase()
          );

          if (conditionIndex !== -1) {
            conditionCards += createSingleConditionCard(
              conditions[conditionIndex].conditionName,
              conditions[conditionIndex].description
            );
          } else {
            conditionCards += createSingleConditionCard(condition);
          }
        });
      } else {
        _.each(conditions, (condition) => {
          conditionCards += createSingleConditionCard(
            condition.conditionName,
            condition.description
          );
        });
      }

      return (
        "<div style='width: 100%; max-width: 300px;'>" +
        captionDiv +
        "<dl style='" +
        conditionCardDescListCSS +
        "'>" +
        conditionCards +
        "</dl></div>"
      );
    }

    function handleChatInput(message) {
      /**
       * Only want to handle commands that are prefaced with "!ct" to avoid
       * name collisions with other scripts.
       */
      const prefix = message.content.split(/\s/, 1);
      if (prefix[0].toLowerCase() !== "!ct") {
        return;
      }

      const parameters = message.content
        .slice(message.content.indexOf(" ") + 1)
        .split("|");
      const [command, options, modifier] = parameters;

      switch (command.toLowerCase()) {
        case COMMANDS_LIST.help.keyword:
          sendChat(CT_DISPLAY_NAME, createHelpTable());
          break;
        case COMMANDS_LIST.reset.keyword:
          resetState(options);
          break;
        case COMMANDS_LIST.markers.keyword:
          sendChat(
            "player|" + message.playerid,
            createMarkersTable(campaignMarkers)
          );

          break;
        case COMMANDS_LIST.addCondition.keyword:
          if (!message.selected) {
            return;
          }

          addCondition(options, message);
          break;
        case COMMANDS_LIST.removeCondition.keyword:
          if (!message.selected) {
            return;
          }

          if (options === "all") {
            removeAllConditions(message);
          } else if (modifier === "single") {
            removeSingleConditionInstance(options, message);
          } else {
            removeAllConditionInstances(options, message);
          }
          break;
        case COMMANDS_LIST.toggleCondition.keyword:
          if (!message.selected) {
            return;
          }

          toggleCondition(options, message);
          break;
        case COMMANDS_LIST.currentConditions.keyword:
          if (options) {
            sendChat(CT_DISPLAY_NAME, createConditionCards(null, options));
          } else if (!message.selected) {
            sendChat(CT_DISPLAY_NAME, createConditionCards());
          } else {
            _.each(message.selected, (selectedItem) => {
              sendChat(CT_DISPLAY_NAME, createConditionCards(selectedItem));
            });
          }

          break;
        default:
          sendChat(
            CT_DISPLAY_NAME,
            `Command <code>${message.content}</code> not found. Send <code>!ct help</code> for a list of valid commands.`
          );
          break;
      }
    }

    /**
     * ************************************************************************
     *
     * Config and State handling
     *
     * ************************************************************************
     */

    const configInstructions =
      "<div><h1>" +
      CT_CONFIG_NAME +
      "</h1><h2>Editing the config table</h2>" +
      "<p>When editing this config table, it is important to ensure the table remains intact and that the table layout is not altered.</p>" +
      "<h3>Condition column</h3>" +
      "<p>Cells in this column refer to a condition's <code>conditionName</code> property in state. " +
      "Each condition name must be a simple string, and must be unique regardless of lettercase. " +
      "For example, <code>blinded</code> (all lowercase) and <code>Blinded</code> (capitalized first letter) would not be unique condition names. " +
      "However the condition name is formatted here is how it will appear when rendered on a token's tooltip or when sent as a condition card in chat.</p>" +
      "<p>When condition names are attempted to be saved, there are several checks that occur to ensure the condition name is valid. If a condiiton name is not valid, it is reformatted to become valid so that information entered by users is not lost. The checks that occur include:</p>" +
      "<ul><li>Any vertical pipes <code>|</code> are removed</li>" +
      "<li>Extraneous whitespace is trimmed from the condition name, including the middle (only a single whitespace is allowed between characters)</li>" +
      "<li>Empty strings are replaced with a condition name of 'Condition' + a unique number identifier</li>" +
      "<li>If the condition name already exists, a unique number identifier is appended to the condition name</li></ul>" +
      "<p>After all checks are finished, the config table is sorted alphabetically by condition name, ignoring lettercase..</p>" +
      "<h3>Marker column</h3><p>Cells in this column refer to a condition's <code>markerName</code> property in state, linking a valid associated marker in your campaign's current token marker set to the condition. Each marker name must be either a simple string, or the word 'null'.</p>" +
      "<p>Marker names in this column must match a token marker name exactly, including lettercase and hyphens <code>-</code> or underscores <code>_</code>. If not entered correctly, a token marker will not be linked to the condition correctly, and the marker image will not be applied to tokens when using ConditionTracker commands.</p>" +
      "<p>When 'null' is entered for a marker name, it will not set the <code>markerName</code> property to a string, but instead the <code>null</code> data type. Due to this, it is best to avoid using 'null' as a marker name in your custom token marker sets." +
      "<h3>Description column</h3><p>Cells in this column refer to a condition's <code>description</code> property in state. Each description must be an ordered or unordered list, with each list item acting as a separate description item or effect for the condition. Nested lists are not supported.</p>" +
      "</div><hr/>";

    function createConfigFromState() {
      const { conditions } = state.ConditionTracker;
      const createDescriptionList = (desc) => {
        if (_.isEmpty(desc)) {
          return "<ul><li></ul>";
        }

        let descriptionList = "";
        _.each(desc, (descItem) => {
          descriptionList += `<li>${descItem}</li>`;
        });

        return "<ul>" + descriptionList + "</ul>";
      };

      let conditionRows = "";
      _.each(conditions, (condition) => {
        conditionRows += `<tr><td>${condition.conditionName}</td><td>${
          condition.markerName
        }</td><td>${createDescriptionList(condition.description)}</td></tr>`;
      });

      return (
        configInstructions +
        `<table style='border: 2px solid ${borderColorCSS({
          opacity: "1",
        })};'>` +
        "<caption><h2>Config Table</h2></caption><thead><tr>" +
        `<th style='${configTableHeaders}'>Condition (string)</th>` +
        `<th style='${configTableHeaders}'>Marker (string or null)</th>` +
        `<th style='${configTableHeaders}'>Description (list of strings)</th></tr></thead><tbody>` +
        conditionRows +
        "</tbody></table>"
      );
    }

    function updateStateFromConfig(configObj) {
      configObj.get("bio", (bio) => {
        const configFromCurrentState = createConfigFromState();
        /**
         * Because this function will get called again when the bio is updated within the function, we want to
         * prevent it from getting called infinitely by making sure it only runs when the bio does not match
         * the config created based on the current conditions state.
         */
        if (_.isEqual(bio, configFromCurrentState)) {
          return;
        }

        const conditionsFromConfig = [];
        const formattedBio = bio.replace(/<\/?(br|p)>/g, "");
        const bioTableBody = formattedBio
          .split("</thead>")[1]
          .replace(/<\/?(table|tbody)>/g, "");
        const bioTableRows = bioTableBody
          .replace(/<tr>/g, "")
          .split("</tr>")
          .filter((rowItem) => rowItem !== "");

        _.each(bioTableRows, (tableRow) => {
          const bioRowCells = tableRow.replace(/<td>/g, "").split("</td>", 3);
          let [conditionName, markerName, description] = bioRowCells;

          conditionName = checkNameValidity(
            conditionsFromConfig,
            conditionName
          );

          markerName =
            trimWhitespace(markerName) === "" ||
            trimWhitespace(markerName).toLowerCase() === "null"
              ? null
              : trimWhitespace(markerName);

          description = trimWhitespace(description)
            ? description
                .replace(/<\/?(u|o)l>|<li>/g, "")
                .split("</li>")
                .filter((descItem) => descItem !== "")
            : [];

          conditionsFromConfig.push({ conditionName, markerName, description });
        });

        state.ConditionTracker.conditions = sortIgnoringCase(
          conditionsFromConfig,
          "conditionName"
        );

        /**
         * We want to update the config bio to match state since property values may have been replaced
         * due to duplicate/empty names and formatting issues.
         */
        configObj.set("bio", createConfigFromState());
      });
    }

    function setConfigOnReady() {
      let configCharacter = findObjs({
        type: "character",
        name: CT_CONFIG_NAME,
      })[0];

      if (!configCharacter) {
        configCharacter = createObj("character", {
          name: CT_CONFIG_NAME,
        });

        state.ConditionTracker.configId = configCharacter.id;
      } else if (
        !state.ConditionTracker.configId ||
        state.ConditionTracker.configId !== configCharacter.id
      ) {
        state.ConditionTracker.configId = configCharacter.id;
      }

      configCharacter.set("bio", createConfigFromState());
    }

    /**
     * ************************************************************************
     *
     * ************************************************************************
     */

    function fetchCampaignMarkers() {
      const fetchedMarkers = JSON.parse(Campaign().get("token_markers"));
      campaignMarkers = sortIgnoringCase(fetchedMarkers, "name");
    }

    function checkInstall() {
      if (!_.has(state, "ConditionTracker")) {
        log("Installing " + CT_DISPLAY_NAME);
        state.ConditionTracker = DEFAULT_STATE;
      } else if (state.ConditionTracker.version !== VERSION) {
        log("Updating to " + CT_DISPLAY_NAME);
        /**
         * Update the current version installed without overwriting any customizations
         * made by the user.
         */
        state.ConditionTracker = _.extend(
          {},
          JSON.parse(JSON.stringify(DEFAULT_STATE)),
          state.ConditionTracker
        );
        state.ConditionTracker.version = VERSION;
      }

      setConfigOnReady();
      log(
        CT_DISPLAY_NAME +
          " installed. Last updated " +
          new Date(LAST_UPDATED).toLocaleDateString()
      );
    }

    function registerEventHandlers() {
      on("chat:message", handleChatInput);
      on("change:character:bio", (obj) => {
        if (obj.get("name") !== "ConditionTracker Config") {
          return;
        }

        updateStateFromConfig(obj);
      });
    }

    return {
      CheckInstall: checkInstall,
      FetchCampaignMarkers: fetchCampaignMarkers,
      RegisterEventHandlers: registerEventHandlers,
    };
  })();

on("ready", () => {
  "use strict";

  ConditionTracker.CheckInstall();
  ConditionTracker.FetchCampaignMarkers();
  ConditionTracker.RegisterEventHandlers();
});
