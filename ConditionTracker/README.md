# Condition Tracker

Thank you for installing ConditionTracker! To suggest features or to report bugs, please create an issue at my [Roll20 scripts repo](https://github.com/thatblindgeye/roll20_scripts).

The purpose of this script is to streamline adding conditions to tokens and tracking which conditions are currently affecting a token.

This script utilizes token tooltips as the primary way of tracking conditions, so it's best to not already be using tooltips for other purposes. Enabling tooltips on tokens is optional, though recommended for users who may not be able to easily identify token markers.

Token markers are also utilized as an additional way to track conditions.

## ConditionTracker State

When this script is installed for the first time, ConditionTracker will be added to your campaign's state object and a character named "ConditionTracker Config" will be created in your campaign.

When a new version of ConditionTracker is installed, the state and ConditionTracker Config character will be updated **without** overwriting any customizations made by you. This is done on purpose to avoid you having to add back in your customizations with each update.

The basic structure of ConditionTracker state is as follows:

- **Version**: The current version of CondtiionTracker. This is used to check whether the currently installed version is up to date, and to update it if not.
- **Conditions**: An array of condition objects that can be customized. By default the condition objects are common conditions or statuses found in D&D 5e.

  You do not need to customize the conditions state in order to add or remove a condition to a token. The condistions state simply allows for storing condition information across game sessions, quickly referencing condition descriptions, and linking token markers to specific conditions.

  Each condition object is comprised of the following properties:

  - `conditionName` (_string_): The name that will be used by various commands.
  - `markerName` (_string_ or _null_): Can link the condition to a token marker in your campaign's token marker set.
  - `description` (_array of strings_): An optional array that describes the condition in more detail, such as any effects that apply.

## Basic Syntax

In order to use a ConditionTracker command, you must use the following syntax:

`!ct <keyword>|<options>|<optional modifier>`

- **`!ct`**: This must preface a ConditionTracker command in order to call it. This helps avoid name collisions with other installed scripts that may have similarly named commands.

- **`<keyword>`** This is the primary command keyword which determines what command will be called. If a proper keyword is not passed in, an error message will be sent to chat.

- **`<options>`** This is what gets passed to the command. The format or limitation of options that can be passed in will depend on the command being called, but generally lettercase does not need to be exact when passing a value into this parameter.

- **`<optional modifier>`** This will modify the command in some way. If a modifier is not passed in, the command will be called with its default behavior.

## Commands List

### Help

`!ct help`

This will display a table of valid ConditionTracker commands in chat. The table includes the command keyword, a description of the command, the proper syntax, and any modifiers for the command.

### Reset

`!ct reset`

This will reset the ConditionTracker state to the default state for the currently installed version. **Running this command will overwrite any customizations made to the ConditionTracker state, and the reset cannot be undone**. This command should be ran if there is an irreversible issue caused from editing the ConditionTracker Config bio, but only after copying down any information you wish to attempt to add back in after the reset.

The first time this command is called, you will be asked to confirm the reset by calling `!ct help|confirm` or cancel the reset by calling `!ct reset|cancel`. Unless the reset is confirmed, the reset will not occur. This is done as a safety precaution to ensure a reset is not made in error.

### Markers

`!ct markers`

This will send to chat a table that lists the token markers currently available in the campaign. The default Roll20 token markers (the various color circles and the "death" token marker) are not included in this table.

The table includes the token marker image and the token name. The token name that gets output is the name that must be used when customizing a condition's marker in the ConditionTracker Config character bio.

### Add

`!ct add|<comma separated list of conditions>`, e.g. `!ct add|blinded, deafened`

This will cumulatively add the specified condition(s) to the selected token(s) tooltip. If a condition has a linked token marker, the token marker will also be cumulatively applied to the token.

If a token already has a specified condition/token marker applied to it, another instance will be applied. For example, if Cas the Elf currently has the "blinded" condition and token marker applied to them, calling `!ct add|blinded` will cause Cas the Elf to have two "blinded" token markers, and their tooltip will be set to "Blinded, Blinded".

### Remove

`!ct remove|<comma separated list of conditions>`, e.g. `!ct remove|blinded, deafened`

By default, this will remove all instances of the specified condition(s) from the selected token(s) tooltip. If a condition has a linked token marker, all instances of that token marker will also be removed from the token.

If you call `!ct remove|all` on any selected tokens, all conditions will be removed from the token's tooltip and any linked token markers will also be removed.

#### Modifiers

**single** (`!ct remove|<comma separated list of conditions>|single`): This will only remove a single instance of the specified condition(s) from the selected token(s) tooltip. If a condition has a linked token marker, only a single instance of that token marker will be removed.

### Toggle

`!ct toggle|<comma separated list of conditions>`, e.g. `!ct toggle|blinded, deafened`

This will toggle the specified condition(s) on the selected token(s). If the token currently has a specified condition then the condition will be removed, otherwise the condition will be added. Any linked token markers will be toggled similarly.

### Conditions

`!ct conditions|<optional comma separated list of conditions>`

This will send to chat a list of conditions and their descriptions depending on how the command is called. If one or more tokens are selected, any conditions affecting the selected tokens will be sent to chat. If no tokens are selected, all conditions currently set in the `ConditionTracker.conditions` state will be sent to chat.

If any conditions are passed in as options to the command, e.g. `!ct conditions|blinded, deafened`, the specified conditions will be sent to chat. This is the default behavior when options are passed in, even if a token is selected.

## ConditionTracker Config

The ConditionTracker Config character bio is how you can customize the `ConditionTracker.conditions` state. The ConditionTracker Config character bio includes the same instructions that follow, as well as a table where each condition currently set in state is rendered.

### Editing the config table

When editing this config table, it is important to ensure the table remains intact and that the table layout is not altered.

#### Condition column

Cells in this column refer to a condition's `conditionName` property in state. Each condition name must be a simple string, and must be unique regardless of lettercase. For example, `blinded` (all lowercase) and `Blinded` (capitalized first letter) would not be unique condition names. However the condition name is formatted here is how it will appear when rendered on a token's tooltip or when sent as a condition card in chat.

When condition names are attempted to be saved, there are several checks that occur to ensure the condition name is valid. If a condiiton name is not valid, it is reformatted to become valid so that information entered by users is not lost. The checks that occur include:

- Any vertical pipes `|` are removed
- Extraneous whitespace is trimmed from the condition name, including the middle (only a single whitespace is allowed between characters)
- Empty strings are replaced with a condition name of 'Condition' + a unique number identifier
- If the condition name already exists, a unique number identifier is appended to the condition name

After all checks are finished, the config table is sorted alphabetically by condition name, ignoring lettercase.

#### Marker column

Cells in this column refer to a condition's `markerName` property in state, linking a valid associated marker in your campaign's current token marker set to the condition. Each marker name must be either a simple string, or the word 'null'.

Marker names in this column must match a token marker name exactly, including lettercase and hyphens `-` or underscores `_`. If not entered correctly, a token marker will not be linked to the condition correctly, and the marker image will not be applied to tokens when using ConditionTracker commands.

When 'null' is entered for a marker name, it will not set the `markerName` property to a string, but instead the `null` data type. Due to this, it is best to avoid using 'null' as a marker name in your custom token marker sets.

#### Description column

Cells in this column refer to a condition's `description` property in state. Each description must be an ordered or unordered list, with each list item acting as a separate description item or effect for the condition. Nested lists are not supported, but you can add simple font styles such as bold, italic, underline, strikethrough, and font color.
