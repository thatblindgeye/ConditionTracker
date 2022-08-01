/**
 * ConditionTracker
 *
 * Version 1.0
 * Last updated: July 29, 2022
 * Author: thatblindgeye
 *
 * Command syntax:
 * !ct <keyword>|<options>|<optional modifier>
 *
 * Potential features:
 *  - Add a number modifier to add and remove commands as max/min values; add|blinded|3 will only add the blinded condition if there are less than 3 instances of it, and remove|blinded|3 will remove instances of the blinded condition, but leave 3 instances on the token.
 *  - Add modifiers to toggle command to allow addonly and removeonly; if tokens are selected, toggle|blinded|addonly will toggle the condition, but not remove it.
 */

var ConditionTracker =
  ConditionTracker ||
  (function () {
    "use strict";

    let campaignMarkers;
    let resetAttempted = false;
    let uniqueId = Number(Date.now().toString().slice(-5));

    const VERSION = "1.0";
    const LAST_UPDATED = 1659136727071;
    const CT_DISPLAY_NAME = `ConditionTracker v${VERSION}`;
    const CT_CONFIG_NAME = "ConditionTracker Config";
    const ROLL20_MARKERS = [
      {
        image:
          "<div style='width: 5rem; height: 5rem; border: 1px solid rgba(0,0,0,0.25); border-radius: 25px; background-color: #c91010;'></div>",
        name: "red",
      },
      {
        image:
          "<div style='width: 5rem; height: 5rem; border: 1px solid rgba(0,0,0,0.25); border-radius: 25px; background-color: #1076c9;'></div>",
        name: "blue",
      },
      {
        image:
          "<div style='width: 5rem; height: 5rem; border: 1px solid rgba(0,0,0,0.25); border-radius: 25px; background-color: #2fc910;'></div>",
        name: "green",
      },
      {
        image:
          "<div style='width: 5rem; height: 5rem; border: 1px solid rgba(0,0,0,0.25); border-radius: 25px; background-color: #c97310;'></div>",
        name: "brown",
      },
      {
        image:
          "<div style='width: 5rem; height: 5rem; border: 1px solid rgba(0,0,0,0.25); border-radius: 25px; background-color: #9510c9;'></div>",
        name: "purple",
      },
      {
        image:
          "<div style='width: 5rem; height: 5rem; border: 1px solid rgba(0,0,0,0.25); border-radius: 25px; background-color: #eb75e1;'></div>",
        name: "pink",
      },
      {
        image:
          "<div style='width: 5rem; height: 5rem; border: 1px solid rgba(0,0,0,0.25); border-radius: 25px; background-color: #e5eb75;'></div>",
        name: "yellow",
      },
      {
        image:
          "<div style='padding: 10px 0; color: #cc1010; font-size: 6rem;'>X</div>",
        name: "dead",
      },
    ];

    const COMMANDS_LIST = {
      help: {
        keyword: "help",
        description:
          "Sends to chat a table of ConditionTracker commands and their descriptions. If any valid command names are passed in as options, only those commands will be sent to chat.",
        syntax:
          "<code>!ct help|&#60;optional comma separated list of command names&#62;</code>",
        modifiers: [],
      },
      reset: {
        keyword: "reset",
        description:
          "Resets the ConditionTracker state to version " +
          VERSION +
          "'s default. <strong>This will overwrite any customizatons made to the campaign's current ConditionTracker state and cannot be undone</strong>.",
        syntax:
          "<code>!ct reset</code>, followed by <code>!ct reset|confirm</code> or <code>!ct reset|cancel</code>",
        modifiers: [],
      },
      markers: {
        keyword: "markers",
        description:
          "Sends to chat a table of token markers currently available in the campaign. The table includes the marker image and name. <br/><br/> Any options passed in do not need to match a token marker name exactly, as options will act as a filter and return only token markers that include any of the options in their name.",
        syntax:
          "<code>!ct markers|&#60;optional comma separated list of strings&#62;</code>, e.g. <code>!ct markers|bli, dea</code> would return 'blinded', 'deafened', and 'dead'.",
        modifiers: [],
      },
      addCondition: {
        keyword: "add",
        description:
          "Cumulatively adds the specified condition(s) to the selected token(s) tooltip. If a valid marker is linked to the condition, the linked marker will also be cumulatively added to the token. <br/><br/> Useful if multiple instances of a condition has a different meaning than a single instance.",
        syntax:
          "<code>!ct add|&#60;comma separated list of conditions&#62;</code>, e.g. <code>!ct add|blinded, deafened</code>",
        modifiers: [],
      },
      removeCondition: {
        keyword: "remove",
        description:
          "Removes all instances of the specified condition(s) from the selected token(s) tooltip. If a valid marker is linked to the condition, all instances of the linked marker will also be removed from the token. <br/><br/> If no options are passed in, all instances of all conditions will be removed from the selected token(s).",
        syntax:
          "<code>!ct remove|&#60;comma separated list of conditions&#62;</code>, e.g. <code>!ct remove|blinded, deafened</code>",
        modifiers: [
          {
            keyword: "single",
            description:
              "Removes only a single instance of the specified condition(s) from the selected token(s).",
          },
        ],
      },
      toggleCondition: {
        keyword: "toggle",
        description:
          "Toggles the specified condition(s) on the selected token(s) tooltip. If a condition is currently applied to a token it will be removed, otherwise the condition will be added. If a valid marker is linked to the condition, the linked marker will also be toggled on the token.",
        syntax:
          "<code>!ct toggle|&#60;comma separated list of conditions&#62;</code>, e.g. <code>!ct toggle|blinded, deafened</code>",
        modifiers: [],
      },
      currentConditions: {
        keyword: "conditions",
        description:
          "Sends to chat conditions and their descriptions depending on how the command is called. If any token is selected and no options are passed in, a list of conditions currently affecting that token is sent to chat. <br/><br/> If a token is not selected, all conditions currently set in the ConditionTracker Config is sent to chat. If any options are passed in, the specified conditions are sent to chat.",
        syntax:
          "<code>!ct conditions</code> or <code>!ct conditions|&#60;comma separated list of conditions&#62;</code>, e.g. <code>!ct conditions|blinded, deafened</code>",
        modifiers: [],
      },
    };
    /** Uses D&D 5e conditions as a default. */
    const DEFAULT_STATE = {
      conditions: [
        {
          conditionName: "Advantage",
          markerName: null,
          description: [
            "A creature that has advantage rolls a second d20 when making an ability check, saving throw, or attack roll, and uses the <b>higher</b> of the two rolls.",
            "If multiple situations affect a roll and each one grants advantage or imposes disadvantage, the creature doesn't roll more than one additional d20.",
            "If circumstances cause a roll to have both advantage and disadvantage, the creature is considered to have neither of them, and they roll one d20. This is true even if multiple circumstances impose disadvantage and only one grants advantage or vice versa.",
            "When the creature has advantage or disadvantage and something in the game, such as the halfling's Lucky trait, lets the creature reroll or replace the d20, the creature can reroll or replace only one of the dice. The creature chooses which one.",
          ],
        },
        {
          conditionName: "Blinded",
          markerName: null,
          description: [
            "A blinded creature can't see and automatically fails any ability check that requires sight.",
            "Attack rolls against the creature have <a href='!ct conditions|advantage'>advantage</a>, and the creature's attack rolls have <a href='!ct conditions|disadvantage'>disadvantage</a>.",
          ],
        },
        {
          conditionName: "Blindsight",
          markerName: null,
          description: [
            "A creature with blindsight can perceive its surroundings without relying on sight, within a specific radius.",
          ],
        },
        {
          conditionName: "Charmed",
          markerName: null,
          description: [
            "A charmed creature can't attack the charmer or target the charmer with harmful abilities or magical effects.",
            "The charmer has <a href='!ct conditions|advantage'>advantage</a> on any ability check to interact socially with the creature.",
          ],
        },
        {
          conditionName: "Darkvision",
          markerName: null,
          description: [
            "A creature with darkvision can see in the dark within a specific radius.",
            "The creature can see in dim light within the radius as if it were bright light, and in darkness as if it were dim light.",
            "The creature can't discern color in darkness, only shades of gray.",
          ],
        },
        {
          conditionName: "Deafened",
          markerName: null,
          description: [
            "A deafened creature can't hear and automatically fails any ability check that requires hearing.",
          ],
        },
        {
          conditionName: "Dehydrated",
          markerName: null,
          description: [
            "A character needs one gallon of water per day, or two gallons per day if the weather is hot.",
            "A character who drinks only half that much water must succeed on a DC 15 Constitution saving throw or suffer one level of <a href='!ct conditions|exhaustion'>exhaustion</a> at the end of the day. A character with access to even less water automatically suffers one level of exhaustion at the end of the day.",
            "If the character already has one or more levels of <a href='!ct conditions|exhaustion'>exhaustion</a>, the character takes two levels in either case.",
          ],
        },
        {
          conditionName: "Disadvantage",
          markerName: null,
          description: [
            "A creature that has disadvantage rolls a second d20 when making an ability check, saving throw, or attack roll, and uses the <b>lower</b> of the two rolls.",
            "If multiple situations affect a roll and each one grants advantage or imposes disadvantage, the creature doesn't roll more than one additional d20.",
            "If circumstances cause a roll to have both advantage and disadvantage, the creature is considered to have neither of them, and they roll one d20. This is true even if multiple circumstances impose disadvantage and only one grants advantage or vice versa.",
            "When the creature has advantage or disadvantage and something in the game, such as the halfling's Lucky trait, lets the creature reroll or replace the d20, the creature can reroll or replace only one of the dice. The creature chooses which one.",
          ],
        },
        {
          conditionName: "Encumbered",
          markerName: null,
          description: [
            "A creature is considered encumbered when their carry weight exceeds 5 x their Strength score.",
            "An encumbered creature's speed drops by 10 feet.",
          ],
        },
        {
          conditionName: "Exhaustion",
          markerName: null,
          description: [
            "Some special abilities and environmental hazards, such as starvation and the long-term effects of freezing or scorching temperatures, can lead to a special condition called exhaustion. Exhaustion is measured in six levels. An effect can give a creature one or more levels of exhaustion, as specified in the effect's description.",
            "<b>Level 1</b>: <a href='!ct conditions|disadvantage'>Disadvantage</a> on ability checks",
            "<b>Level 2</b>: Speed halved",
            "<b>Level 3</b>: <a href='!ct conditions|disadvantage'>Disadvantage</a> on attack rolls and saving throws",
            "<b>Level 4</b>: Hit point maximum halved",
            "<b>Level 5</b>: Speed reduced to 0",
            "<b>Level 6</b>: Death",
            "If an already exhausted creature suffers another effect that causes exhaustion, its current level of exhaustion increases by the amount specified in the effect's description.",
            "A creature suffers the effect of its current level of exhaustion as well as all lower levels. For example, a creature suffering level 2 exhaustion has its speed halved and has disadvantage on ability checks.",
            "An effect that removes exhaustion reduces its level as specified in the effect's description, with all exhaustion effects ending if a creature's exhaustion level is reduced below 1.",
            "Finishing a long rest reduces a creature's exhaustion level by 1, provided that the creature has also ingested some food and drink. Also, being raised from the dead reduces a creature's exhaustion level by 1.",
          ],
        },
        {
          conditionName: "Falling",
          markerName: null,
          description: [
            "At the end of a fall, a creature takes 1d6 bludgeoning damage for every 10 feet it fell, to a maximum of 20d6.",
            "The creature lands <a href='!ct conditions|prone'>prone</a>, unless it avoids taking damage from the fall.",
          ],
        },
        {
          conditionName: "Frightened",
          markerName: null,
          description: [
            "A frightened creature has <a href='!ct conditions|disadvantage'>disadvantage</a> on ability checks and attack rolls while the source of its fear is within line of sight.",
            "The creature can't willingly move closer to the source of its fear.",
          ],
        },
        {
          conditionName: "Grappled",
          markerName: null,
          description: [
            "A grappled creature's speed becomes 0, and it can't benefit from any bonus to its speed.",
            "The condition ends if the grappler is <a href='!ct conditions|incapacitated'>incapacitated</a>.",
            "The condition also ends if an effect removes the grappled creature from the reach of the grappler or grappling effect, such as when a creature is hurled away by the thunderwave spell.",
          ],
        },
        {
          conditionName: "Heavily Encumbered",
          markerName: null,
          description: [
            "A creature is considered heavily encumbered when their carry weight exceeds 10 x their Strength score, up to their carrying capacity (15 x their Strength score).",
            "A heavily encumbered creature's speed drops by 20 feet, and they have <a href='!ct conditions|disadvantage'>disadvantage</a> on ability checks, saving throws, and attack rolls that use Strength, Dexterity, or Constitution.",
          ],
        },
        {
          conditionName: "Heavily Obscured",
          markerName: null,
          description: [
            "A creature effectively suffers from the <a href='!ct conditions|blinded'>blinded</a> condition when trying to see something that is or is in an area that is heavily obscured.",
            "Examples of situations that cause a creature to be heavily obscured include darkness, opaque fog, or dense foliage.",
          ],
        },
        {
          conditionName: "Incapacitated",
          markerName: null,
          description: [
            "An incapacitated creature can't take actions or reactions.",
          ],
        },
        {
          conditionName: "Invisible",
          markerName: null,
          description: [
            "An invisible creature is impossible to see without the aid of magic or a special sense. For the purpose of hiding, the creature is heavily obscured. The creature's location can be detected by any noise it makes or any tracks it leaves.",
            "Attack rolls against the creature have <a href='!ct conditions|disadvantage'>disadvantage</a>, and the creature's attack rolls have <a href='!ct conditions|advantage'>advantage</a>.",
          ],
        },
        {
          conditionName: "Lightly Obscured",
          markerName: null,
          description: [
            "A creature has <a href='!ct conditions|disadvantage'>disadvantage</a> on Wisdom (Perception) checks that rely on sight when trying to see something that is or is in an area that is lightly obscured.",
            "Examples of situations that cause a creature to be lightly obscured include dim light, patchy fog, or moderate foliage.",
          ],
        },
        {
          conditionName: "Paralyzed",
          markerName: null,
          description: [
            "A paralyzed creature is <a href='!ct conditions|incapacitated'>incapacitated</a> and can't move or speak.",
            "The creature automatically fails Strength and Dexterity saving throws.",
            "Attack rolls against the creature have <a href='!ct conditions|advantage'>advantage</a>.",
            "Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.",
          ],
        },
        {
          conditionName: "Petrified",
          markerName: null,
          description: [
            "A petrified creature is transformed, along with any nonmagical object it is wearing or carrying, into a solid inanimate substance (usually stone). Its weight increases by a factor of ten, and it ceases aging.",
            "The creature is <a href='!ct conditions|incapacitated'>incapacitated</a>, can't move or speak, and is unaware of its surroundings.",
            "Attack rolls against the creature have <a href='!ct conditions|advantage'>advantage</a>.",
            "The creature automatically fails Strength and Dexterity saving throws.",
            "The creature has resistance to all damage.",
            "The creature is immune to poison and disease, although a poison or disease already in its system is suspended, not neutralized.",
          ],
        },
        {
          conditionName: "Poisoned",
          markerName: null,
          description: [
            "A poisoned creature has <a href='!ct conditions|disadvantage'>disadvantage</a> on attack rolls and ability checks.",
          ],
        },
        {
          conditionName: "Prone",
          markerName: null,
          description: [
            "A prone creature's only movement option is to crawl, unless it stands up and thereby ends the condition.",
            "The creature has <a href='!ct conditions|disadvantage'>disadvantage</a> on attack rolls.",
            "An attack roll against the creature has <a href='!ct conditions|advantage'>advantage</a> if the attacker is within 5 feet of the creature. Otherwise, the attack roll has <a href='!ct conditions|disadvantage'>disadvantage</a>.",
          ],
        },
        {
          conditionName: "Restrained",
          markerName: null,
          description: [
            "A restrained creature's speed becomes 0, and it can't benefit from any bonus to its speed.",
            "Attack rolls against the creature have <a href='!ct conditions|advantage'>advantage</a>, and the creature's attack rolls have <a href='!ct conditions|disadvantage'>disadvantage</a>.",
            "The creature has <a href='!ct conditions|disadvantage'>disadvantage</a> on Dexterity saving throws.",
          ],
        },
        {
          conditionName: "Starving",
          markerName: null,
          description: [
            "A character needs one pound of food per day and can make food last longer by subsisting on half rations. Eating half a pound of food in a day counts as half a day without food.",
            "A character can go without food for a number of days equal to 3 + his or her Constitution modifier (minimum 1). At the end of each day beyond that limit, a character automatically suffers one level of <a href='!ct conditions|exhaustion'>exhaustion</a>. A normal day of eating resets the count of days without food to zero.",
          ],
        },
        {
          conditionName: "Stunned",
          markerName: null,
          description: [
            "A stunned creature is <a href='!ct conditions|incapacitated'>incapacitated</a>, can't move, and can speak only falteringly.",
            "The creature automatically fails Strength and Dexterity saving throws.",
            "Attack rolls against the creature have <a href='!ct conditions|advantage'>advantage</a>.",
          ],
        },
        {
          conditionName: "Suffocating",
          markerName: null,
          description: [
            "A creature can hold its breath for a number of minutes equal to 1 + its Constitution modifier (minimum of 30 seconds).",
            "When a creature runs out of breath or is choking, it can survive for a number of rounds equal to its Constitution modifier (minimum of 1 round). At the start of its next turn, it drops to 0 hit points and is dying, and it can't regain hit points or be stabilized until it can breathe again.",
            "For example, a creature with a Constitution of 14 can hold its breath for 3 minutes. If it starts suffocating, it has 2 rounds to reach air before it drops to 0 hit points.",
          ],
        },
        {
          conditionName: "Tremorsense",
          markerName: null,
          description: [
            "A creature with tremorsense can detect and pinpoint the origin of vibrations within a specific radius, provided that the creature and the source of the vibrations are in contact with the same ground or substance.",
            "Tremorsense can't be used to detect flying or incorporeal creatures.",
          ],
        },
        {
          conditionName: "Truesight",
          markerName: null,
          description: [
            "A creature with truesight can, out to a specific range, see in normal and magical darkness, see <a href='!ct conditions|invisible'>invisible</a> creatures and objects, automatically detect visual illusions and succeed on saving throws against them, and perceive the original form of a shapechanger or a creature that is transformed by magic.",
            "Tremorsense can't be used to detect flying or incorporeal creatures.",
            "The creature can see into the Ethereal Plane within the same range.",
          ],
        },
        {
          conditionName: "Unconscious",
          markerName: null,
          description: [
            "An unconscious creature is <a href='!ct conditions|incapacitated'>incapacitated</a>, can't move or speak, and is unaware of its surroundings.",
            "The creature drops whatever it's holding and falls <a href='!ct conditions|prone'>prone</a>.",
            "The creature automatically fails Strength and Dexterity saving throws.",
            "Attack rolls against the creature have <a href='!ct conditions|advantage'>advantage</a>.",
            "Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.",
          ],
        },
      ],
      config: {
        instructionsTab: {
          name: "instructions",
          content:
            "<h2>Editing the config table</h2>" +
            "<p>When editing this config table, it is important to ensure the table remains intact and that the table layout is not altered.</p>" +
            "<h3>Condition column</h3>" +
            "<p>Cells in this column refer to a condition's <code>conditionName</code> property in state. Each condition name must be a simple string, and must be unique regardless of lettercase. For example, <code>blinded</code> (all lowercase) and <code>Blinded</code> (capitalized first letter) would not be unique condition names. However the condition name is formatted in the config table is how it will be formatted when rendered on a token's tooltip or when sent as a condition card in chat.</p>" +
            "<p>When condition names are attempted to be saved, there are several checks that occur to ensure the condition name is valid. If a condiiton name is not valid, it is reformatted to become valid so that information entered by users is not lost. The checks that occur include:</p>" +
            "<ul><li>Any vertical pipes <code>|</code> are removed</li>" +
            "<li>Extraneous whitespace is trimmed from the condition name, including the middle (only a single whitespace is allowed between characters)</li>" +
            "<li>Empty strings are replaced with a condition name of 'Condition' + a unique number identifier</li>" +
            "<li>If the condition name already exists, a unique number identifier is appended to the condition name</li></ul>" +
            "<p>After all checks are finished, the config table is sorted alphabetically by condition name, ignoring lettercase..</p>" +
            "<h3>Marker column</h3>" +
            "<p>Cells in this column refer to a condition's <code>markerName</code> property in state, linking a valid associated marker in your campaign's current token marker set to the condition. Each marker name must be either a simple string, or the word 'null'.</p>" +
            "<p>Marker names in this column must match a token marker name exactly, including lettercase and hyphens <code>-</code> or underscores <code>_</code>. If not entered correctly, a token marker will not be linked to the condition correctly, and the marker image will not be applied to tokens when using ConditionTracker commands.</p>" +
            "<p>When 'null' is entered for a marker name, it will not set the <code>markerName</code> property to a string, but instead the <code>null</code> data type. Due to this, it is best to avoid using 'null' as a marker name in your custom token marker sets." +
            "<h3>Description column</h3>" +
            "<p>Cells in this column refer to a condition's <code>description</code> property in state. Each description must be an ordered or unordered list, with each list item acting as a separate description item or effect for the condition.</p>" +
            "<p>Nested lists are not supported, but you can add simple font styles such as bold, italic, underline, strikethrough, and font color. You can also add 'buttons' that will call a specific condition card by wrapping text in a link, and passing in the <code>!ct conditions|&#60;condition name&#62;</code> command as the link's URL. When creating a button that calls another condition card, you must use the 'link' button when editing the ConditionTracker Config bio.</p>",
        },
        customizeTab: {
          name: "customize",
          content: "",
        },
        currentTab: null,
      },
      version: "1.0",
    };

    const borderColorCSS = _.template("rgba(100, 100, 100, <%= opacity %>)");
    const conditionCardBorderCSS = _.template(
      `border-width: <%= width %>; border-style: solid; border-radius: <%= radius %>; border-color: ${borderColorCSS(
        { opacity: "1" }
      )};`
    );
    const descListItemCSS = _.template(
      "font-style: <%= fontStyle %>; opacity: 0.75;"
    );
    const tableTdCSS = _.template(
      "padding: 15px 5px; vertical-align: <%= verticalAlign %>;"
    );
    const containerCSS = _.template(
      `width: 100%; max-width: <%= maxWidth %>; border: 1px solid ${borderColorCSS(
        { opacity: "1" }
      )}`
    );

    const captionCSS = "font-size: 1.75rem; font-weight: bold;";
    const headerCSS = `background-color: blue; color: white; padding: 5px;`;
    const configTableHeaders = `vertical-align: top; ${headerCSS};`;
    const dividerCSS =
      "border-top: 1px solid " + borderColorCSS({ opacity: "0.5" });
    const listCSS = "margin: 0px; list-style: none;";
    const listItemCSS = "margin-bottom: 10px;";

    const table_template = _.template(
      `<table style=" <%= tableCSS %> "><%= caption %><thead><tr><% _.each(tableHeaders, header => { %> <th style=" <%= thCSS %> "> <%= header %> </th> <% }) %></tr></thead><tbody> <% _.each(tableRows, row => { %> <tr style=" <%= bodyTrCSS %> "> <% _.each(row, rowCell => { %> <td style=" <%= bodyTdCSS %> "> <%= rowCell %> </td> <% }) %> </tr> <% }) %> </tbody></table>`
    );

    const descList_template = _.template(
      "<div style=' <%= dlContainerCSS %> '><%= dlTitle %><dl style='<%= dlCSS %>'> <% _.each(descListItems, descItem => { %> <dt style=' <%= dtCSS %> '><%= descItem.term %></dt><dd style=' <%= ddCSS %> '><%= descItem.def %></dd> <% }) %> </dl></div>"
    );

    function createMessage(message, type) {
      let msgStyles;

      if (type === "success") {
        msgStyles =
          "border: 1px solid rgba(0, 90, 0, 1); background-color: rgba(0, 150, 0, 0.15);";
      } else if (type === "warn") {
        msgStyles =
          "border: 1px solid rgba(255, 127, 0, 1); background-color: rgba(255, 127, 0, 0.25);";
      } else {
        msgStyles =
          "border: 1px solid rgba(255, 0, 0, 1); background-color: rgba(255, 0, 0, 0.25);";
      }

      sendChat(
        CT_DISPLAY_NAME,
        `<div style="${msgStyles} padding: 8px;">${message}</div>`
      );
    }

    function getConditionMarkers(conditionsArray) {
      const { conditions: conditionsState } = state.ConditionTracker;

      const validMarkerNames = _.map(conditionsState, (condition) => {
        if (conditionsArray.includes(condition.conditionName.toLowerCase())) {
          return condition.markerName;
        }
      });

      return validMarkerNames.filter((marker) => marker !== null);
    }

    function capitalizeFirstLetter(str) {
      return str[0].toUpperCase() + str.slice(1);
    }

    function sortIgnoringCase(arrayToSort, property) {
      const arrayCopy = JSON.parse(JSON.stringify(arrayToSort));

      return arrayCopy.sort((toSortA, toSortB) => {
        const itemOne = property ? toSortA[property] : toSortA;
        const itemTwo = property ? toSortB[property] : toSortB;

        return itemOne.localeCompare(itemTwo, undefined, {
          sensitivity: "base",
        });
      });
    }

    function trimWhitespace(str, replacement = "") {
      return str.trim().replace(/&nbsp;/g, replacement);
    }

    function formatCommaSeparatedList(list, letterCase) {
      const arrayedList = list
        .split(",")
        .filter((listItem) => listItem !== "")
        .map((listItem) => trimWhitespace(listItem));

      return letterCase && letterCase.toLowerCase() === "lower"
        ? arrayedList.map((arrayItem) => arrayItem.toLowerCase())
        : arrayedList;
    }

    function getMarkersFromToken(
      tokenObj,
      filterCallback = (marker) => marker !== ""
    ) {
      const tokenMarkers = tokenObj.get("statusmarkers");
      const formattedMarkers = formatCommaSeparatedList(tokenMarkers);

      return formattedMarkers.filter(filterCallback);
    }

    function setMarkersOnToken(tokenObj, markersToSet) {
      tokenObj.set("statusmarkers", markersToSet.join(","));
    }

    function getTooltipFromToken(tokenObj) {
      const tokenTooltip = tokenObj.get("tooltip");
      return formatCommaSeparatedList(tokenTooltip, "lower");
    }

    function setTooltipOnToken(tokenObj, newTooltip) {
      const { conditions: conditionsState } = state.ConditionTracker;
      const filteredTooltip = newTooltip.filter(
        (tooltipItem) => tooltipItem !== ""
      );

      const formattedTooltip = filteredTooltip.map((tooltipToFormat) => {
        let conditionsIndex = _.findIndex(
          conditionsState,
          (conditionItem) =>
            conditionItem.conditionName.toLowerCase() === tooltipToFormat
        );

        if (conditionsIndex !== -1) {
          return conditionsState[conditionsIndex].conditionName;
        }

        return capitalizeFirstLetter(tooltipToFormat);
      });

      tokenObj.set("tooltip", sortIgnoringCase(formattedTooltip).join(", "));
    }

    function checkNameValidity(currentConditionsList, conditionName) {
      let trimmedName = trimWhitespace(conditionName);

      if (trimmedName === "") {
        const namePlaceholder = `Condition ${uniqueId++}`;
        createMessage(
          `Condition name cannot be blank. Created new condition with name "${namePlaceholder}" instead.`,
          "warn"
        );
        return namePlaceholder;
      } else if (trimmedName.includes("|")) {
        trimmedName = trimmedName.replace(/\|/g, "");
        createMessage(
          `Condition name cannot include vertical pipe characters (" | "). Created new condition with name "${trimmedName}" instead.`,
          "warn"
        );
      }

      const duplicateNames = currentConditionsList.filter(
        (condition) =>
          condition.conditionName.toLowerCase() === trimmedName.toLowerCase()
      );

      if (_.isEmpty(duplicateNames)) {
        return trimmedName;
      }

      nameCopy = `${trimmedName}-${uniqueId++}`;
      createMessage(
        `Condition with name "${trimmedName}" already exists. Created condition with name "${nameCopy}" instead.`,
        "warn"
      );
      return nameCopy;
    }

    function removeSingleInstance(itemsToRemove, itemsBeforeRemoval) {
      let itemsAfterRemoval;

      _.each(itemsToRemove, (itemToRemove) => {
        const firstItemIndex = itemsBeforeRemoval.indexOf(itemToRemove);

        if (firstItemIndex === -1) {
          return;
        } else if (firstItemIndex === 0) {
          itemsAfterRemoval = itemsBeforeRemoval
            .slice(1)
            .filter((marker) => marker !== "");
        } else {
          itemsAfterRemoval = [
            ...itemsBeforeRemoval.slice(0, firstItemIndex),
            ...itemsBeforeRemoval.slice(firstItemIndex + 1),
          ].filter((marker) => marker !== "");
        }
      });

      return itemsAfterRemoval;
    }

    function createHelpTable(options) {
      const createModifiersList = (modifiers) => {
        const modifierItems = [];

        if (_.isEmpty(modifiers)) {
          return "<div><div style='font-weight: bold'>Modifiers</div><div>No modifiers exist for this command.</div></div>";
        } else {
          _.each(modifiers, (modifier) => {
            modifierItems.push({
              term: modifier.keyword,
              def: modifier.description,
            });
          });
        }

        return descList_template({
          dlContainerCSS: "",
          dlCSS: "",
          dlTitle: "<div style='font-weight: bold;'>Modifiers</div>",
          descListItems: modifierItems,
          dtCSS: descListItemCSS({ fontStyle: "italic" }),
          ddCSS: `${descListItemCSS({
            fontStyle: "normal",
          })} margin-bottom: 10px;`,
        });
      };

      const commandsToRender = options
        ? _.filter(COMMANDS_LIST, (command) =>
            options.toLowerCase().includes(command.keyword)
          )
        : COMMANDS_LIST;

      if (_.isEmpty(commandsToRender)) {
        createMessage(
          `Could not find the following commands: <ul>${formatCommaSeparatedList(
            options
          )
            .map((option) => "<li>" + option + "</li>")
            .join("")}</ul>`
        );
        return;
      }

      const commandRows = [];
      _.each(commandsToRender, (command) => {
        commandRows.push([
          command.keyword,
          `${
            command.description
          } <br/><br/><div><div style="font-weight: bold;">Syntax</div><div>${
            command.syntax
          }</div><br/><br/>${createModifiersList(command.modifiers)}</div>`,
        ]);
      });

      sendChat(
        CT_DISPLAY_NAME,
        table_template({
          tableCSS: containerCSS({ maxWidth: "500px" }),
          caption: `<caption style="${captionCSS}">ConditionTracker Commands</caption>`,
          tableHeaders: ["Command", "Description"],
          thCSS: headerCSS,
          tableRows: commandRows,
          bodyTrCSS: dividerCSS,
          bodyTdCSS: tableTdCSS({ verticalAlign: "top" }),
        })
      );
    }

    function resetState(resetOption) {
      if (resetOption === "cancel") {
        resetAttempted = false;
        createMessage(
          "ConditionTracker state reset has been cancelled.",
          "success"
        );
        return;
      }

      if (resetAttempted && resetOption === "confirm") {
        resetAttempted = false;
        const configCharacter = getObj(
          "character",
          state.ConditionTracker.config.configId
        );

        const stateCopy = JSON.parse(JSON.stringify(DEFAULT_STATE));
        stateCopy.config.configId = configCharacter.id;
        stateCopy.config.currentTab = "instructions";
        state.ConditionTracker = stateCopy;
        state.ConditionTracker.config.customizeTab.content =
          createConfigTable();

        configCharacter.set(
          "bio",
          createConfigBio(state.ConditionTracker.config.instructionsTab.name)
        );

        createMessage(
          "ConditionTracker state successfully reset to default state.",
          "success"
        );
      } else {
        resetAttempted = true;
        createMessage(
          "Resetting ConditionTracker state will overwrite any customizations made to the current state. <strong>This cannot be undone</strong>. Send <code>!ct reset|confirm</code> to continue with reset, or <code>~ct reset|cancel</code> to cancel."
        );
      }
    }

    function createMarkersTable(options) {
      let markersToReturn = [];

      options
        ? _.each(formatCommaSeparatedList(options), (option) => {
            _.each(campaignMarkers, (marker) => {
              if (marker.name.toLowerCase().includes(option)) {
                markersToReturn.push(marker);
              }
            });
          })
        : (markersToReturn = [...campaignMarkers]);

      const markerRows = [];
      if (markersToReturn.length) {
        _.each(markersToReturn, (marker) => {
          const markerImage = marker.url
            ? `<img src="${marker.url}" alt="${marker.name} token marker">`
            : marker.image;

          markerRows.push([markerImage, marker.name]);
        });
      } else {
        createMessage(
          `Could not find any markers that include the following filters: <ul>${formatCommaSeparatedList(
            options
          )
            .map((option) => "<li>" + option + "</li>")
            .join("")}</ul>`
        );
        return;
      }

      sendChat(
        CT_DISPLAY_NAME,
        table_template({
          tableCSS: containerCSS({ maxWidth: "300px" }),
          caption: `<caption style="${captionCSS}">Campaign Token Markers</caption>`,
          tableHeaders: ["Image", "Name"],
          thCSS: headerCSS,
          tableRows: markerRows,
          bodyTrCSS: dividerCSS,
          bodyTdCSS: tableTdCSS({ verticalAlign: "middle" }),
        })
      );
    }

    function addCondition(commandOptions, chatMessage) {
      const conditionsToAdd = formatCommaSeparatedList(commandOptions);
      const markersToAdd = getConditionMarkers(conditionsToAdd);

      _.each(chatMessage.selected, (selectedItem) => {
        const token = getObj(selectedItem._type, selectedItem._id);

        if (markersToAdd.length) {
          const markersBeforeAdd = getMarkersFromToken(token);
          setMarkersOnToken(token, [...markersBeforeAdd, ...markersToAdd]);
        }

        const tooltipBeforeAdd = getTooltipFromToken(token);
        setTooltipOnToken(token, [...tooltipBeforeAdd, ...conditionsToAdd]);
      });
    }

    function removeSingleConditionInstance(commandOptions, chatMessage) {
      const conditionsToRemoveSingle = formatCommaSeparatedList(commandOptions);
      const markersToRemoveSingle = getConditionMarkers(
        conditionsToRemoveSingle
      );

      _.each(chatMessage.selected, (selectedItem) => {
        const token = getObj(selectedItem._type, selectedItem._id);

        if (markersToRemoveSingle.length) {
          const markersBeforeRemoveSingle = getMarkersFromToken(token);
          const markersAfterRemoveSingle = removeSingleInstance(
            markersToRemoveSingle,
            markersBeforeRemoveSingle
          );

          if (markersAfterRemoveSingle) {
            setMarkersOnToken(token, markersAfterRemoveSingle);
          }
        }

        const tooltipBeforeRemoveSingle = getTooltipFromToken(token);
        const tooltipAfterRemoveSingle = removeSingleInstance(
          conditionsToRemoveSingle,
          tooltipBeforeRemoveSingle
        );

        if (tooltipAfterRemoveSingle) {
          setTooltipOnToken(token, tooltipAfterRemoveSingle);
        } else {
          token.set("tooltip", "");
        }
      });
    }

    function removeAllConditionInstances(commandOptions, chatMessage) {
      const conditionsToRemoveInstances =
        formatCommaSeparatedList(commandOptions);
      const markersToRemoveInstances = getConditionMarkers(
        conditionsToRemoveInstances
      );

      _.each(chatMessage.selected, (selectedItem) => {
        const token = getObj(selectedItem._type, selectedItem._id);

        if (markersToRemoveInstances.length) {
          const markersAfterRemoveInstances = getMarkersFromToken(
            token,
            (marker) =>
              marker !== "" && !markersToRemoveInstances.includes(marker)
          );

          setMarkersOnToken(token, markersAfterRemoveInstances);
        }

        const tooltipAfterRemoveInstances = getTooltipFromToken(token).filter(
          (condition) => !conditionsToRemoveInstances.includes(condition)
        );

        setTooltipOnToken(token, tooltipAfterRemoveInstances);
      });
    }

    function removeAllConditions(chatMessage) {
      _.each(chatMessage.selected, (selectedItem) => {
        const token = getObj(selectedItem._type, selectedItem._id);
        const tooltipBeforeRemoveAll = getTooltipFromToken(token);
        const markersBeforeRemoveAll = getConditionMarkers(
          tooltipBeforeRemoveAll
        );

        if (markersBeforeRemoveAll.length) {
          const markersAfterRemoveAll = getMarkersFromToken(
            token,
            (marker) =>
              marker !== "" && !markersBeforeRemoveAll.includes(marker)
          );

          setMarkersOnToken(token, markersAfterRemoveAll);
        }

        token.set("tooltip", "");
      });
    }

    function toggleCondition(commandOptions, chatMessage) {
      const conditionsToToggle = formatCommaSeparatedList(commandOptions);
      const markersToToggle = getConditionMarkers(conditionsToToggle);

      _.each(chatMessage.selected, (selectedItem) => {
        const token = getObj(selectedItem._type, selectedItem._id);

        if (markersToToggle.length) {
          const markersBeforeToggle = getMarkersFromToken(token);
          const sharedMarkers = _.intersection(
            markersBeforeToggle,
            markersToToggle
          );
          const markersAfterToggle = [
            ...markersBeforeToggle,
            ...markersToToggle,
          ].filter((marker) => !sharedMarkers.includes(marker));

          setMarkersOnToken(token, markersAfterToggle);
        }

        const tooltipBeforeToggle = getTooltipFromToken(token);
        const sharedConditions = _.intersection(
          tooltipBeforeToggle,
          conditionsToToggle
        );
        const tooltipAfterToggle = [
          ...tooltipBeforeToggle,
          ...conditionsToToggle,
        ].filter((tooltipItem) => !sharedConditions.includes(tooltipItem));

        setTooltipOnToken(token, tooltipAfterToggle);
      });
    }

    function createConditionCards(currentToken, commandOptions) {
      const { conditions: conditionsState } = state.ConditionTracker;
      let token;
      let caption;
      let conditionsToList;

      if (currentToken) {
        token = getObj(currentToken._type, currentToken._id);
        caption = `Conditions for ${token.get("name")}`;
        conditionsToList = getTooltipFromToken(token);
      } else {
        caption = "Campaign Conditions";

        if (commandOptions) {
          conditionsToList = formatCommaSeparatedList(commandOptions);
        }
      }

      const captionDiv =
        "<div style='" +
        `${captionCSS + headerCSS}` +
        "'>" +
        caption +
        "</div>";

      if (
        token &&
        !conditionsToList.filter((condition) => condition !== "").length
      ) {
        return (
          "<div style='" +
          containerCSS({ maxWidth: "300px" }) +
          "'>" +
          captionDiv +
          "<div style='padding: 10px;'>No conditions are currently applied to this token.</div></div>"
        );
      }

      const createSingleConditionCard = (
        conditionName,
        conditionDescription
      ) => {
        let conditionDescriptionList = "";
        if (!conditionDescription || _.isEmpty(conditionDescription)) {
          conditionDescriptionList =
            "<div style='" +
            listItemCSS +
            "'>No description has been defined for this condition.</div>";
        } else {
          _.each(conditionDescription, (desc) => {
            conditionDescriptionList +=
              "<div style='" + listItemCSS + "'>" + desc + "</div>";
          });
        }

        return { term: conditionName, def: conditionDescriptionList };
      };

      const conditionCards = [];
      if (conditionsToList) {
        const conditionCount = _.countBy(
          conditionsToList,
          (condition) => condition
        );
        const reducedConditions = conditionsToList.reduce(
          (previous, current) => {
            if (previous.includes(current)) {
              return previous;
            } else {
              return [...previous, current];
            }
          },
          []
        );

        _.each(reducedConditions, (condition) => {
          const conditionIndex = _.findIndex(
            conditionsState,
            (conditionItem) =>
              conditionItem.conditionName.toLowerCase() ===
              condition.toLowerCase()
          );

          let descListName =
            conditionIndex !== -1
              ? conditionsState[conditionIndex].conditionName
              : condition;
          const descListDescription =
            conditionIndex !== -1
              ? conditionsState[conditionIndex].description
              : undefined;

          if (conditionCount[descListName.toLowerCase()] > 1) {
            descListName += ` x${conditionCount[descListName.toLowerCase()]}`;
          }

          conditionCards.push(
            createSingleConditionCard(descListName, descListDescription)
          );
        });
      } else {
        _.each(conditionsState, (condition) => {
          conditionCards.push(
            createSingleConditionCard(
              condition.conditionName,
              condition.description
            )
          );
        });
      }

      return descList_template({
        dlContainerCSS: "max-width: 300px;",
        dlCSS: "padding-top: 10px; margin-bottom: 0;",
        dlTitle: captionDiv,
        descListItems: conditionCards,
        dtCSS:
          descListItemCSS({ fontStyle: "italic" }) +
          conditionCardBorderCSS({
            width: "1px 1px 0",
            radius: "10px 10px 0 0",
          }) +
          "padding: 5px;",
        ddCSS:
          descListItemCSS({ fontStyle: "normal" }) +
          conditionCardBorderCSS({
            width: "0 1px 1px",
            radius: "0 0 10px 10px",
          }) +
          "padding: 5px; margin-bottom: 10px;",
      });
    }

    function handleChatInput(message) {
      const prefix = message.content.split(/\s/, 1);
      if (prefix[0].toLowerCase() !== "!ct") {
        return;
      }

      const {
        help,
        reset,
        markers,
        addCondition: add,
        removeCondition: remove,
        toggleCondition: toggle,
        currentConditions,
      } = COMMANDS_LIST;
      const parameters = message.content
        .slice(message.content.indexOf(" ") + 1)
        .split("|");
      const [command, options, modifier] = parameters.map((param) =>
        param.toLowerCase()
      );

      if (
        _.findWhere(COMMANDS_LIST, { keyword: command }) &&
        command !== currentConditions.keyword &&
        !playerIsGM(message.playerid)
      ) {
        createMessage(
          `Sorry, ${message.who}. You do not have permission to use the <code>${command}</code> command.`
        );
        return;
      }

      if (
        [add.keyword, remove.keyword, toggle.keyword].includes(command) &&
        !message.selected
      ) {
        createMessage(
          `You must select at least one token before using the <code>${command}</code> command.`,
          "warn"
        );
        return;
      }

      if ([add.keyword, toggle.keyword].includes(command) && !options) {
        createMessage(
          `You must pass in at least one option when using the <code>${command}</code> command.`,
          "warn"
        );
        return;
      }

      switch (command) {
        case help.keyword:
          createHelpTable(options);
          break;
        case reset.keyword:
          resetState(options);
          break;
        case markers.keyword:
          createMarkersTable(options);
          break;
        case add.keyword:
          addCondition(options, message);
          break;
        case remove.keyword:
          if (!options) {
            removeAllConditions(message);
          } else if (modifier === "single") {
            removeSingleConditionInstance(options, message);
          } else {
            removeAllConditionInstances(options, message);
          }
          break;
        case toggle.keyword:
          toggleCondition(options, message);
          break;
        case currentConditions.keyword:
          if (options) {
            sendChat(CT_DISPLAY_NAME, createConditionCards(null, options));
          } else if (!message.selected) {
            sendChat(CT_DISPLAY_NAME, createConditionCards());
          } else {
            _.each(message.selected, (selectedItem) => {
              sendChat(CT_DISPLAY_NAME, createConditionCards(selectedItem));
            });
          }
          break;
        case "config":
          updateActiveConfigTab(options);
          break;
        default:
          createMessage(
            `Command <code>${command}</code> not found. Send <code>!ct help</code> for a list of valid commands.`
          );
          break;
      }
    }

    const configNavTabs =
      "<div><a href='!ct config|instructions'>Instructions</a><a href='!ct config|customize'>Customize</a></div>";
    const configMainHeading = `<h1>${CT_CONFIG_NAME}</h1>`;
    const configCustomizeHeading = "<h2>Config Table</h2>";

    function createConfigBio(tab) {
      let { instructionsTab, customizeTab } = state.ConditionTracker.config;

      if (!customizeTab.content) {
        state.ConditionTracker.config.customizeTab.content =
          createConfigTable();
      }

      if (tab === customizeTab.name) {
        return (
          configNavTabs +
          configMainHeading +
          configCustomizeHeading +
          customizeTab.content
        );
      } else if (tab === instructionsTab.name) {
        return configNavTabs + configMainHeading + instructionsTab.content;
      }
    }

    function updateActiveConfigTab(tab) {
      const { config } = state.ConditionTracker;
      if (!_.findWhere(config, { name: tab })) {
        return;
      }

      const configCharacter = getObj("character", config.configId);
      state.ConditionTracker.config.currentTab = tab;

      configCharacter.get("bio", (bio) => {
        const tabToUpdate = _.findKey(config, (key) => key.name === tab);

        if (tabToUpdate) {
          configCharacter.set("bio", createConfigBio(config[tabToUpdate].name));
        }
      });
    }

    function preventInstructionEditing() {
      const { instructionsTab } = state.ConditionTracker.config;
      const configCharacter = getObj(
        "character",
        state.ConditionTracker.config.configId
      );

      configCharacter.get("bio", (bio) => {
        if (
          !_.isEqual(
            bio,
            configNavTabs + configMainHeading + instructionsTab.content
          )
        ) {
          configCharacter.set("bio", createConfigBio(instructionsTab.name));
        }
      });
    }

    function createConfigTable() {
      const { conditions: conditionsState } = state.ConditionTracker;

      const createDescriptionList = (desc) => {
        if (_.isEmpty(desc)) {
          return "<ul><li></ul>";
        }

        let descriptionList = "";
        _.each(desc, (descItem) => {
          descriptionList += `<li>${descItem}</li>`;
        });

        return "<ul>" + descriptionList + "</ul>";
      };

      let conditionRows = "";
      _.each(conditionsState, (condition) => {
        conditionRows += `<tr><td>${condition.conditionName}</td><td>${
          condition.markerName
        }</td><td>${createDescriptionList(condition.description)}</td></tr>`;
      });

      return (
        `<table style='border: 2px solid ${borderColorCSS({
          opacity: "1",
        })};'>` +
        "<thead><tr>" +
        `<th style='${configTableHeaders}'>Condition (string)</th>` +
        `<th style='${configTableHeaders}'>Marker (string or null)</th>` +
        `<th style='${configTableHeaders}'>Description (list of strings)</th></tr></thead><tbody>` +
        conditionRows +
        "</tbody></table>"
      );
    }

    function getConditionsFromTable(table) {
      const conditionsFromTable = [];
      const tableContent = table.replace(/<\/?(br|p)>/g, "");
      const tableBody = tableContent
        .split("</thead>")[1]
        .replace(/<\/?(table|tbody)>/g, "");
      const tableRows = tableBody
        .replace(/<tr>/g, "")
        .split("</tr>")
        .filter((rowItem) => rowItem !== "");

      _.each(tableRows, (tableRow) => {
        const rowCells = tableRow.replace(/<td>/g, "").split("</td>", 3);
        let [conditionName, markerName, description] = rowCells;

        conditionName = checkNameValidity(conditionsFromTable, conditionName);

        markerName =
          trimWhitespace(markerName) === "" ||
          trimWhitespace(markerName).toLowerCase() === "null"
            ? null
            : trimWhitespace(markerName);

        description = trimWhitespace(description)
          ? description
              .replace(/<\/?(u|o)l>|<li>/g, "")
              .split("</li>")
              .filter((descItem) => descItem !== "")
          : [];

        conditionsFromTable.push({ conditionName, markerName, description });
      });

      return conditionsFromTable;
    }

    function setStateFromConfigTable(configObj) {
      const { customizeTab } = state.ConditionTracker.config;
      configObj.get("bio", (bio) => {
        const indexOfTable = bio.indexOf("<table");
        if (indexOfTable === -1) {
          createMessage(
            `Unable to find the config table in the ${CT_CONFIG_NAME} character bio. Try switching to the "Instructions" tab and then back to the "Customize" tab to re-render the table. If this does not work, you will have to reset the ${CT_DISPLAY_NAME} state by running the <code>reset</code> command (doing so will cause any customizations to be lost).`
          );
          return;
        }

        const customizeHeader =
          configNavTabs + configMainHeading + configCustomizeHeading;
        const customizeTabContent = customizeHeader + bio.slice(indexOfTable);
        const configTable = customizeTabContent
          .split(/<\/h2>/)
          .filter((tableItem) => tableItem !== "")[1]
          .replace(/\\"/g, "'");

        if (_.isEqual(configTable, customizeTab.content)) {
          /**
           * If anything in the tab header was deleted upon saving, we want to
           * render them again.
           */
          if (!_.isEqual(bio, customizeTabContent)) {
            configObj.set("bio", customizeTabContent);
          }
          return;
        }

        const conditionsFromTable = getConditionsFromTable(configTable);
        state.ConditionTracker.conditions = sortIgnoringCase(
          conditionsFromTable,
          "conditionName"
        );
        const tableAfterStateUpdate = createConfigTable();

        if (!_.isEqual(tableAfterStateUpdate, customizeTab.content)) {
          state.ConditionTracker.config.customizeTab.content =
            tableAfterStateUpdate;
          configObj.set("bio", customizeHeader + tableAfterStateUpdate);
        }
      });
    }

    function setConfigOnReady() {
      const { config } = state.ConditionTracker;
      let configCharacter = findObjs({
        type: "character",
        name: CT_CONFIG_NAME,
      })[0];

      if (!configCharacter) {
        configCharacter = createObj("character", {
          name: CT_CONFIG_NAME,
        });

        state.ConditionTracker.config.configId = configCharacter.id;
      } else if (!config.configId || config.configId !== configCharacter.id) {
        state.ConditionTracker.config.configId = configCharacter.id;
      }

      state.ConditionTracker.config.customizeTab.content = createConfigTable();
      if (!config.currentTab) {
        updateActiveConfigTab(config.instructionsTab.name);
      }
    }

    function fetchCampaignMarkers() {
      const fetchedMarkers = JSON.parse(Campaign().get("token_markers"));
      campaignMarkers = sortIgnoringCase(
        [...fetchedMarkers, ...JSON.parse(JSON.stringify(ROLL20_MARKERS))],
        "name"
      );
    }

    function checkInstall() {
      if (!_.has(state, "ConditionTracker")) {
        log("Installing " + CT_DISPLAY_NAME);
        state.ConditionTracker = JSON.parse(JSON.stringify(DEFAULT_STATE));
      } else if (state.ConditionTracker.version !== VERSION) {
        log("Updating to " + CT_DISPLAY_NAME);
        /**
         * Update the current version installed without overwriting any
         * customizations made by the user. Will need to refactor if additions
         * are made to existing properties.
         */
        state.ConditionTracker = _.extend(
          {},
          JSON.parse(JSON.stringify(DEFAULT_STATE)),
          state.ConditionTracker
        );
        state.ConditionTracker.version = VERSION;
      }

      setConfigOnReady();
      log(
        CT_DISPLAY_NAME +
          " installed. Last updated " +
          new Date(LAST_UPDATED).toLocaleDateString()
      );
    }

    function registerEventHandlers() {
      on("chat:message", handleChatInput);
      on("change:character:bio", (obj) => {
        const { config } = state.ConditionTracker;
        if (obj.get("name") !== "ConditionTracker Config") {
          return;
        }

        if (config.currentTab === config.instructionsTab.name) {
          preventInstructionEditing();
        } else if (config.currentTab === config.customizeTab.name) {
          setStateFromConfigTable(obj);
        }
      });
    }

    return {
      CheckInstall: checkInstall,
      FetchCampaignMarkers: fetchCampaignMarkers,
      RegisterEventHandlers: registerEventHandlers,
    };
  })();

on("ready", () => {
  "use strict";

  ConditionTracker.CheckInstall();
  ConditionTracker.FetchCampaignMarkers();
  ConditionTracker.RegisterEventHandlers();
});
