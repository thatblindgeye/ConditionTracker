/**
 * ConditionTracker
 *
 * Version 1.0
 * Last updated: July 15, 2022
 * Author: Eric Olkowski (thatblindgeye)
 *
 * Command syntax:
 * !ct --<command>|<options>
 *
 *
 */

var ConditionTracker =
  ConditionTracker ||
  (function () {
    "use strict";

    const version = "1.0";
    const lastUpdated = 1657915529656;
    const defaultState = {
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
          markerName: "skull",
          effects: [
            "A blinded creature can't see and automatically fails any ability check that requires sight.",
            "Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage.",
          ],
        },
      ],
    };
    let campaignMarkers;

    function checkInstall() {
      if (!_.has(state, "ConditionTracker")) {
        log("Installing ConditionTracker Version " + version);
        state.ConditionTracker = defaultState;
      } else if (state.ConditionTracker.version !== version) {
        log("Updating to ConditionTracker Version " + version);
        /**
         * Update the current version installed without overwriting any customizations
         * made by the user.
         */
        state.ConditionTracker = _.extend(
          {},
          defaultState,
          state.ConditionTracker
        );
        state.ConditionTracker.version = version;
      }

      log(
        "ConditionTracker Version " +
          version +
          " installed. Last updated " +
          new Date(lastUpdated).toLocaleString()
      );
    }

    function fetchCampaignMarkers() {
      const fetchedMarkers = JSON.parse(Campaign().get("token_markers"));
      campaignMarkers = _.sortBy(fetchedMarkers, "name");
    }

    function createMarkersTable(markers) {
      let markerList = "";
      _.each(markers, (marker) => {
        markerList += `<tr><td><img src='${marker.url}'></td><td>${marker.name}</td></tr>`;
      });

      return (
        "<table style='width: 100%; max-width: 300px;'><caption>Campaign Token Markers</caption><thead><tr><th>Image</th><th>Name</th></tr></thead><tbody>" +
        markerList +
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

      const [command, options, modifier] = message.content
        .slice(message.content.indexOf(" ") + 1)
        .split("|");
      let conditionNames;
      let markerNames;

      switch (command.toLowerCase()) {
        case "--campaignmarkers":
          sendChat(
            "player|" + message.playerid,
            createMarkersTable(campaignMarkers)
          );
          break;
        case "--addcondition":
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
