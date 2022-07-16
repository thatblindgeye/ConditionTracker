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
       * These marker names can be added to/removed from a token via ConditionTracker, but they will be ignored by
       * certain ConditionTracker commands.
       *
       * Useful when using markers for other purposes, or for excluding them from being added to a tooltip
       * or sent to chat.
       *
       * Can be customized.
       */
      excludedMarkers: [
        "red",
        "blue",
        "green",
        "brown",
        "purple",
        "pink",
        "yellow",
      ],
      /**
       * The opposite of excludedMarkers. Any markers not in this array can still be added to/removed
       * from a token via ConditionTracker, but they will be ignored by certain ConditionTracker commands.
       *
       * Can be customized.
       */
      onlyMarkers: [],
      /**
       * A list of conditions/statuses that can be applied to a token, including descriptions of their effects.
       * Useful for outputting descriptions for a specific condition/status, or a list of conditions/statuses
       * currently affecting a token.
       *
       * By default a token marker name must be the same as the condition name to properly output a
       * list/description of conditions/statuses, but a markerName can be added to each condition object.
       *
       * Uses D&D 5e conditions as a default, but can be customized.
       */
      conditions: [
        {
          conditionName: "blinded",
          markerName: null,
          effect1:
            "A blinded creature can't see and automatically fails any ability check that requires sight.",
          effect2:
            "Attack rolls against the creature have advantage, and the creature's attack rolls have disadvantage.",
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

      log("ConditionTracker Version " + version + " currently installed.");
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

    function handleChatInput(message) {
      const initializer = message.content.split(/\s/, 1);
      if (initializer[0].toLowerCase() !== "!ct") {
        return;
      }

      const [command, options] = message.content
        .slice(message.content.indexOf(" ") + 1)
        .split("|");
      const { excludedMarkers, includedMarkers } = state.ConditionTracker;
      let chatMessage = "";
      let markerNames = "";
      let modifier = "";

      switch (command.toLowerCase()) {
        case "--campaign":
          sendChat(
            "player|" + message.playerid,
            createMarkersTable(campaignMarkers)
          );
          break;
        case "--add":
          if (!message.selected) {
            return;
          }

          markerNames = options.replace(" ", "");
          log(markerNames);

          _.each(message.selected, (selectedItem) => {
            const token = getObj(selectedItem._type, selectedItem._id);

            const currentMarkers = token.get("statusmarkers").split(",");
            const newMarkers = [...currentMarkers, markerNames].filter(
              (marker) => marker !== ""
            );

            token.set("statusmarkers", newMarkers.join(","));
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
