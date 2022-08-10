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

Each token bar has its own section in the "Thresholds" tab of the BarThresholds Config character bio. Clicking the "Add threshold" button next to a section heading will trigger a series of dialogs for you to enter threshold data.

### Token Targets

## Bars

Each token bar can have a threshold added to it.

The bar that you choose for each threshold set refers to one of the three bars that can be edited on each token. Entering a value in a bar's associated radial bubble will set the value of that bar, but you will have to double click a token in order to edit a bar's max value.

Keep in mind that the order of the radial bubbles is slightly different than the actual bar order: the first radial bubble is linked to `bar3`, the middle radial bubble is linked to `bar1`, and the last radial bubble is linked to `bar2`.

A threshold set is comprised of individual thresholds that will determine the effect that occurs. A threshold set can have as many thresholds as you require, but must have at least one.

When you create a new threshold set you choose which tokens and which bar the threshold set will apply to.

### Tokens

A threshold set can either apply to all tokens in the campaign, all tokens except the selected tokens at the time of creating the set, or only the selected tokens at the time of creating the set.

### Bars

The bar that you choose for each threshold set refers to one of the three bars that can be edited on each token. Entering a value in a bar's associated radial bubble will set the value of that bar, but you will have to double click a token in order to edit a bar's max value.

Keep in mind that the order of the radial bubbles is slightly different than the actual bar order: the first radial bubble is linked to `bar3`, the middle radial bubble is linked to `bar1`, and the last radial bubble is linked to `bar2`.

## Thresholds

Each threshold added to a set is comprised of a type, an operator, at least one comparison value, and an effect.

## Type

A threshold type determines whether the threshold is based on a percentage or a value.

### Percentage

A percentage threshold will cause an effect to occur when the bar's value reaches a specified percentage of the bar's maximum value, rounded down. If the bar does not have a maximum value or if the bar does not use numbers as its value and maximum value, the threshold's effect will not occur.

When entering a percentage threshold, the percentage must be expressed as a decimal between 0 and 1. For example, for a threshold to occur at 50% of the bar's maximum value, you would enter `0.5`.

### Value

A value threshold will cause an effect to occur when the bar has a specified value, including strings. A value threshold does not require a bar to have a maximum value set.

## Operator

A threshold operator determines the condition for when the threshold will be triggered.

### Equal

This will cause a threshold to trigger only when a bar's value is equal to the specified comparison value. If a bar's value is updated and skips over the threshold's specified comparison value, the threshold will not be triggered.

This operator can be useful if a bar's value increments or decrements in fixed amounts.

### Less Than or Greater Than

This will cause a threshold to trigger when a bar's value is less than/greater than the specified comparison value. This can lead to multiple thresholds being triggered if a bar's value is incremented or decremented by a large amount. For example, if a bar's value goes from 100 to 20 at once, it would cause a threshold to trigger both from the bar's value being "less than 50" and "less than 25".

These operators can be useful if a threshold should always trigger any time the bar's value is less than/greater than the comparison value.

### Less And Greater

This will cause a threshold to trigger when a bar's value is less than one comparison value, and greater than another comparison value.

This operator can be useful if you only want a threshold to trigger between a specific range.

### Less Than/Equal or Greater Than/Equal

Similar to the less than or greater than operators, except the threshold will trigger when a bar's value is also equal to the comparison value.

### Less And Greater/Equal

Similar to the "less and greater" operator, except the threshold will trigger when a bar's value is also equal to a specified comparison value.

## Effects

Each threshold in a set can cause a different effect to occur.

### Add

This effect will add something to or update something on one of the token's properties, such as a token marker, an aura, or a tint. The result will vary based on the specified property. For example, adding an aura on a token that already has an aura will replace the previous aura, but adding a token marker will add that token marker to the token's current token markers.

### Remove

This effect will remove something from one of the token's properties, the opposite of the "add" effect.

### Add and Remove

This is a combination of the "add" and "remove" effects. Instead of adding a threshold for the "add" effect and another threshold for the "remove" effect, you can instead add a threshold to do both at once.

### Command

This effect will run a command from another script you have installed.
