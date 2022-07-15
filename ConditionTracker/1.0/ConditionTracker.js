/**
 * ConditionTracker
 *
 * Version 1.0
 * Last updated: July 15, 2022
 * Author: Eric Olkowski (thatblindgeye)
 */

var ConditionTracker =
  ConditionTracker ||
  (function () {
    "use strict";

    const version = "1.0";
    const lastUpdated = 1657915529656;
    const defaultState = {
      excludedMarkers: [
        "red",
        "blue",
        "green",
        "brown",
        "purple",
        "pink",
        "yellow",
      ],
      version: "1.0",
    };

    function checkInstall() {
      if (!_.has(state, "ConditionTracker")) {
        log("Installing ConditionTracker Version " + version);
        state.ConditionTracker = defaultState;
      } else if (state.ConditionTracker.version !== version) {
        log("Updating to ConditionTracker Version " + version);

        state.ConditionTracker = _.extend(
          {},
          defaultState,
          state.ConditionTracker
        );
        state.ConditionTracker.version = version;
      }

      log("ConditionTracker Version " + version + " currently installed.");
    }

    return {
      CheckInstall: checkInstall,
    };
  })();

on("ready", () => {
  ConditionTracker.CheckInstall();
});
