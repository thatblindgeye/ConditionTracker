var AutoBarMarkers =
  AutoBarMarkers ||
  (function () {
    "use strict";

    const defaultMarkers = {
      green: 1,
      yellow: 0.5,
      red: 0.25,
    };

    function calculateMarker(current, max) {
      if (!parseInt(current) || !parseInt(max)) return;
      const currentPercentage = current / max;
      const tokenMarkers = Object.keys(defaultMarkers);
      const percentageBreakpoints = Object.values(defaultMarkers);
      log(tokenMarkers + percentageBreakpoints);

      let marker;

      if (currentPercentage > 0.5) {
        marker = "green";
      } else if (currentPercentage <= 0.5 && currentPercentage > 0.25) {
        marker = "yellow";
      } else {
        marker = "red";
      }

      return marker;
    }

    function setMarker(token) {
      const healthMarkers = ["green", "yellow", "red"];
      const currentMarkers = token.get("statusmarkers").split(",");
      const hpMarker = calculateMarker(
        token.get("bar1_value"),
        token.get("bar1_max")
      );

      const filteredMarkers = currentMarkers.filter(
        (marker) => marker !== "" && !healthMarkers.includes(marker)
      );
      const newMarkers = [...filteredMarkers, hpMarker];
      token.set("statusmarkers", newMarkers.join(","));
    }

    on("ready", () => {
      on("add:graphic", (obj) => {
        setMarker(obj);
      });
    });

    on("change:graphic:bar1_value", function (obj, prev) {
      setMarker(obj);
    });
  })();
