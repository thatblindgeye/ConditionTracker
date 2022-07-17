# Condition Tracker

Thank you for installing ConditionTracker! To suggest features or to report bugs, please create an issue at my [Roll20 scripts repo](https://github.com/thatblindgeye/roll20_scripts).

## Description

The purpose of this script is to streamline adding conditions/statuses to tokens and tracking which conditions/statuses are currently affecting a token.

## ConditionTracker State

When the script is installed, ConditionTracker will be added to the campaign's state object. When a new version of ConditionTracker is installed, this state will be updated with any changes **without** overwriting any customizations made to state by the user. This is done on purpose to avoid users having to add back in their customizations with each update.

The basic structure of ConditionTracker state is as follows:

- **Version**: The current version of CondtiionTracker. This is used to check whether the currently installed version is up to date, and to update if not.
- **Conditions**: An array of condition objects that can be customized by the user. By default the condition objects included reference common conditions or statuses in D&D 5E.

  You do not need to create a condition object in order to add or remove a condition to a token. A condition object simply allows for storing condition information across game sessions and automated token marker customization.

  When customizing the conditions array, each condition object must include the following properties, with a value of the specified type:

  - `conditionName` (_string_): This is the **required** name that will be used by various commands. The value does not need to be capitalized, as ConditionTracker will format the name before rendering it in Roll20.
  - `markerName` (_string_ or _null_): When this value is the same as a valid token marker name in your campaign, the token marker will be added or removed along with the condition. If you do not wish to link the condition to a token marker, a value of `null` **must** be given to this property.
  - `effects` (_array_): This is an optional array of effects that describe the condition in more detail. Each effect should be its own array item.

## Basic Syntax

In order to use a ConditionTracker command, you must use the following syntax:

`!ct --<keyword>|<optional modifier>|<options>`

**`!ct`**: This must preface every ConditionTracker command in order to properly call them. This helps avoid name collisions with other scripts that may be installed.

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
