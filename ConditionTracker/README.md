# Condition Tracker

Thank you for installing ConditionTracker! To suggest features or to report bugs, please create an issue at my [Roll20 scripts repo](https://github.com/thatblindgeye/roll20_scripts).

## Description

The purpose of this script is to streamline adding conditions/statuses to tokens and tracking which conditions/statuses are currently affecting a token.

## Basic Syntax

In order to use a ConditionTracker command, you must use the following syntax:

`!ct --<keyword>|<optional modifier>|<options>`

**`!ct`**: This must preface every ConditionTracker command in order to properly call them. This helps avoid name collisions with other scripts that may be installed.

**`--<keyword>`** This is the primary command keyword which determines what command will be called. If a proper keyword is not passed in, an error message will be sent to chat.

**`<optional modifier>`** This will modify the command in some way. If a modifier is not passed in, the command will be called with its default behavior.

**`<options>`** This is what gets passed to the command. The format of the options passed in will depend on the command being called.

## Commands List
