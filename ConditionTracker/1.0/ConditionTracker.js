/**
 * ConditionTracker
 *
 * Version 1.0
 * Last updated: July 16, 2022
 * Author: Eric Olkowski (thatblindgeye)
 *
 * Command syntax:
 * !ct --<keyword>|<optional modifier>|<options>
 *
 */

var ConditionTracker =
  ConditionTracker ||
  (function () {
    "use strict";

    const VERSION = "1.0";
    const LAST_UPDATED = 1657915529656;
    const COMMANDS_LIST = {
      help: {
        keyword: "--help",
        description:
          "Creates a table and sends to chat a valid list of ConditionTracker commands.",
        modifiers: {},
      },
      campaignMarkers: {
        keyword: "--campaignmarkers",
        description:
          "Creates a table and sends to chat a list of token markers currently available in the campaign, excluding the default Roll20 color and death markers. Includes the marker image and name.",
        modifiers: {},
      },
      addCondition: {
        keyword: "--addcondition",
        description:
          "Adds the specified condition(s) to the selected tokens. <br/><br/> Proper syntax is `!ct --addcondition|&#60;comma separated list of conditions&#62;`, e.g. `!ct --addcondition|blinded, deafened`.",
        modifiers: {},
      },
    };
    const DEFAULT_STATE = {
      version: "1.0",
      /**
       * A list of conditions/statuses that can be applied to a token, including descriptions of their effects.
       * Conditions that are passed in will be applied to a token's tooltip.
       *
       * By default a marker will only be added to a token if the condition/status passed in has a valid
       * markerName that matches a token marker name for the campaign. A markerName can be added to each
       * condition object.
       *
       * Uses D&D 5e conditions as a default, but can be customized.
       */
      conditions: [
        {
          conditionName: "blinded",
          markerName: null,
          effects: [
            "A blinded creature can't see and automatically fails any ability check that requires sight.",
            "Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage.",
          ],
        },
      ],
    };

    function checkInstall() {
      if (!_.has(state, "ConditionTracker")) {
        log("Installing ConditionTracker Version " + VERSION);
        state.ConditionTracker = DEFAULT_STATE;
      } else if (state.ConditionTracker.version !== VERSION) {
        log("Updating to ConditionTracker Version " + VERSION);
        /**
         * Update the current version installed without overwriting any customizations
         * made by the user.
         */
        state.ConditionTracker = _.extend(
          {},
          DEFAULT_STATE,
          state.ConditionTracker
        );
        state.ConditionTracker.version = VERSION;
      }

      log(
        "ConditionTracker Version " +
          VERSION +
          " installed. Last updated " +
          new Date(LAST_UPDATED).toLocaleString()
      );
    }

    let campaignMarkers;
    function fetchCampaignMarkers() {
      const fetchedMarkers = JSON.parse(Campaign().get("token_markers"));
      campaignMarkers = _.sortBy(fetchedMarkers, "name");
    }

    function createMarkersTable(markers) {
      let markerRows = "";
      _.each(markers, (marker) => {
        markerRows += `<tr><td><img src='${marker.url}'></td><td>${marker.name}</td></tr>`;
      });

      return (
        "<table style='width: 100%; max-width: 300px;'><caption>Campaign Token Markers</caption><thead><tr><th>Image</th><th>Name</th></tr></thead><tbody>" +
        markerRows +
        "</tbody></table>"
      );
    }

    function createHelpTable() {
      const createModifiersList = (modifiers) => {
        let modifierItems = "";
        _.each(modifiers, (modifier) => {
          if (!_.isEmpty(modifier)) {
            modifierItems += `<li>${modifier.name}: ${modifier.description}</li>`;
          }
        });

        if (modifierItems) {
          return "<div><ul>" + modifierItems + "</ul></div>";
        }

        return "<div>No modifiers exist for this command.</div>";
      };

      let commandRows = "";
      _.each(COMMANDS_LIST, (command) => {
        commandRows += `<tr style="border-bottom: 1px solid black;"><td style="vertical-align: top; padding-right: 10px;">${
          command.keyword
        }</td><td style="vertical-align: top;">${
          command.description
        }<br/><br/>${createModifiersList(command.modifiers)}</td></tr>`;
      });

      return (
        "<table style='width: 100%; max-width: 500px;'><caption>ConditionTracker Commands</caption><thead><tr><th>Command</th><th>Description</th></tr></thead><tbody>" +
        commandRows +
        "</tbody></table>"
      );
    }

    function getConditionMarkers(conditionsArray) {
      const { conditions } = state.ConditionTracker;

      const markerNames = _.map(conditions, (condition) => {
        if (conditionsArray.includes(condition.conditionName.toLowerCase())) {
          return condition.markerName;
        }
      });

      return markerNames.filter((marker) => marker !== null);
    }

    function handleChatInput(message) {
      /**
       * Only want to handle commands that are prefaced with "!ct" to avoid
       * possibly running other similarly named commands from other scripts.
       */
      const initializer = message.content.split(/\s/, 1);
      if (initializer[0].toLowerCase() !== "!ct") {
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

      let conditionNames;
      let markerNames;

      switch (command.toLowerCase()) {
        case COMMANDS_LIST.help.keyword:
          sendChat("ConditionTracker v" + VERSION, createHelpTable());
          break;
        case COMMANDS_LIST.campaignMarkers.keyword:
          sendChat(
            "player|" + message.playerid,
            createMarkersTable(campaignMarkers)
          );
          break;
        case COMMANDS_LIST.addCondition.keyword:
          if (!message.selected) {
            return;
          }

          conditionNames = options.replace(" ", "").toLowerCase().split(",");
          markerNames = getConditionMarkers(conditionNames);

          _.each(message.selected, (selectedItem) => {
            const token = getObj(selectedItem._type, selectedItem._id);

            if (markerNames.length) {
              const currentMarkers = token
                .get("statusmarkers")
                .split(",")
                .filter((marker) => marker !== "");
              const newMarkers = [...currentMarkers, ...markerNames];

              token.set("statusmarkers", newMarkers.join(","));
            }

            const currentTooltip = token.get("tooltip");
            const newConditions = conditionNames.filter((condition) => {
              return !currentTooltip.includes(condition);
            });

            token.set(
              "tooltip",
              [...newConditions, currentTooltip]
                .filter((tooltipItem) => tooltipItem !== "")
                .sort()
                .join(", ")
            );
          });
          break;
        // case "!ctremove":
        //   if (!message.selected && message.selected[0]._type == "graphic")
        //     return;

        //   markerName = message.content.split(" ")[1].toLowerCase();
        //   obj = getObj(message.selected[0]._type, message.selected[0]._id);
        //   currentMarkers = obj.get("statusmarkers").split(",");

        //   if (currentMarkers.includes(markerName)) {
        //     modifier =
        //       message.content.split(" ")[2] &&
        //       message.content.split(" ")[2].toLowerCase();

        //     if (modifier !== "--single") {
        //       const filteredMarkers = currentMarkers.filter((marker) => {
        //         return marker !== markerName && marker !== "";
        //       });
        //       obj.set("statusmarkers", filteredMarkers.join(","));
        //       obj.set(
        //         "tooltip",
        //         filteredMarkers
        //           .filter((marker) => !excludedMarkers.includes(marker))
        //           .sort()
        //           .join(", ")
        //       );
        //     } else {
        //       const firstMarkerIndex = currentMarkers.indexOf(markerName);
        //       let totalSlicedMarkers;
        //       if (firstMarkerIndex === 0) {
        //         totalSlicedMarkers = currentMarkers.slice(
        //           1,
        //           currentMarkers.length
        //         );
        //       } else {
        //         let firstSlicedMarkers = [
        //           ...currentMarkers.slice(0, firstMarkerIndex),
        //         ];
        //         let secondSlicedMarkers = [
        //           ...currentMarkers.slice(
        //             firstMarkerIndex + 1,
        //             currentMarkers.length
        //           ),
        //         ];
        //         totalSlicedMarkers = [
        //           ...firstSlicedMarkers,
        //           ...secondSlicedMarkers,
        //         ].filter((marker) => marker !== "");
        //       }
        //       obj.set("statusmarkers", totalSlicedMarkers.join(","));
        //       obj.set(
        //         "tooltip",
        //         totalSlicedMarkers
        //           .filter((marker) => !excludedMarkers.includes(marker))
        //           .sort()
        //           .join(", ")
        //       );
        //     }
        //   }
        //   break;
        // case "!cttoggle":
        //   if (!message.selected && message.selected[0]._type == "graphic")
        //     return;

        //   markerName = message.content.split(" ")[1].toLowerCase();
        //   obj = getObj(message.selected[0]._type, message.selected[0]._id);
        //   currentMarkers = obj.get("statusmarkers").split(",");

        //   if (currentMarkers.includes(markerName)) {
        //     const filteredMarkers = currentMarkers.filter((marker) => {
        //       return marker !== markerName && marker !== "";
        //     });
        //     obj.set("statusmarkers", filteredMarkers.join(","));
        //     obj.set(
        //       "tooltip",
        //       filteredMarkers
        //         .filter((marker) => !excludedMarkers.includes(marker))
        //         .sort()
        //         .join(", ")
        //     );
        //   } else {
        //     const newMarkers = [...currentMarkers, markerName].filter(
        //       (marker) => marker !== ""
        //     );
        //     obj.set("statusmarkers", newMarkers.join(","));
        //     obj.set(
        //       "tooltip",
        //       newMarkers
        //         .filter((marker) => !excludedMarkers.includes(marker))
        //         .sort()
        //         .join(", ")
        //     );
        //   }
        //   break;
        // case "!ctcharlist":
        //   if (!message.selected && message.selected[0]._type == "graphic")
        //     return;
        //   obj = getObj(message.selected[0]._type, message.selected[0]._id);
        //   currentMarkers = obj.get("statusmarkers");
        //   sendChat("Character Token Markers", currentMarkers);
        //   break;
        default:
          sendChat(
            "ConditionTracker",
            "Command not found. Send '!ct --help' for more information."
          );
          break;
      }
    }

    function registerEventHandlers() {
      on("chat:message", handleChatInput);
    }

    return {
      CheckInstall: checkInstall,
      FetchCampaignMarkers: fetchCampaignMarkers,
      RegisterEventHandlers: registerEventHandlers,
    };
  })();

on("ready", () => {
  ConditionTracker.CheckInstall();
  ConditionTracker.FetchCampaignMarkers();
  ConditionTracker.RegisterEventHandlers();
});
