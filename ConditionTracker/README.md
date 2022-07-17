# Condition Tracker

Thank you for installing ConditionTracker! To suggest features or to report bugs, please create an issue at my [Roll20 scripts repo](https://github.com/thatblindgeye/roll20_scripts).

## Description

The purpose of this script is to streamline adding conditions to tokens and tracking which conditions are currently affecting a token.

This script works best when tooltips on tokens are enabled and not being used for other purposes.

## ConditionTracker State

When the script is installed, ConditionTracker will be added to the campaign's state object. When a new version of ConditionTracker is installed, this state will be updated **without** overwriting any customizations made to state by the user. This is done on purpose to avoid users having to add back in their customizations with each update.

The basic structure of ConditionTracker state is as follows:

- **Version**: The current version of CondtiionTracker. This is used to check whether the currently installed version is up to date, and to update it if not.
- **Conditions**: An array of condition objects that can be customized by the user. By default the condition objects included reference common conditions or statuses in D&D 5E.

  You do not need to create a condition object in order to add or remove a condition to a token. A condition object simply allows for storing condition information across game sessions, quick reference for condition effects, and automated token marker customization.

  When customizing the conditions array, each condition object must include the following properties, with a value of the specified type:

  - `conditionName` (_string_): This is the **required** name that will be used by various commands. ConditionTracker will format the name before rendering it in Roll20, so capitalization is not important and whitespace characters are allowed.
  - `markerName` (_string_ or _null_): When this value matches a valid token marker name in your campaign, the token marker will be added or removed along with the condition depending on the command called. If you do not wish to link the condition to a token marker, a value of `null` **must** be given to this property.
  - `effects` (_array_): This is an optional array of effects that describe the condition in more detail. Each effect should be its own array item.

## Basic Syntax

In order to use a ConditionTracker command, you must use the following syntax:

`!ct --<keyword>|<optional modifier>|<options>`

**`!ct`**: This must preface every ConditionTracker command in order to properly call them. This helps avoid name collisions with other installed scripts that may have similarly named commands.

**`--<keyword>`** This is the primary command keyword which determines what command will be called. If a proper keyword is not passed in, an error message will be sent to chat.

**`<optional modifier>`** This will modify the command in some way. If a modifier is not passed in, the command will be called with its default behavior.

**`<options>`** This is what gets passed to the command. The format of the options passed in will depend on the command being called.

## Commands List

### Help

`!ct --help`

This will display a table of valid ConditionTracker commands in chat. The table includes the command keyword, a description of the command, and any modifiers for the command.

### Reset

`!ct --reset`

This will reset the ConditionTracker state to the default state for the currently installed version. Running this command will overwrite any customizations made to the ConditionTracker state, and the reset cannot be undone.

The first time this command is called, you will be asked to confirm the reset by calling `!ct --help|confirm` or cancel the reset by calling `!ct --reset|cancel`. Unless the reset is confirmed, the reset will not occur. This is done as a safety precaution to ensure a reset is not made in error.

### Campaign

`!ct --campaign`

This will send to chat a table that lists the token markers currently available in the campaign. The default Roll20 token markers (the various color circles and the "death" token marker) are not included in this table.

The table includes the token marker image and the token name. The token name that gets output is the name that must be used when customizing a condition object's `markerName` property in the ConditionTracker state.

### Add

`!ct --add|<comma separated list of conditions>`, e.g. `!ct --add|blinded, deafened`

This will cumulatively add the specified condition(s) to the selected token(s) tooltip. If a condition has a linked token marker, the token marker will also be cumulatively applied to the token.

If a token already has a specified condition/token marker applied to it, another instance will be applied. For example, if Cas the Elf currently has the "blinded" condition and token marker applied to it, calling `!ct --add|blinded` will cause Cas the Elf to have two "blinded" token markers, and their tooltip will be set to "Blinded, Blinded".

### Remove

`!ct --remove|<comma separated list of conditions>`, e.g. `!ct --remove|blinded, deafened`

By default, this will remove all instances of the specified condition(s) from the selected token(s) tooltip. If a condition has a linked token marker, all instances of that token marker will also be removed from the token.

If you call `!ct --remove|all` on any selected tokens, all conditions will be removed from the token's tooltip and any linked token markers will also be removed.

#### Modifiers

**single** (`!ct --remove|single|<comma separated list of conditions>`): This will only remove a single instance of the specified condition(s) from the selected token(s) tooltip. If a condition has a linked token marker, only a single instance of that token marker will be removed.

### Toggle

`!ct --toggle|<comma separated list of conditions>`, e.g. `!ct --toggle|blinded, deafened`

This will toggle the specified condition(s) on the selected token(s). If the token currently has a specified condition then the condition will be removed, otherwise the condition will be added. Any linked token markers will be toggled similarly.

### Current

`!ct --current`

This will send to chat a list of the conditions currently affecting the selected token(s), along with the effects of the condition.
