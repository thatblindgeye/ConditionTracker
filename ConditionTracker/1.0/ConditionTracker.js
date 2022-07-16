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
          "Creates a table and sends to chat a list of valid ConditionTracker commands.",
        modifiers: {},
      },
      campaignMarkers: {
        keyword: "--campaignmarkers",
        description:
          "Creates a table and sends to chat a list of token markers currently available in the campaign, excluding the default Roll20 color and death markers. The table includes the marker image and name.",
        modifiers: {},
      },
      addCondition: {
        keyword: "--addcondition",
        description:
          "Adds the specified condition(s) to the selected token(s). If a valid marker name is linked to the condition, the marker will be added cumulatively to the token (useful if multiple of the same marker has a different meaning than a single instance of the marker). <br/><br/> Proper syntax is <code>!ct --addcondition|&#60;comma separated list of conditions&#62;</code>, e.g. <code>!ct --addcondition|blinded, deafened</code>.",
        modifiers: {},
      },
      removeCondition: {
        keyword: "--removecondition",
        description: "",
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
        {
          conditionName: "charmed",
          markerName: "skull",
          effects: [
            "A charmed creature can't attack the charmer or target the charmer with harmful abilities or magical effects.",
            "The charmer has advantage on any ability check to interact socially with the creature..",
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
            const newTooltip = conditionNames.filter(
              (condition) => !currentTooltip.includes(condition)
            );

            token.set(
              "tooltip",
              [...newTooltip, currentTooltip]
                .filter((tooltipItem) => tooltipItem !== "")
                .sort()
                .join(", ")
            );
          });
          break;
        case COMMANDS_LIST.removeCondition.keyword:
          if (!message.selected) {
            return;
          }

          conditionNames = options.replace(" ", "").toLowerCase().split(",");
          markerNames = getConditionMarkers(conditionNames);

          _.each(message.selected, (selectedItem) => {
            const token = getObj(selectedItem._type, selectedItem._id);

            if (markerNames.length) {
              if (modifier !== "single") {
                const newMarkers = token
                  .get("statusmarkers")
                  .split(",")
                  .filter(
                    (marker) => marker !== "" && !markerNames.includes(marker)
                  );

                const currentTooltip = token
                  .get("tooltip")
                  .replace(" ", "")
                  .split(",");
                const newTooltip = currentTooltip.filter(
                  (condition) => !conditionNames.includes(condition)
                );

                token.set("statusmarkers", [...newMarkers].join(","));
                token.set(
                  "tooltip",
                  [...newTooltip]
                    .filter((tooltipItem) => tooltipItem !== "")
                    .sort()
                    .join(", ")
                );
              } else {
                const currentMarkers = token
                  .get("statusmarkers")
                  .split(",")
                  .filter((marker) => marker !== "");
                let newMarkers;
                _.each(markerNames, (marker) => {
                  const firstMarkerIndex = currentMarkers.indexOf(marker);

                  if (firstMarkerIndex === -1) {
                    return;
                  } else if (firstMarkerIndex === 0) {
                    newMarkers = currentMarkers
                      .slice(1)
                      .filter((marker) => marker !== "");
                  } else {
                    newMarkers = [
                      ...currentMarkers.slice(0, firstMarkerIndex),
                      ...currentMarkers.slice(firstMarkerIndex + 1),
                    ].filter((marker) => marker !== "");
                  }
                });

                const { conditions } = state.ConditionTracker;
                const currentTooltip = token
                  .get("tooltip")
                  .replace(" ", "")
                  .split(",");

                const newTooltip = _.map(currentMarkers, (marker) => {
                  return _.each(conditions, (condition) => {
                    if (condition.markerName === marker) {
                      return condition.conditionName;
                    }
                  });
                });

                log(newTooltip);

                if (newMarkers) {
                  token.set("statusmarkers", newMarkers.join(","));
                }
              }
            }
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
            "Command not found. Send '!ct --help' in chat for a list of valid commands."
          );
          break;
      }
    }

    function capitalizeFirstLetter(sentence) {
      return sentence[0].toUpperCase() + sentence.slice(1);
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
