# BarThresholds

Thank you for installing BarThresholds! To suggest features or to report bugs, please create an issue at my [Roll20 scripts repo](https://github.com/thatblindgeye/roll20_scripts).

The purpose of this script is to automate the process of having an effect occur when a token's bar value reaches a certain threshold. This effect can be either changing one or more token properties, or running a command from another script you have installed.

## BarThresholds State

When this script is installed for the first time, BarThresholds will be added to your campaign's state object and a character named "BarThresholds Config" will be created in your campaign. The existence of the BarThresholds Config character will be checked on each subsequent load of the game, adding it back in if it no longer exists.

When a new version of BarThresholds is installed, the state and BarThresholds Config character will be updated **without** overwriting any existing thresholds. This is done on purpose to avoid you having to add back in your thresholds with each update. Keep in mind that this may change if any additional features are added.

The basic structure of BarThresholds state is as follows:

- **bar1, bar2, bar3**: Each token bar has its own state, which is an array of threshold objects currently created for the bar.

- **version**: The current version of BarThresholds. This is used to check whether the currently installed version is up to date, and to update it if not.

- **currentTab** and **configId**: The `currentTab` state is used to keep track of which tab in the BarThresholds Config character bio is active. The `cnnfigId` state is used to store the ID of the BarThresholds Config character.

## Adding a Threshold

Each token bar has its own section in the "Thresholds" tab of the BarThresholds Config character bio. Clicking the "Add threshold" button within a section will trigger a series of dialogs for you to enter threshold data.

### Threshold Targets

This dialog determines which tokens a threshold will affect. The possible options are:

-**All tokens**: The threshold will affect every token.

-**Only selected tokens**: The threshold will affect only the tokens that are selected when the threshold is created.

-**Except selected tokens**: The opposite of the previous option. The threshold will affect all tokens except ones that are selected when the threshold is created.

When choosing the "Only selected tokens" or "Except selected tokens" option, you should ensure you select any tokens before clicking "submit" on the final "Effect value(s)" step.

### Comparison Type

This dialog determines what comparison is made against the applicable bar value when a threshold runs. If a comparison returns `false` for a threshold target the threshold will stop executing, and if the comparison returns `true` it will continue executing to run the linked effect. The possible options are:

-**Equal to**: The comparison will return `true` only when the bar value is equal to the comparison value. This comparison type can be used for both numbers or strings, and the comparison does not check for strict equality. For example, if the comparison value is `5`, the comparison will return `true` when the bar value is also `5`, regardless if the value type is a number or string. Note that this is the only comparison type that can have non-integers or non-percentages entered as a comparison value.

-**Greater than**: The comparison will return `true` only when the bar value is greater than the comparison value.

-**Less than**: The comparison will return `true` only when the bar value is less than the comparison value.

-**Greater than or equal to**: The comparison will return `true` when the bar value is either greater than or equal to the comparison value.

-**Less than or equal to**: The comparison will return `true` when the bar value is either less than or equal to the comparison value.

-**Greater than X and Less than Y**: The comparison will return `true` only when the bar value is both greater than one comparison value and less than another comparison value.

-**Greater than or equal to X and Less than or equal to Y**: The comparison will return `true` only when the bar value is both greater than or equal to one comparison value, and less than or equal to another comparison value.

When the "Greater than X and Less than Y" or "Greater than or equal to X and Less than or equal to Y" comparison types are selected, you must enter two values as a comma separated list, e.g. `10, 20`. Additionally, the first value entered must be smaller than the second value entered, otherwise the threshold will not be created (a bar value cannot be both greater than (or equal to) 50 and less than (or equal to) 25).

When the "Greater than X and Less than Y" comparison type is selected, you must also make sure the two values entered are not the same (a bar value cannot be both greater than 50 and less than 50).

### Comparison Value(s)

This dialog determines the value to compare a bar value against in the comparison that is ran. You can enter either a string e.g. `five` (only when using a comparison type of `Equal to`), an integer e.g. `5`, or a percentage e.g. `25%`. If left blank, the threshold will not be created.

When a percentage is entered, the comparison value will be the specified percentage of the bar max, rounded down. For example, if a value of `25%` is entered and a threshold target has a bar max of `50`, the comparison value will be `12` (50 x 25% = 12.5, rounded down to 12).

if a threshold target does not have a bar max set when a percentage is entered as the comparison value, the comparison will return `false` and the threshold's effect will not be called.

### Effect Type

This dialog determines what effect will be ran when a comparison returns `true`. The possible options are:

-**Add marker**: This will add a single marker to the threshold target. This effect will only add a single marker, even if the same threshold executes multiple times on the same target. For all marker effect types, you must enter a marker name that exists in your campaign, otherwise the threshold will not be created.

-**Remove marker**: This will remove a single marker from the threshold target. If the target has multiple of the specified marker, all instances of that marker will be removed.

-**Add marker and Remove marker**: This will add one marker to the threshold target, and remove another marker from them. When entering a value for this effect type, you must enter a comma separated list of values, e.g. `red, yellow` would add the "red" marker and remove the "yellow" marker.

-**Update tint color**: This will update the tint color for the threshold target. When entering a value for this effect type, you must enter a HEX color with 6 digits, e.g. `#ff0000`. Shorthand HEX values are not allowed.

-**Update aura 1** and **Update aura 2**: This will update one of the two aura's on the threshold target. When entering a value for this effect type, you must enter either `0` to turn the aura off or a comma separated list formatted as `aura radius, aura shape, aura color, optional boolean to show the aura to players`.

    The aura radius must be a positive number, either an integer or decimal. The aura shape must either be a value of `circle` or `square`. The aura color must be a HEX color with 6 digits (shorthand HEX values are not allowed). By default, an aura radius is set to not be shown to players, so this value can be omitted if you do not want the aura to be shown to players when set via the threshold.

-**Custom command**: This effect type allows you to enter a custom command from another script you have installed in the campaign. Due to how the BarThresholds script handles splitting apart its own commands to parse the various parameters, when entering a custom command you must use the HTML entities for vertical pipes `|` and commas `,`. The HTML entitiy for vertical pipes is `&#124;`, and the HTML entity for commas is `&#44;`.

    For example, to enter a custom command such as `!prefix keyword|option1, option2`, you would have to enter `!prefix keyword&#124;option1&#44; option2`. BarThresholds will then replace the entities to the correct characters so that the commands will run correctly when the threshold is triggered.

### Effect Value(s)

This dialog determines the actual value(s) of the chosen effect type. If left blank, the threshold will not be created.

## Editing and Deleting Thresholds

Each individual threshold can be edited or deleted after creation. For each threshold, you can click the "Threshold Targets", "Comparison", or "Effect" buttons to edit the related properties of that threshold.

After clicking the "Delete threshold" button, a dialog asking you to confirm the deletion will appear, with the default selection being "Cancel" as a precaution to avoid accidental deletion.

## Running Thresholds in External Scripts

`BarThresholds.RunThresholds(bar, tokenID)`

The `runThresholds` method is exported from the BarThresholds script, allowing you to run thresholds in your own custom commands outside of the `change:graphic:barX_value` event. This can be especially useful if a token's bar value is set via Roll20's `set` method, as this will not trigger the `change:graphic:barX_value` events within the BarThresholds script.

When using the `runThresholds` method, you must pass in two parameters: a `bar` and a `tokenID`. The `bar` parameter determines which bar thresholds to run and must be a string of either "bar1", "bar2", or "bar3". The `tokenID` parameter determines whether the token with that ID is a valid threshold target. This can either be manually passed in as a string, e.g. `"-N8u_AM_kks6if4OUmhT"`, or it can be passed in by accessing the `id` property on an object, e.g. `obj.id`.
