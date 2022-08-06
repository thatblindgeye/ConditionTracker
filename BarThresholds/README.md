# BarThresholds

Thank you for installing BarThresholds! To suggest features or to report bugs, please create an issue at my [Roll20 scripts repo](https://github.com/thatblindgeye/roll20_scripts).

The purpose of this script is to automate the process of having an effect occur when a token's bar value reaches a certain threshold. This effect can be either changing one or more token properties, or running a command from another script you have installed.

When this script is installed for the first time, BarThresholds will be added to your campaign's state object and a character named "BarThresholds Config" will be created in your campaign. The existence of the BarThresholds Config character will be checked on each subsequent load of the game, adding it back in if it no longer exists.

When a new version of BarThresholds is installed, the state and BarThresholds Config character will be updated **without** overwriting any existing thresholds. This is done on purpose to avoid you having to add back in your thresholds with each update. Keep in mind that this may change if any additional features are added.
