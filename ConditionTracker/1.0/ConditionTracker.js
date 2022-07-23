/**
 * ConditionTracker
 *
 * Version 1.0
 * Last updated: July 22, 2022
 * Author: thatblindgeye
 *
 * Command syntax:
 * !ct <keyword>|<optional modifier>|<options>
 *
 * To-do:
 *  Write functions to:
 * DONE   - check whether a character named "ConditionTracker Config" exists in the campaign
 * DONE     - If not, create it
 * DONE   - create a table based on the CT conditions state (see Note 1)
 * DONE     - set CT Config's bio to this table
 * DONE   - convert CT Config's bio table to an array of condition objects
 * DONE     - set CT conditions state to this array
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
    const LAST_UPDATED = 1658510679209;
    const CT_DISPLAY_NAME = `ConditionTracker v${VERSION}`;
    const CT_CONFIG_NAME = "ConditionTracker Config";
    const COMMANDS_LIST = {
      help: {
        keyword: "help",
        description:
          "Sends to chat a table of valid ConditionTracker commands and their descriptions.",
        modifiers: [],
      },
      reset: {
        keyword: "reset",
        description:
          "Resets the ConditionTracker state to version " +
          VERSION +
          "'s default. This will overwrite any customizatons made to the campaign's current ConditionTracker state and cannot be undone. <br/><br/> Proper syntax is <code>!ct reset</code>, followed by <code>!ct reset|confirm</code> or <code>!ct reset|cancel</code>.",
        modifiers: [],
      },
      markers: {
        keyword: "markers",
        description:
          "Sends to chat a table of token markers currently available in the campaign, excluding the default Roll20 color and death markers. The table includes the marker image and name. <br/><br/> Proper syntax is <code>!ct campaign</code>",
        modifiers: [],
      },
      addCondition: {
        keyword: "add",
        description:
          "Cumulatively adds the specified condition(s) to the selected token(s) tooltip. If a valid marker is linked to the condition, the linked marker will also be cumulatively added to the token. Useful if multiple instances of a condition has a different meaning than a single instance. <br/><br/> Proper syntax is <code>!ct add|&#60;comma separated list of conditions&#62;</code>, e.g. <code>!ct add|blinded, deafened</code>.",
        modifiers: [],
      },
      removeCondition: {
        keyword: "remove",
        description:
          "Removes all instances of the specified condition(s) from the selected token(s) tooltip. If a valid marker is linked to the condition, all instances of the linked marker will also be removed from the token. <br/><br/> Proper syntax is <code>!ct remove|&#60;comma separated list of conditions&#62;</code>, e.g. <code>!ct remove|blinded, deafened</code>.",
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
          "Toggles the specified condition(s) on the selected token(s) tooltip. If a condition is currently applied to a token it will be removed, otherwise the condition will be added. If a valid marker is linked to the condition, the linked marker will also be toggled on the token. <br/><br/> Proper syntax is <code>!ct toggle|&#60;comma separated list of conditions&#62;</code>, e.g. <code>!ct toggle|blinded, deafened</code>.",
        modifiers: [],
      },
      currentConditions: {
        keyword: "conditions",
        description:
          "Sends to chat a list of conditions currently affecting a token, as well as any effects from the condition. <br/><br/> Proper syntax is <code>!ct current</code>.",
        modifiers: [],
      },
    };
    const DEFAULT_STATE = {
      version: "1.0",
      /**
       * A list of conditions that can be applied to a token, including descriptions of their effects.
       * Conditions that are passed in will be applied to a token's tooltip.
       *
       * By default a marker will only be added to a token if the condition passed in has a valid
       * markerName that matches a token marker within the campaign.
       *
       * Uses D&D 5e conditions as a default, but can be customized by editing the ConditionTracker Config character bio.
       */
      conditions: [
        {
          conditionName: "Blinded",
          markerName: null,
          effects: [
            "A blinded creature can't see and automatically fails any ability check that requires sight.",
            "Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage.",
          ],
        },
        {
          conditionName: "Charmed",
          markerName: "skull",
          effects: [
            "A charmed creature can't attack the charmer or target the charmer with harmful abilities or magical effects.",
            "The charmer has advantage on any ability check to interact socially with the creature.",
          ],
        },
        {
          conditionName: "Deafened",
          markerName: null,
          effects: [
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

    const containerCSS = _.template(
      "width: 100%; max-width: <%= maxWidth %>; border: 1px solid rgb(100, 100, 100);"
    );
    const captionCSS = "font-size: 1.75rem; font-weight: bold;";
    const headerCSS =
      "background-color: blue; color: white; min-height: 2.5rem; padding: 5px;";
    const tableCellCSS = "padding: 15px 5px; vertical-align: top;";
    const tableMarkerCellCSS = "padding: 15px 5px; vertical-align: middle;";

    const dividerCSS = "border-top: 1px solid rgba(100, 100, 100, 0.5)";
    const listCSS = "margin: 0px; list-style: none;";
    const listItemCSS = "margin-bottom: 10px;";
    const descListItemCSS = _.template(
      "font-style: <%= fontStyle %>; opacity: 0.75;"
    );
    const conditionCardDescListCSS = "padding-top: 10px; margin-bottom: 0;";
    const conditionCardBorderCSS = _.template(
      "border-width: <%= width %>; border-style: solid; border-color: rgb(100, 100, 100); border-radius: <%= radius %>;"
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

    function capitalizeFirstLetter(sentence) {
      return sentence[0].toUpperCase() + sentence.slice(1);
    }

    function trimWhitespace(str, replacement = "") {
      return str.trim().replace(/&nbsp;/g, replacement);
    }

    function formatCommandOptions(options) {
      return options
        .toLowerCase()
        .split(",")
        .map((option) => trimWhitespace(option));
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
        (condition) => condition.conditionName === trimmedName
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
          return "<div><b>Modifiers</b><dl>" + modifierItems + "</dl></div>";
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
      const conditionNames = formatCommandOptions(commandOptions);
      const markerNames = getConditionMarkers(conditionNames);

      _.each(chatMessage.selected, (selectedItem) => {
        const token = getObj(selectedItem._type, selectedItem._id);

        if (markerNames.length) {
          const currentMarkers = token
            .get("statusmarkers")
            .replace(/,\s*/g, ",")
            .split(",")
            .filter((marker) => marker !== "");

          token.set(
            "statusmarkers",
            [...currentMarkers, ...markerNames].join(",")
          );
        }

        const currentTooltip = token
          .get("tooltip")
          .replace(/,\s*/g, ",")
          .toLowerCase()
          .split(",");
        const addedTooltip = conditionNames.filter(
          (condition) => !currentTooltip.includes(condition)
        );

        token.set(
          "tooltip",
          [...currentTooltip, ...conditionNames]
            .filter((tooltipItem) => tooltipItem !== "")
            .sort()
            .map((tooltipItem) => capitalizeFirstLetter(tooltipItem))
            .join(", ")
        );
      });
    }

    function removeSingleConditionInstance(commandOptions, chatMessage) {
      const conditionNames = formatCommandOptions(commandOptions);
      const markerNames = getConditionMarkers(conditionNames);

      _.each(chatMessage.selected, (selectedItem) => {
        const token = getObj(selectedItem._type, selectedItem._id);

        if (markerNames.length) {
          let markersAfterSingleRemoval;
          const currentMarkers = token
            .get("statusmarkers")
            .replace(/,\s*/g, ",")
            .split(",")
            .filter((marker) => marker !== "");

          _.each(markerNames, (marker) => {
            const firstMarkerIndex = currentMarkers.indexOf(marker);

            if (firstMarkerIndex === -1) {
              return;
            } else if (firstMarkerIndex === 0) {
              markersAfterSingleRemoval = currentMarkers
                .slice(1)
                .filter((marker) => marker !== "");
            } else {
              markersAfterSingleRemoval = [
                ...currentMarkers.slice(0, firstMarkerIndex),
                ...currentMarkers.slice(firstMarkerIndex + 1),
              ].filter((marker) => marker !== "");
            }
          });

          if (markersAfterSingleRemoval) {
            token.set("statusmarkers", markersAfterSingleRemoval.join(","));
          }
        }

        let tooltipAfterSingleRemoval;
        const currentTooltip = token
          .get("tooltip")
          .replace(/,\s*/g, ",")
          .toLowerCase()
          .split(",");

        _.each(conditionNames, (condition) => {
          const firstConditionIndex = currentTooltip.indexOf(condition);

          if (firstConditionIndex === -1) {
            return;
          } else if (firstConditionIndex === 0) {
            tooltipAfterSingleRemoval = currentTooltip
              .slice(1)
              .filter((tooltipItem) => tooltipItem !== "");
          } else {
            tooltipAfterSingleRemoval = [
              ...currentTooltip.slice(0, firstMarkerIndex),
              ...currentTooltip.slice(firstMarkerIndex + 1),
            ].filter((tooltipItem) => tooltipItem !== "");
          }
        });

        token.set(
          "tooltip",
          tooltipAfterSingleRemoval
            ? tooltipAfterSingleRemoval
                .filter((tooltipItem) => tooltipItem !== "")
                .sort()
                .map((tooltipItem) => capitalizeFirstLetter(tooltipItem))
                .join(", ")
            : ""
        );
      });
    }

    function removeAllConditionInstances(commandOptions, chatMessage) {
      const conditionNames = formatCommandOptions(commandOptions);
      const markerNames = getConditionMarkers(conditionNames);

      _.each(chatMessage.selected, (selectedItem) => {
        const token = getObj(selectedItem._type, selectedItem._id);

        if (markerNames.length) {
          const markersAfterRemoveInstances = token
            .get("statusmarkers")
            .replace(/,\s*/g, ",")
            .split(",")
            .filter((marker) => marker !== "" && !markerNames.includes(marker));

          token.set(
            "statusmarkers",
            [...markersAfterRemoveInstances].join(",")
          );
        }

        const currentTooltip = token
          .get("tooltip")
          .replace(/,\s*/g, ",")
          .toLowerCase()
          .split(",");
        const tooltipAfterRemoveInstances = currentTooltip.filter(
          (condition) => !conditionNames.includes(condition)
        );

        token.set(
          "tooltip",
          [...tooltipAfterRemoveInstances]
            .filter((tooltipItem) => tooltipItem !== "")
            .sort()
            .map((tooltipItem) => capitalizeFirstLetter(tooltipItem))
            .join(", ")
        );
      });
    }

    function removeAllConditions(chatMessage) {
      _.each(chatMessage.selected, (selectedItem) => {
        const token = getObj(selectedItem._type, selectedItem._id);
        const currentAppliedConditions = token
          .get("tooltip")
          .replace(/,\s*/g, ",")
          .toLowerCase()
          .split(",");
        const markerNames = getConditionMarkers(currentAppliedConditions);

        if (markerNames.length) {
          const markersAfterRemoveAll = token
            .get("statusmarkers")
            .replace(/,\s*/g, ",")
            .split(",")
            .filter((marker) => marker !== "" && !markerNames.includes(marker));

          token.set("statusmarkers", [...markersAfterRemoveAll].join(","));
        }

        token.set("tooltip", "");
      });
    }

    function toggleCondition(commandOptions, chatMessage) {
      const conditionNames = formatCommandOptions(commandOptions);
      const markerNames = getConditionMarkers(conditionNames);

      _.each(chatMessage.selected, (selectedItem) => {
        const token = getObj(selectedItem._type, selectedItem._id);

        if (markerNames.length) {
          const currentMarkers = token
            .get("statusmarkers")
            .replace(/,\s*/g, ",")
            .split(",")
            .filter((marker) => marker !== "");
          const sharedMarkers = _.intersection(currentMarkers, markerNames);

          token.set(
            "statusmarkers",
            [...currentMarkers, ...markerNames]
              .filter((marker) => !sharedMarkers.includes(marker))
              .join(",")
          );
        }

        const currentTooltip = token
          .get("tooltip")
          .replace(/,\s*/g, ",")
          .toLowerCase()
          .split(",");
        const sharedConditions = _.intersection(currentTooltip, conditionNames);

        token.set(
          "tooltip",
          [...currentTooltip, ...conditionNames]
            .filter(
              (tooltipItem) =>
                tooltipItem !== "" && !sharedConditions.includes(tooltipItem)
            )
            .sort()
            .map((tooltipItem) => capitalizeFirstLetter(tooltipItem))
            .join(", ")
        );
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
        conditionsToList = token
          .get("tooltip")
          .replace(/,\s*/g, ",")
          .toLowerCase()
          .split(",");
      } else {
        caption = "Campaign Conditions";

        if (commandOptions) {
          conditionsToList = formatCommandOptions(commandOptions);
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

      const createSingleConditionCard = (conditionName, conditionEffects) => {
        let conditionEffectsList = "";

        if (!conditionEffects || _.isEmpty(conditionEffects)) {
          conditionEffectsList =
            "<div style='" +
            listItemCSS +
            "'>No effects have been defined for this condition.</div>";
        } else {
          _.each(conditionEffects, (effect) => {
            conditionEffectsList +=
              "<div style='" + listItemCSS + "'>" + effect + "</div>";
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
          conditionEffectsList +
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
              conditions[conditionIndex].effects
            );
          } else {
            conditionCards += createSingleConditionCard(condition);
          }
        });
      } else {
        _.each(conditions, (condition) => {
          conditionCards += createSingleConditionCard(
            condition.conditionName,
            condition.effects
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

      const command = parameters[0];
      let modifier;
      let options;

      if (parameters.length === 3) {
        modifier = parameters[1];
        options = parameters[2];
      } else {
        options = parameters[1];
      }

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

    function createConfigFromState() {
      const { conditions } = state.ConditionTracker;
      const createEffectsList = (effects) => {
        let effectItems = "";
        if (!_.isEmpty(effects)) {
          _.each(effects, (effect) => {
            effectItems += `<li>${effect}</li>`;
          });
        }

        if (effects) {
          return "<ul>" + effectItems + "</ul>";
        }

        return "<ul><li></ul>";
      };

      let conditionRows = "";
      _.each(conditions, (condition) => {
        conditionRows += `<tr><td>${condition.conditionName}</td><td>${
          condition.markerName
        }</td><td>${createEffectsList(condition.effects)}</td></tr>`;
      });

      return (
        "<table><thead><tr><th>Condition (string)</th><th>Marker (string or null)</th><th>Effects (list of strings)</th></tr></thead><tbody>" +
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
        const formattedBioTable = bio.replace(/<\/?(br|p)>/g, "");
        const bioTableBody = formattedBioTable
          .split("</thead>")[1]
          .replace(/<\/?(table|tbody)>/g, "");
        const bioTableRows = bioTableBody
          .replace(/<tr>/g, "")
          .split("</tr>")
          .filter((rowItem) => rowItem !== "");

        _.each(bioTableRows, (tableRow) => {
          const bioRowCells = tableRow.replace(/<td>/g, "").split("</td>", 3);
          let [conditionName, markerName, effects] = bioRowCells;

          conditionName = checkNameValidity(
            conditionsFromConfig,
            conditionName
          );

          markerName =
            trimWhitespace(markerName) === "" ||
            trimWhitespace(markerName).toLowerCase() === "null"
              ? null
              : trimWhitespace(markerName);

          effects = trimWhitespace(effects)
            ? effects
                .replace(/<\/?ul>|<li>/g, "")
                .split("</li>")
                .filter((effectItem) => effectItem !== "")
            : [];

          conditionsFromConfig.push({ conditionName, markerName, effects });
        });

        state.ConditionTracker.conditions = _.sortBy(
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
      campaignMarkers = _.sortBy(fetchedMarkers, "name");
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
