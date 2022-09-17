# ConditionTracker

Thank you for installing ConditionTracker! To suggest features or to report bugs, please create an issue at my [ConditionTracker repo](https://github.com/thatblindgeye/ConditionTracker).

The purpose of this script is to streamline adding conditions to tokens and tracking which conditions are currently affecting a token.

This script utilizes token tooltips as the primary way of tracking conditions, so it's best to not already be using tooltips for other purposes. Token markers are also utilized as an additional way to track conditions.

## Basic Syntax

In order to use a ConditionTracker command, you must use the following syntax:

`!ct <keyword>|<options>`

- **`!ct`**: This must preface a ConditionTracker command in order to call it. This helps avoid name collisions with other installed scripts that may have similarly named commands.
- **`<keyword>`** This is the primary command keyword which determines what command will be called. If a proper keyword is not passed in, or if a player does not have permission to use a command, an error message will be whispered to that player.
- **`<options>`** This is what gets passed to the command. The format or limitation of options that can be passed in will depend on the command being called.

When using a command, generally letter case is not important. Sending `!CT aDd|bLIndED` would be as valid as `!ct add|blinded`.

## Commands List

The following commands are available for use. Most commands are setup so that only the GM has permission to call them.

### Help (All)

`!ct help|<optional comma separated list of command names>`
e.g. `!ct help` or `!ct help|add, remove`

This will display a table of ConditionTracker commands in chat. The table includes the command keyword, the command syntax, and a description of the command.

When at least one valid command name is passed in as an option, only the specified commands will be sent to chat.

### Reset (GM)

`!ct reset`

This will reset the ConditionTracker state to the default state for the currently installed version. **Running this command will overwrite any customizations made to the ConditionTracker state, and the reset cannot be undone**.

When this command is called a message will be whispered to the GM, which will include buttons to either confirm or cancel the reset.

### Markers (All)

`!ct markers|<optional comma separated list of strings>`
e.g. `!ct markers` or `!ct markers|bli, dea`

This will send to chat a table that lists the token markers currently available in the campaign. The table includes the token marker image and the token name/tag. The token name/tag that gets output is the value that must be used when customizing a condition's marker in the ConditionTracker Config character bio.

The options passed into this command act as filters, and do not need to exactly match a token marker name. For example, `!ct markers|bli, dea` would return any token markers with "bli" or "dea" in their name, such as "blinded', "deafened', and "dead'.

### Add (GM)

`!ct add|<comma separated list of conditions>`
e.g. `!ct add|blinded, deafened`

This will cumulatively add a single instance of the specified condition(s) to the selected token(s) tooltip. If a condition has a linked token marker, the token marker will also be cumulatively applied to the token.

Up to two hyphenated numbers can follow each condition that is passed in. The first hyphenated number will be the amount of condition instances to add, while the second number will be the maximum the instances can total with the current command call. For example, `!ct add|blinded-2-5` would add 2 instances of the blinded condition, but only to a maximum of 5. If the current total of instances before calling the command is greater than the maximum, no instances will be added.

When adding a single condition instance with a maximum amount, `!ct add|blinded--5` can be called instead of `!ct add|blinded-1-5`.

### Remove (GM)

`!ct remove|<comma separated list of conditions>`
e.g. `!ct remove|blinded, deafened`

This will remove a single instance of the specified condition(s) from the selected token(s) tooltip. If a condition has a linked token marker, a single instances of that token marker will also be removed from the token.

Up to two hyphenated numbers can follow each condition that is passed in. The first hyphenated number will be the amount of condition instances to remove, while the second number will be the minimum the instances can total with the current command call. For example, `!ct remove|blinded-2-5` would remove 2 instances of the blinded condition, but only to a minimum of 5. If the current total of instances before calling the command is less than the minimum, no instances will be removed.

When removing a single condition instance with a minimum amount, `!ct remove|blinded--5` can be called instead of `!ct remove|blinded-1-5`.

To remove all instances of a condition you can pass in '-all' instead of a hyphenated number, such as `!ct remove|blinded-all`.

If no options are passed in, such as `!ct remove`, all instances of all conditions will be removed from the selected token(s).

### Set (GM)

`!ct set|<comma separated list of conditions with a hyphenated number>`
e.g. `!ct set|blinded-5`

This will set the number of instances of the specified condition(s) on the selected token(s) to the specified amount. If a valid marker is linked to the condition, the linked marker will also be set on the token to the specified amount.

Each condition passed in can be followed by a single hyphenated number, which will be the amount of instances to set for the condition. For example, `!ct set|blinded-5` would set the number of instances of the blinded condition to 5.

Passing in a condition without a hyphenated number, such as `!ct set|blinded` would be the same as calling `!ct set|blinded-1`.

Passing in 0 as the amount, such as `!ct set|blinded-0`, will remove the condition from the selected tokens.

### Toggle (GM)

`!ct toggle|<comma separated list of conditions>`
e.g. `!ct toggle|blinded, deafened`

This will toggle the specified condition(s) on the selected token(s). If the token currently has a specified condition then the condition will be removed, otherwise the condition will be added. Any linked token markers will be toggled similarly.

### Conditions (All)

`!ct conditions|<optional comma separated list of conditions>`

This will send to chat a list of conditions and their descriptions depending on how the command is called. If one or more tokens are selected, any conditions affecting the selected tokens will be sent to chat. If no tokens are selected, all conditions currently set in the `ConditionTracker.conditions` state will be sent to chat.

If any conditions are passed in as options to the command, e.g. `!ct conditions|blinded, deafened`, the specified conditions will be sent to chat. This is the default behavior when options are passed in, even if a token is selected.

### Tooltip (GM)

`!ct tooltip|<optional true or false>`

This will determine whether token tooltips are displayed. The default setting is `true` to display token tooltips. Any tokens that are on the tabletop when the command is called with an option of `true` or `false` will be updated, and any tokens placed on the tabletop will be updated automatically based on this setting.

If no options are passed in, the current setting will be whispered to the GM.

## ConditionTracker Config

The ConditionTracker Config character bio consists of an "instructions" tab and a "conditions" tab. The instructions tab includes the same information that follows, and the conditions tab is where you can customize the conditions in your campaign, their linked markers, and their descriptions.

### Editing the Conditions Table

When editing this conditions table, it is important to ensure the table remains intact and that the table layout is not altered.

#### Condition column

Cells in this column refer to a condition's name. Each condition must be a simple string, and must be unique regardless of letter case. For example, `blinded` (all lowercase) and `Blinded` (capitalized first letter) would not be unique condition names. However the condition name is formatted here is how it will appear when rendered on a token's tooltip or when sent as a condition card in chat.

When the character bio is saved, there are several checks that occur to ensure a condition name is valid. If a condition name is not valid, it is reformatted to become valid so that information entered by users is not lost. The checks that occur include:

- Any vertical pipes `|` and hyphens `-` are removed
- Extraneous whitespace is trimmed from the condition name (only a single whitespace will remain between characters)
- Empty strings are replaced with a generic condition name of "Condition" + a unique number identifier
- If the condition name already exists, a unique number identifier is appended to the condition name

After all checks are finished, the conditions table is sorted alphabetically by condition name, ignoring letter case.

#### Marker column

Cells in this column refer to a valid marker in your campaign's current token marker set, and will link the specified marker to the condition.

Values in this column must match a token marker `name` or `tag` property exactly, including lettercase, hyphens `-`, and underscores `_`. You should always use the `tag` property of a marker instead of the `name` property when you can, as custom markers must be formatted in a specific way and must include a trailing double colon and numbers, e.g. `::12345`.

If a value is not entered correctly, the token marker will not be linked to the condition, and the marker image will not be applied to tokens when calling ConditionTracker commands.

To get a list of valid values to enter in this column, call the `!ct markers` command in chat.

#### Description column

Cells in this column refer to a condition's description. Each description must be an ordered or unordered list (the list will be updated to an unordered one upon saving), with each list item acting as a separate description item or effect for the condition. Nested lists are not supported, but you can add simple font styles such as bold, italic, underline, strikethrough, and font color.

You can also add 'buttons' that will send another condition card to chat by wrapping text in a link, and passing in the `!ct conditions|<condition name>` command as the link's URL.

## updateConditionInstances

`ConditionTracker.updateConditionInstances(updateType, conditions, tokensToUpdate)`

The method for updating conditions on a token is exposed for external use, should you need it. The method has the following parameters:

- **updateType**: This must be one of `"add"`, `"remove"`, `"set"`, or `"toggle"`.
- **conditions**: This must be either a falsey value (only when also passing in an `updateType` of `"remove"`) or a comma separated string of conditions. Passing in a falsey value is the same as calling the `!ct remove` command, causing all instances of all conditions to be removed. When passing in a string, you must follow the same syntax of conditions passed into ConditionTracker commands, for example `"blinded"`, `"blinded-1"`, or `"blinded-1-5, deafened-all, stunned"`.
- **tokensToUpdate**: This must be an array of token objects, with each object having either an `_id` or `id` property.

## createConditionCards

`ConditionTracker.createConditionCards(tokenObj, conditions)`

The method for rendering condition cards in the Roll20 chat is also exposed for external use. The method can take a combination of the following parameters:

- **tokenObj**: This can either be a falsey value or an object with an `id` or `_id` property.
- **conditions**: This can either be a falsey value or a comma separated string of conditions, e.g. `"blinded, deafened"`.

If a valid object is passed into `tokenObj` and a falsey value is passed into `conditions`, condition cards will be send to chat based on the conditions currently applied to the token whose `id` or `_id` is passed in.

If a valid string is passed into `conditions`, only condition cards for the passed in conditions will be sent to chat, even if `tokenObj` has a valid object passed in.

If neither parameter is passed in when the method is called, e.g. `ConditionTracker.createConditionCards()`, condition cards for every condition listed in the ConditionTracker Config character bio will be sent to chat.
