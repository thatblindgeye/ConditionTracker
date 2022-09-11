/**
 * ConditionTracker
 *
 * Version 1.2
 * Last updated: September 11, 2022
 * Author: thatblindgeye
 * GitHub: https://github.com/thatblindgeye
 *
 * Command syntax:
 * !ct <keyword>|<options>
 */

const ConditionTracker = (function () {
  "use strict";

  // --------------------------------------------------------------------------
  // Reassignable Variables
  // --------------------------------------------------------------------------

  let campaignMarkers;
  let uniqueId = Number(Date.now().toString().slice(-5));

  // --------------------------------------------------------------------------
  // Constant Variables
  // --------------------------------------------------------------------------

  const VERSION = "1.2";
  const LAST_UPDATED = 1662924507172;
  const CT_DISPLAY_NAME = `ConditionTracker v${VERSION}`;
  const CT_CONFIG_NAME = "ConditionTracker Config";

  const UPDATE_OBJECT = {
    name: "name",
    changeAmount: "changeAmount",
    limit: "limit",
  };

  const ROLL20_MARKERS = [
    {
      image: createRoll20Marker("#c91010"),
      name: "red",
    },
    {
      image: createRoll20Marker("#1076c9"),
      name: "blue",
    },
    {
      image: createRoll20Marker("#2fc910"),
      name: "green",
    },
    {
      image: createRoll20Marker("#c97310"),
      name: "brown",
    },
    {
      image: createRoll20Marker("#9510c9"),
      name: "purple",
    },
    {
      image: createRoll20Marker("#eb75e1"),
      name: "pink",
    },
    {
      image: createRoll20Marker("#e5eb75"),
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
    },
    reset: {
      keyword: "reset",
      description:
        "Resets the ConditionTracker state to version " +
        VERSION +
        "'s default. <strong>This will overwrite any customizatons made to the campaign's current ConditionTracker state and cannot be undone</strong>.",
      syntax: "<code>!ct reset</code>",
    },
    markers: {
      keyword: "markers",
      description:
        "Sends to chat a table of token markers currently available in the campaign. The table includes the marker image and name.<br/><br/>Any filters passed in do not need to match a token marker name exactly, as options will act as a filter and return only token markers that include any of the options in their name. For example, <code>!ct markers|bli, dea</code> would return 'blinded', 'deafened', and 'dead'.",
      syntax:
        "<code>!ct markers|&#60;optional comma separated list of filters&#62;</code>",
    },
    addCondition: {
      keyword: "add",
      description:
        "Cumulatively adds a single instance of the specified condition(s) to the selected token(s). If a valid marker is linked to the condition, the linked marker will also be cumulatively added to the token.<br/><br/>Up to two hyphenated numbers can follow each condition that is passed in. The first hyphenated number will be the amount of condition instances to add, while the second number will be the maximum the instances can total with the current command call. For example, <code>!ct add|blinded-2-5</code> would add 2 instances of the blinded condition, but only to a maximum of 5. If the current total of instances before calling the command is greater than the maximum, no instances will be added.<br/><br/>When adding a single condition instance with a maximum amount, <code>!ct add|blinded--5</code> can be called instead of <code>!ct add|blinded-1-5</code>.",
      syntax:
        "<code>!ct add|&#60;comma separated list of conditions&#62;</code>",
    },
    removeCondition: {
      keyword: "remove",
      description:
        "Removes a single instances of the specified condition(s) from the selected token(s). If a valid marker is linked to the condition, the linked marker will also be removed from the token.<br/><br/>Up to two hyphenated numbers can follow each condition that is passed in. The first hyphenated number will be the amount of condition instances to remove, while the second number will be the minimum the instances can total with the current command call. For example, <code>!ct remove|blinded-2-5</code> would remove 2 instances of the blinded condition, but only to a minimum of 5. If the current total of instances before calling the command is less than the minimum, no instances will be removed.<br/><br/>When removing a single condition instance with a minimum amount, <code>!ct remove|blinded--5</code> can be called instead of <code>!ct remove|blinded-1-5</code><br/><br/>To remove all instances of a condition you can pass in '-all' instead of a hyphenated number, such as <code>!ct remove|blinded-all</code>.<br/><br/>If no options are passed in, all instances of all conditions will be removed from the selected token(s).",
      syntax:
        "<code>!ct remove|&#60;optional comma separated list of conditions&#62;</code>",
    },
    setCondition: {
      keyword: "set",
      description:
        "Sets the number of instances of the specified condition(s) on the selected token(s) to the specified amount. If a valid marker is linked to the condition, the linked marker will also be set on the token to the specified amount.<br/><br/>Each condition passed in can be followed by a single hyphenated number, which will be the amount of instances to set for the condition. For example, <code>!ct set|blinded-5</code> would set the number of instances of the blinded condition to 5.<br/><br/>Passing in a condition without a hyphenated number, such as <code>!ct set|blinded</code>, would be the same as calling <code>!ct set|blinded-1</code>.<br/><br/>Passing in 0 as the amount, such as <code>!ct set|blinded-0</code>, will remove the condition.",
      syntax:
        "<code>!ct set|&#60;comma separated list of conditions with a hyphenated number&#62;</code>",
    },
    toggleCondition: {
      keyword: "toggle",
      description:
        "Toggles the specified condition(s) on the selected token(s). If a condition is currently applied to a token it will be removed, otherwise the condition will be added. If a valid marker is linked to the condition, the linked marker will also be toggled on the token.",
      syntax:
        "<code>!ct toggle|&#60;comma separated list of conditions&#62;</code>",
    },
    currentConditions: {
      keyword: "conditions",
      description:
        "Sends to chat conditions and their descriptions depending on how the command is called. If any token is selected and no options are passed in, a list of conditions currently affecting that token is sent to chat.<br/><br/>If a token is not selected, all conditions currently set in the ConditionTracker Config is sent to chat. If any options are passed in, the specified conditions are sent to chat.",
      syntax:
        "<code>!ct conditions</code> or <code>!ct conditions|&#60;comma separated list of conditions&#62;</code>",
    },
    showTooltip: {
      keyword: "tooltip",
      description:
        "Determines whether token tooltips are displayed. The default setting is <code>true</code> to display token tooltips. Any tokens that are on the tabletop when the command is called with an option of <code>true</code> or <code>false</code> will be updated, and any tokens placed on the tabletop will be updated automatically based on this setting.<br/><br/>If no options are passed in, the current setting will be whispered to the GM.",
      syntax: "<code>!ct tooltip|&#60;optional true or false&#62;</code>.",
    },
  };

  /** Uses D&D 5e conditions as a default. */
  const DEFAULT_STATE = {
    conditions: [
      {
        conditionName: "Advantage",
        markerName: "",
        description: [
          "A creature that has advantage rolls a second d20 when making an ability check, saving throw, or attack roll, and uses the <b>higher</b> of the two rolls.",
          "If multiple situations affect a roll and each one grants advantage or imposes disadvantage, the creature doesn't roll more than one additional d20.",
          "If circumstances cause a roll to have both advantage and disadvantage, the creature is considered to have neither of them, and they roll one d20. This is true even if multiple circumstances impose disadvantage and only one grants advantage or vice versa.",
          "When the creature has advantage or disadvantage and something in the game, such as the halfling's Lucky trait, lets the creature reroll or replace the d20, the creature can reroll or replace only one of the dice. The creature chooses which one.",
        ],
      },
      {
        conditionName: "Blinded",
        markerName: "",
        description: [
          "A blinded creature can't see and automatically fails any ability check that requires sight.",
          "Attack rolls against the creature have <a href='!ct conditions|advantage'>advantage</a>, and the creature's attack rolls have <a href='!ct conditions|disadvantage'>disadvantage</a>.",
        ],
      },
      {
        conditionName: "Blindsight",
        markerName: "",
        description: [
          "A creature with blindsight can perceive its surroundings without relying on sight, within a specific radius.",
        ],
      },
      {
        conditionName: "Charmed",
        markerName: "",
        description: [
          "A charmed creature can't attack the charmer or target the charmer with harmful abilities or magical effects.",
          "The charmer has <a href='!ct conditions|advantage'>advantage</a> on any ability check to interact socially with the creature.",
        ],
      },
      {
        conditionName: "Darkvision",
        markerName: "",
        description: [
          "A creature with darkvision can see in the dark within a specific radius.",
          "The creature can see in dim light within the radius as if it were bright light, and in darkness as if it were dim light.",
          "The creature can't discern color in darkness, only shades of gray.",
        ],
      },
      {
        conditionName: "Deafened",
        markerName: "",
        description: [
          "A deafened creature can't hear and automatically fails any ability check that requires hearing.",
        ],
      },
      {
        conditionName: "Dehydrated",
        markerName: "",
        description: [
          "A character needs one gallon of water per day, or two gallons per day if the weather is hot.",
          "A character who drinks only half that much water must succeed on a DC 15 Constitution saving throw or suffer one level of <a href='!ct conditions|exhaustion'>exhaustion</a> at the end of the day. A character with access to even less water automatically suffers one level of exhaustion at the end of the day.",
          "If the character already has one or more levels of <a href='!ct conditions|exhaustion'>exhaustion</a>, the character takes two levels in either case.",
        ],
      },
      {
        conditionName: "Disadvantage",
        markerName: "",
        description: [
          "A creature that has disadvantage rolls a second d20 when making an ability check, saving throw, or attack roll, and uses the <b>lower</b> of the two rolls.",
          "If multiple situations affect a roll and each one grants advantage or imposes disadvantage, the creature doesn't roll more than one additional d20.",
          "If circumstances cause a roll to have both advantage and disadvantage, the creature is considered to have neither of them, and they roll one d20. This is true even if multiple circumstances impose disadvantage and only one grants advantage or vice versa.",
          "When the creature has advantage or disadvantage and something in the game, such as the halfling's Lucky trait, lets the creature reroll or replace the d20, the creature can reroll or replace only one of the dice. The creature chooses which one.",
        ],
      },
      {
        conditionName: "Encumbered",
        markerName: "",
        description: [
          "A creature is considered encumbered when their carry weight exceeds 5 x their Strength score.",
          "An encumbered creature's speed drops by 10 feet.",
        ],
      },
      {
        conditionName: "Exhaustion",
        markerName: "",
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
        markerName: "",
        description: [
          "At the end of a fall, a creature takes 1d6 bludgeoning damage for every 10 feet it fell, to a maximum of 20d6.",
          "The creature lands <a href='!ct conditions|prone'>prone</a>, unless it avoids taking damage from the fall.",
        ],
      },
      {
        conditionName: "Frightened",
        markerName: "",
        description: [
          "A frightened creature has <a href='!ct conditions|disadvantage'>disadvantage</a> on ability checks and attack rolls while the source of its fear is within line of sight.",
          "The creature can't willingly move closer to the source of its fear.",
        ],
      },
      {
        conditionName: "Grappled",
        markerName: "",
        description: [
          "A grappled creature's speed becomes 0, and it can't benefit from any bonus to its speed.",
          "The condition ends if the grappler is <a href='!ct conditions|incapacitated'>incapacitated</a>.",
          "The condition also ends if an effect removes the grappled creature from the reach of the grappler or grappling effect, such as when a creature is hurled away by the thunderwave spell.",
        ],
      },
      {
        conditionName: "Heavily Encumbered",
        markerName: "",
        description: [
          "A creature is considered heavily encumbered when their carry weight exceeds 10 x their Strength score, up to their carrying capacity (15 x their Strength score).",
          "A heavily encumbered creature's speed drops by 20 feet, and they have <a href='!ct conditions|disadvantage'>disadvantage</a> on ability checks, saving throws, and attack rolls that use Strength, Dexterity, or Constitution.",
        ],
      },
      {
        conditionName: "Heavily Obscured",
        markerName: "",
        description: [
          "A creature effectively suffers from the <a href='!ct conditions|blinded'>blinded</a> condition when trying to see something that is or is in an area that is heavily obscured.",
          "Examples of situations that cause a creature to be heavily obscured include darkness, opaque fog, or dense foliage.",
        ],
      },
      {
        conditionName: "Incapacitated",
        markerName: "",
        description: [
          "An incapacitated creature can't take actions or reactions.",
        ],
      },
      {
        conditionName: "Inspiration",
        markerName: "",
        description: [
          "If a player has inspiration, they can expend it when they make an attack roll, saving throw, or ability check. Spending inspiration gives a player advantage on that roll.",
          "Additionally, if a player has inspiration, they can reward another player for good roleplaying, clever thinking, or simply doing something exciting in the game. When another player character does something that really contributes to the story in a fun and interesting way, a player can give up their inspiration to give that character inspiration.",
        ],
      },
      {
        conditionName: "Invisible",
        markerName: "",
        description: [
          "An invisible creature is impossible to see without the aid of magic or a special sense. For the purpose of hiding, the creature is heavily obscured. The creature's location can be detected by any noise it makes or any tracks it leaves.",
          "Attack rolls against the creature have <a href='!ct conditions|disadvantage'>disadvantage</a>, and the creature's attack rolls have <a href='!ct conditions|advantage'>advantage</a>.",
        ],
      },
      {
        conditionName: "Lightly Obscured",
        markerName: "",
        description: [
          "A creature has <a href='!ct conditions|disadvantage'>disadvantage</a> on Wisdom (Perception) checks that rely on sight when trying to see something that is or is in an area that is lightly obscured.",
          "Examples of situations that cause a creature to be lightly obscured include dim light, patchy fog, or moderate foliage.",
        ],
      },
      {
        conditionName: "Paralyzed",
        markerName: "",
        description: [
          "A paralyzed creature is <a href='!ct conditions|incapacitated'>incapacitated</a> and can't move or speak.",
          "The creature automatically fails Strength and Dexterity saving throws.",
          "Attack rolls against the creature have <a href='!ct conditions|advantage'>advantage</a>.",
          "Any attack that hits the creature is a critical hit if the attacker is within 5 feet of the creature.",
        ],
      },
      {
        conditionName: "Petrified",
        markerName: "",
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
        markerName: "",
        description: [
          "A poisoned creature has <a href='!ct conditions|disadvantage'>disadvantage</a> on attack rolls and ability checks.",
        ],
      },
      {
        conditionName: "Prone",
        markerName: "",
        description: [
          "A prone creature's only movement option is to crawl, unless it stands up and thereby ends the condition.",
          "The creature has <a href='!ct conditions|disadvantage'>disadvantage</a> on attack rolls.",
          "An attack roll against the creature has <a href='!ct conditions|advantage'>advantage</a> if the attacker is within 5 feet of the creature. Otherwise, the attack roll has <a href='!ct conditions|disadvantage'>disadvantage</a>.",
        ],
      },
      {
        conditionName: "Restrained",
        markerName: "",
        description: [
          "A restrained creature's speed becomes 0, and it can't benefit from any bonus to its speed.",
          "Attack rolls against the creature have <a href='!ct conditions|advantage'>advantage</a>, and the creature's attack rolls have <a href='!ct conditions|disadvantage'>disadvantage</a>.",
          "The creature has <a href='!ct conditions|disadvantage'>disadvantage</a> on Dexterity saving throws.",
        ],
      },
      {
        conditionName: "Starving",
        markerName: "",
        description: [
          "A character needs one pound of food per day and can make food last longer by subsisting on half rations. Eating half a pound of food in a day counts as half a day without food.",
          "A character can go without food for a number of days equal to 3 + his or her Constitution modifier (minimum 1). At the end of each day beyond that limit, a character automatically suffers one level of <a href='!ct conditions|exhaustion'>exhaustion</a>. A normal day of eating resets the count of days without food to zero.",
        ],
      },
      {
        conditionName: "Stunned",
        markerName: "",
        description: [
          "A stunned creature is <a href='!ct conditions|incapacitated'>incapacitated</a>, can't move, and can speak only falteringly.",
          "The creature automatically fails Strength and Dexterity saving throws.",
          "Attack rolls against the creature have <a href='!ct conditions|advantage'>advantage</a>.",
        ],
      },
      {
        conditionName: "Suffocating",
        markerName: "",
        description: [
          "A creature can hold its breath for a number of minutes equal to 1 + its Constitution modifier (minimum of 30 seconds).",
          "When a creature runs out of breath or is choking, it can survive for a number of rounds equal to its Constitution modifier (minimum of 1 round). At the start of its next turn, it drops to 0 hit points and is dying, and it can't regain hit points or be stabilized until it can breathe again.",
          "For example, a creature with a Constitution of 14 can hold its breath for 3 minutes. If it starts suffocating, it has 2 rounds to reach air before it drops to 0 hit points.",
        ],
      },
      {
        conditionName: "Tremorsense",
        markerName: "",
        description: [
          "A creature with tremorsense can detect and pinpoint the origin of vibrations within a specific radius, provided that the creature and the source of the vibrations are in contact with the same ground or substance.",
          "Tremorsense can't be used to detect flying or incorporeal creatures.",
        ],
      },
      {
        conditionName: "Truesight",
        markerName: "",
        description: [
          "A creature with truesight can, out to a specific range, see in normal and magical darkness, see <a href='!ct conditions|invisible'>invisible</a> creatures and objects, automatically detect visual illusions and succeed on saving throws against them, and perceive the original form of a shapechanger or a creature that is transformed by magic.",
          "Tremorsense can't be used to detect flying or incorporeal creatures.",
          "The creature can see into the Ethereal Plane within the same range.",
        ],
      },
      {
        conditionName: "Unconscious",
        markerName: "",
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
          "<h2>Editing the Conditions Table</h2>" +
          "<p>When editing this conditions table, it is important to ensure the table remains intact and that the table layout is not altered.</p>" +
          "<h3>Condition column</h3>" +
          "<p>Cells in this column refer to a condition's <code>conditionName</code> property in state. Each condition name must be a simple string, and must be unique regardless of lettercase. For example, <code>blinded</code> (all lowercase) and <code>Blinded</code> (capitalized first letter) would not be unique condition names. However the condition name is formatted in the conditions table is how it will be formatted when rendered on a token's tooltip or when sent as a condition card in chat.</p>" +
          "<p>When condition names are attempted to be saved, there are several checks that occur to ensure the condition name is valid. If a condiiton name is not valid, it is reformatted to become valid so that information entered by users is not lost. The checks that occur include:</p>" +
          "<ul><li>Any vertical pipes <code>|</code> are removed</li>" +
          "<li>Extraneous whitespace is trimmed from the condition name, including the middle (only a single whitespace is allowed between characters)</li>" +
          "<li>Empty strings are replaced with a condition name of 'Condition' + a unique number identifier</li>" +
          "<li>If the condition name already exists, a unique number identifier is appended to the condition name</li></ul>" +
          "<p>After all checks are finished, the conditions table is sorted alphabetically by condition name, ignoring lettercase..</p>" +
          "<h3>Marker column</h3>" +
          "<p>Cells in this column refer to a condition's <code>markerName</code> property in state, linking a valid associated marker in your campaign's current token marker set to the condition. Each marker name must be either a campaign marker's `name` or `tag` property, or left blank.</p>" +
          "<p>Values in this column must match a token marker `name` or `tag` property exactly, including lettercase and hyphens <code>-</code>. If not entered correctly, a token marker will not be linked to the condition, and the marker image will not be applied to tokens when using ConditionTracker commands. Call the `!ct markers` command in chat to get a list of valid names/tags for markers in your campaign.</p>" +
          "<h3>Description column</h3>" +
          "<p>Cells in this column refer to a condition's <code>description</code> property in state. Each description must be an ordered or unordered list, with each list item acting as a separate description item or effect for the condition.</p>" +
          "<p>Nested lists are not supported, but you can add simple font styles such as bold, italic, underline, strikethrough, and font color. You can also add 'buttons' that will call a specific condition card by wrapping text in a link, and passing in the <code>!ct conditions|&#60;condition name&#62;</code> command as the link's URL. When creating a button that calls another condition card, you must use the 'link' button when editing the ConditionTracker Config bio.</p>",
      },
      conditionsTab: {
        name: "conditions",
        content: "",
      },
      currentTab: "",
      showTooltip: true,
    },
    version: VERSION,
  };

  // --------------------------------------------------------------------------
  // Styles and CSS Templates
  // --------------------------------------------------------------------------

  function createRoll20Marker(hexColor) {
    return `<div style='width: 5rem; height: 5rem; border: 1px solid rgba(0,0,0,0.25); border-radius: 25px; background-color: ${hexColor};'></div>`;
  }

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

  const table_template = _.template(
    `<table style=" <%= tableCSS %> "><%= caption %><thead><tr><% _.each(tableHeaders, header => { %> <th style=" <%= thCSS %> "> <%= header %> </th> <% }) %></tr></thead><tbody> <% _.each(tableRows, row => { %> <tr style=" <%= bodyTrCSS %> "> <% _.each(row, rowCell => { %> <td style=" <%= bodyTdCSS %> "> <%= rowCell %> </td> <% }) %> </tr> <% }) %> </tbody></table>`
  );

  const descList_template = _.template(
    "<div style=' <%= dlContainerCSS %> '><%= dlTitle %><dl style='<%= dlCSS %>'> <% _.each(descListItems, descItem => { %> <dt style=' <%= dtCSS %> '><%= descItem.term %></dt><dd style=' <%= ddCSS %> '><%= descItem.def %></dd> <% }) %> </dl></div>"
  );

  const captionCSS = "font-size: 1.75rem; font-weight: bold;";
  const headerCSS = `background-color: blue; color: white; padding: 5px;`;
  const configNavActiveCSS = "background-color: #e4dfff;";
  const configNavTabCSS =
    "padding: 10px; border-radius: 25px; margin-right: 10px;";
  const configTableHeadersCSS = `vertical-align: top; ${headerCSS};`;
  const dividerCSS =
    "border-top: 1px solid " + borderColorCSS({ opacity: "0.5" });
  const listCSS = "margin: 0px; list-style: none;";
  const listItemCSS = "margin-bottom: 10px;";

  // --------------------------------------------------------------------------
  // Helper Functions
  // --------------------------------------------------------------------------

  function CommandError(message, player) {
    return { message, player };
  }

  function createMessage(message, toPlayer, type) {
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
      `${
        toPlayer ? `/w "${toPlayer}"` : ""
      } <div style="${msgStyles} padding: 8px;">${message}</div>`,
      null,
      { noarchive: true }
    );
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

  function formatCommaSeparatedList(list, splitOn = ",") {
    return list
      .split(splitOn)
      .filter((listItem) => listItem !== "")
      .map((listItem) => trimWhitespace(listItem));
  }

  function checkNameValidity(currentConditions, newConditionName) {
    let trimmedName = trimWhitespace(newConditionName);
    let warnMessage = "";

    if (trimmedName === "") {
      const namePlaceholder = `Condition ${uniqueId++}`;
      createMessage(
        `Condition name cannot be blank. Created new condition with name <code>${namePlaceholder}</code> instead.`,
        "gm",
        "warn"
      );
      return namePlaceholder;
    } else if (/\||-/.test(trimmedName)) {
      trimmedName = trimmedName.replace(/\||-/g, "");
      warnMessage =
        "Condition name cannot include vertical pipe characters <code>|</code> or hyphens <code>-</code>.";
    }

    const duplicateNames = currentConditions.filter(
      (condition) =>
        condition.conditionName.toLowerCase() === trimmedName.toLowerCase()
    );

    if (_.isEmpty(duplicateNames)) {
      if (warnMessage) {
        createMessage(
          warnMessage +
            `. Created new condition with name <code>${trimmedName}</code> instead.`,
          "gm",
          "warn"
        );
      }
      return trimmedName;
    }

    const nameCopy = `${trimmedName} ${uniqueId++}`;
    createMessage(
      `${warnMessage ? warnMessage + ", and condition " : "Condition "}` +
        `with name <code>${trimmedName}</code> already exists. Created condition with name <code>${nameCopy}</code> instead.`,
      "gm",
      "warn"
    );
    return nameCopy;
  }

  function createUpdateObject(objName, objChangeAmount, objLimit) {
    const { name, changeAmount, limit } = UPDATE_OBJECT;
    return {
      [name]: objName,
      [changeAmount]: objChangeAmount,
      [limit]: objLimit,
    };
  }

  function getMarkersFromConditions(conditions) {
    const { conditions: conditionsState } = state.ConditionTracker;
    const conditionMarkers = [];

    _.each(conditions, (condition) => {
      const indexInState = _.findIndex(
        conditionsState,
        (conditionStateItem) =>
          conditionStateItem.conditionName.toLowerCase() ===
            condition.name.toLowerCase() && conditionStateItem.markerName !== ""
      );

      if (indexInState !== -1) {
        conditionMarkers.push(
          createUpdateObject(
            conditionsState[indexInState].markerName,
            condition.changeAmount,
            condition.limit
          )
        );
      }
    });

    return conditionMarkers;
  }

  function getMarkersFromToken(
    tokenObj,
    filterCallback = (marker) => marker !== ""
  ) {
    const tokenMarkers = formatCommaSeparatedList(
      tokenObj.get("statusmarkers")
    );
    const markersToSpread = tokenMarkers.filter((marker) =>
      /@\d*$/g.test(marker)
    );

    if (!markersToSpread.length) {
      return tokenMarkers.filter(filterCallback);
    }

    const markersAfterSpread = [];
    _.each(tokenMarkers, (marker) => {
      if (markersToSpread.includes(marker)) {
        let itemCount = Number(marker.slice(marker.lastIndexOf("@") + 1));
        const markerName = marker.replace(/@\d*$/g, "");

        for (let i = 0; i < itemCount; i++) {
          markersAfterSpread.push(markerName);
        }
      } else {
        markersAfterSpread.push(marker);
      }
    });

    return markersAfterSpread.filter(filterCallback);
  }

  function setMarkersOnToken(tokenObj, markersToSet) {
    const markerCount = _.countBy(markersToSet, (marker) => marker);
    const markersWithBadge = _.uniq(markersToSet).map((markerToSet) => {
      if (markerCount[markerToSet] > 1) {
        const markerCountArray = [];
        let count = markerCount[markerToSet];
        while (count > 0) {
          markerCountArray.push(`${markerToSet}@${count - 9 > 0 ? 9 : count}`);
          count -= 9;
        }

        return markerCountArray.join(",");
      }

      return markerToSet;
    });

    tokenObj.set("statusmarkers", markersWithBadge.join(","));
  }

  function getTooltipFromToken(tokenObj) {
    const tokenTooltip = formatCommaSeparatedList(tokenObj.get("tooltip"));
    const tooltipsToSpread = tokenTooltip.filter((tooltipItem) =>
      /\s*x\d*$/gi.test(tooltipItem)
    );

    if (!tooltipsToSpread.length) {
      return tokenTooltip;
    }

    const tooltipAfterSpread = [];
    _.each(tokenTooltip, (tooltipItem) => {
      if (tooltipsToSpread.includes(tooltipItem)) {
        const tooltipName = tooltipItem.replace(/\s*x\d*$/i, "");
        const itemCount = Number(
          tooltipItem.slice(tooltipItem.lastIndexOf("x") + 1)
        );

        for (let i = 0; i < itemCount; i++) {
          tooltipAfterSpread.push(tooltipName);
        }
      } else {
        tooltipAfterSpread.push(tooltipItem);
      }
    });

    return tooltipAfterSpread;
  }

  function setTooltipOnToken(tokenObj, newTooltip) {
    const { conditions: conditionsState } = state.ConditionTracker;
    const formattedTooltip = newTooltip
      .filter((tooltipItem) => tooltipItem !== "")
      .map((tooltipToFormat) => {
        const indexInState = _.findIndex(
          conditionsState,
          (conditionItem) =>
            conditionItem.conditionName.toLowerCase() ===
            tooltipToFormat.toLowerCase()
        );

        if (indexInState !== -1) {
          return conditionsState[indexInState].conditionName;
        }

        return capitalizeFirstLetter(tooltipToFormat);
      });

    const tooltipCount = _.countBy(formattedTooltip, (condition) => condition);
    const tooltipWithCount = _.uniq(formattedTooltip).map((tooltipItem) => {
      if (tooltipCount[tooltipItem] > 1) {
        return `${tooltipItem} x${tooltipCount[tooltipItem]}`;
      }

      return tooltipItem;
    });

    tokenObj.set("tooltip", tooltipWithCount.join(", "));
  }

  function calculateInstances(command, currentItems, itemsToUpdate) {
    const itemCount = _.countBy(currentItems, (item) => item);

    _.each(itemsToUpdate, (itemToUpdate) => {
      if (!_.has(itemCount, itemToUpdate.name)) {
        itemCount[itemToUpdate.name] = 0;
      }
    });

    const updatedItemCount = _.mapObject(
      itemCount,
      (currentCount, itemCountName) => {
        const updateIndex = _.findIndex(
          itemsToUpdate,
          (itemToUpdate) =>
            itemToUpdate.name.toLowerCase() === itemCountName.toLowerCase()
        );

        if (updateIndex !== -1) {
          const amountToChangeBy = calculateAmountToChangeBy(
            command,
            itemsToUpdate[updateIndex].changeAmount,
            itemsToUpdate[updateIndex].limit,
            currentCount
          );

          return currentCount + amountToChangeBy < 0
            ? 0
            : currentCount + amountToChangeBy;
        }

        return currentCount;
      }
    );

    const instancesArray = [];
    _.each(updatedItemCount, (count, item) => {
      for (let i = 0; i < count; i++) {
        instancesArray.push(item);
      }
    });

    return instancesArray;
  }

  function calculateAmountToChangeBy(
    command,
    changeAmount,
    limit,
    currentAmount
  ) {
    const {
      addCondition: add,
      removeCondition: remove,
      setCondition: set,
    } = COMMANDS_LIST;

    if (command === remove.keyword && changeAmount === "all") {
      return currentAmount * -1;
    }

    const changeInteger = parseInt(changeAmount);
    const limitInteger = parseInt(limit);

    if (command === set.keyword) {
      return changeInteger - currentAmount;
    }

    if (!limitInteger) {
      return command === add.keyword ? changeInteger : changeInteger * -1;
    }

    if (
      currentAmount === limitInteger ||
      (command === add.keyword && currentAmount > limitInteger) ||
      (command === remove.keyword && currentAmount < limitInteger)
    ) {
      return 0;
    }

    if (command === add.keyword) {
      return currentAmount + changeInteger > limitInteger
        ? limitInteger - currentAmount
        : changeInteger;
    } else if (command === remove.keyword) {
      return currentAmount - changeInteger < limitInteger
        ? limitInteger - currentAmount
        : changeInteger * -1;
    }
  }

  // --------------------------------------------------------------------------
  // Command Functions
  // --------------------------------------------------------------------------

  function createHelpTable(commandFilters) {
    const commandsToRender = commandFilters
      ? _.filter(COMMANDS_LIST, (command) =>
          commandFilters.toLowerCase().includes(command.keyword)
        )
      : COMMANDS_LIST;

    if (_.isEmpty(commandsToRender)) {
      createMessage(
        `Could not find the following commands: <ul>${formatCommaSeparatedList(
          commandFilters
        )
          .map((commandFilter) => "<li>" + commandFilter + "</li>")
          .join("")}</ul>`,
        "gm"
      );
      return;
    }

    const commandRows = [];
    _.each(commandsToRender, (command) => {
      commandRows.push([
        `<div style="font-weight: bold;">${command.keyword}</div>`,
        `<div>${command.syntax}</div><br/><div>${command.description}</div>`,
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
      }),
      null,
      { noarchive: true }
    );
  }

  function resetState(resetConfirmation) {
    if (resetConfirmation === "cancel") {
      createMessage("ConditionTracker state was not reset.", "gm", "success");
      return;
    } else if (resetConfirmation === "confirm") {
      const { instructionsTab } = state.ConditionTracker.config;
      const configCharacter = getObj(
        "character",
        state.ConditionTracker.config.configId
      );

      const stateCopy = JSON.parse(JSON.stringify(DEFAULT_STATE));
      stateCopy.config.configId = configCharacter.id;
      stateCopy.config.currentTab = instructionsTab.name;
      stateCopy.config.conditionsTab.content = createConfigTable();
      state.ConditionTracker = stateCopy;

      configCharacter.set("bio", createConfigBio(instructionsTab.name));

      createMessage(
        "ConditionTracker state successfully reset to default state.",
        "gm",
        "success"
      );
    } else {
      createMessage(
        "Resetting ConditionTracker state will overwrite any customizations made to the current state. <strong>This cannot be undone</strong>. <br/><br/> <a href='!ct reset|cancel'>Cancel</a> <a href='!ct reset|confirm'>Confirm</a>",
        "gm"
      );
    }
  }

  function createMarkersTable(markerFilters) {
    const filtersList = markerFilters
      ? formatCommaSeparatedList(markerFilters)
      : [];
    const markersToRender = filtersList.length
      ? _.filter(campaignMarkers, (marker) =>
          filtersList.some((filterItem) =>
            marker.name.toLowerCase().includes(filterItem)
          )
        )
      : [...campaignMarkers];

    const markerRows = [];
    if (markersToRender.length) {
      _.each(markersToRender, (marker) => {
        const markerImage = marker.url
          ? `<img src="${marker.url}" alt="${marker.name} token marker">`
          : marker.image;
        const markerText = marker.tag || marker.name;

        markerRows.push([markerImage, markerText]);
      });
    } else {
      createMessage(
        `Could not find any markers that include the following name filters: <ul>${filtersList
          .map((filtersListItem) => "<li>" + filtersListItem + "</li>")
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
      }),
      null,
      { noarchive: true }
    );
  }

  function updateConditionInstances(updateType, conditions, tokensToUpdate) {
    const conditionsToUpdate = formatCommaSeparatedList(conditions).map(
      (condition) => {
        const splitCondition = condition.split(/\s*-\s*/g);
        const changeAmount = splitCondition[1] || "1";
        const limit = splitCondition[2] || "0";

        return createUpdateObject(splitCondition[0], changeAmount, limit);
      }
    );

    const markersToUpdate = getMarkersFromConditions(conditionsToUpdate);

    _.each(tokensToUpdate, (tokenToUpdate) => {
      const token = getObj("graphic", tokenToUpdate._id);

      if (markersToUpdate.length) {
        const markersBeforeUpdate = getMarkersFromToken(token);
        const markersToSet = calculateInstances(
          updateType,
          markersBeforeUpdate,
          markersToUpdate
        );

        setMarkersOnToken(token, markersToSet);
      }

      const tooltipBeforeUpdate = getTooltipFromToken(token);
      const tooltipToSet = calculateInstances(
        updateType,
        _.map(tooltipBeforeUpdate, (tooltipItem) => tooltipItem.toLowerCase()),
        conditionsToUpdate
      );

      setTooltipOnToken(token, tooltipToSet);
    });
  }

  function removeAllConditions(tokensToRemoveFrom) {
    _.each(tokensToRemoveFrom, (tokenToRemoveFrom) => {
      const token = getObj("graphic", tokenToRemoveFrom._id);
      const tooltipBeforeRemoveAll = getTooltipFromToken(token).map(
        (tooltipItem) => {
          return { name: tooltipItem };
        }
      );
      const markersBeforeRemoveAll = getMarkersFromConditions(
        tooltipBeforeRemoveAll
      );

      if (markersBeforeRemoveAll.length) {
        const markersAfterRemoveAll = getMarkersFromToken(
          token,
          (marker) =>
            marker !== "" &&
            !_.findWhere(markersBeforeRemoveAll, { name: marker })
        );

        setMarkersOnToken(token, markersAfterRemoveAll);
      }

      token.set("tooltip", "");
    });
  }

  function toggleCondition(conditions, tokensToToggle) {
    const conditionsToToggle = formatCommaSeparatedList(conditions);
    const markersToToggle = getMarkersFromConditions(conditionsToToggle);

    _.each(tokensToToggle, (tokenToToggle) => {
      const token = getObj("graphic", tokenToToggle._id);

      if (markersToToggle.length) {
        const markersBeforeToggle = getMarkersFromToken(token);
        const sharedMarkers = _.intersection(
          markersBeforeToggle,
          markersToToggle
        );

        setMarkersOnToken(
          token,
          _.difference(
            [...markersBeforeToggle, ...markersToToggle],
            sharedMarkers
          )
        );
      }

      const tooltipBeforeToggle = getTooltipFromToken(token).map((tooltip) =>
        tooltip.toLowerCase()
      );
      const sharedConditions = _.intersection(
        tooltipBeforeToggle,
        conditionsToToggle
      );

      setTooltipOnToken(
        token,
        _.difference(
          [...tooltipBeforeToggle, ...conditionsToToggle],
          sharedConditions
        )
      );
    });
  }

  function createSingleConditionCard(conditionName, conditionDescription) {
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
  }

  function createConditionCards(currentToken, conditions) {
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

      if (conditions) {
        conditionsToList = formatCommaSeparatedList(conditions);
      }
    }

    const captionDiv =
      "<div style='" + `${captionCSS + headerCSS}` + "'>" + caption + "</div>";

    if (token && !conditionsToList.length) {
      return (
        "<div style='" +
        containerCSS({ maxWidth: "300px" }) +
        "'>" +
        captionDiv +
        "<div style='padding: 10px;'>No conditions are currently applied to this token.</div></div>"
      );
    }

    const conditionCards = [];
    if (conditionsToList) {
      const conditionCount = _.countBy(
        conditionsToList,
        (condition) => condition
      );
      const reducedConditions = _.uniq(conditionsToList);

      _.each(reducedConditions, (condition) => {
        const indexInState = _.findIndex(
          conditionsState,
          (conditionItem) =>
            conditionItem.conditionName.toLowerCase() ===
            condition.toLowerCase()
        );

        let descListName =
          indexInState !== -1
            ? conditionsState[indexInState].conditionName
            : condition;
        const descListDescription =
          indexInState !== -1
            ? conditionsState[indexInState].description
            : undefined;

        if (conditionCount[descListName] > 1) {
          descListName += ` x${conditionCount[descListName]}`;
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

  function updateShowTooltip(showTooltip) {
    if (showTooltip === undefined) {
      sendChat(
        CT_DISPLAY_NAME,
        `/w gm Token tooltips are currently ${
          state.ConditionTracker.config.showTooltip ? "enabled" : "disabled"
        }.`
      );
    } else {
      const updatedShowTooltip = showTooltip === "true";
      const tokenObjs = filterObjs((obj) => obj.get("_type") === "graphic");

      state.ConditionTracker.config.showTooltip = updatedShowTooltip;
      _.each(tokenObjs, (token) => {
        if (token.get("show_tooltip") !== updatedShowTooltip) {
          token.set("show_tooltip", updatedShowTooltip);
        }
      });

      createMessage(
        `Token tooltips are now ${
          updatedShowTooltip ? "enabled" : "disabled"
        }.`,
        "gm",
        "success"
      );
    }
  }

  // --------------------------------------------------------------------------
  // Config Functions
  // --------------------------------------------------------------------------

  function createConfigNavTabs() {
    const { currentTab, instructionsTab, conditionsTab } =
      state.ConditionTracker.config;

    const instructionStyle = `${configNavTabCSS} ${
      currentTab === instructionsTab.name ? configNavActiveCSS : ""
    }`;

    const conditionsStyle = `${configNavTabCSS} ${
      currentTab === conditionsTab.name ? configNavActiveCSS : ""
    }`;

    return `<div style='margin-bottom: 20px;'><a href='!ct config|instructions' style='${instructionStyle}'>Instructions</a><a href='!ct config|conditions' style='${conditionsStyle}'>Conditions</a></div>`;
  }

  const configMainHeading = `<h1>${CT_CONFIG_NAME}</h1>`;
  const configConditionsHeading = "<h2>Conditions Table</h2>";

  function createConfigBio(tab) {
    let { instructionsTab, conditionsTab } = state.ConditionTracker.config;

    if (!conditionsTab.content) {
      state.ConditionTracker.config.conditionsTab.content = createConfigTable();
    }

    if (tab === conditionsTab.name) {
      return (
        createConfigNavTabs() +
        configMainHeading +
        configConditionsHeading +
        conditionsTab.content
      );
    } else if (tab === instructionsTab.name) {
      return (
        createConfigNavTabs() + configMainHeading + instructionsTab.content
      );
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
      `<th style='${configTableHeadersCSS}'>Condition (string)</th>` +
      `<th style='${configTableHeadersCSS}'>Marker (string or left blank)</th>` +
      `<th style='${configTableHeadersCSS}'>Description (list of strings)</th></tr></thead><tbody>` +
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
        trimWhitespace(markerName).toLowerCase() === ""
          ? ""
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
    const { conditionsTab } = state.ConditionTracker.config;
    configObj.get("bio", (bio) => {
      const indexOfTable = bio.indexOf("<table");
      if (indexOfTable === -1) {
        createMessage(
          `Unable to find the conditions table in the ${CT_CONFIG_NAME} character bio. Try switching to the "Instructions" tab and then back to the "Conditions" tab to re-render the table. If this does not work, you will have to reset the ${CT_DISPLAY_NAME} state by running the <code>reset</code> command (doing so will cause any customizations to be lost).`,
          "gm"
        );
        return;
      }

      const conditionsHeader =
        createConfigNavTabs() + configMainHeading + configConditionsHeading;
      const conditionsTabContent = conditionsHeader + bio.slice(indexOfTable);
      const configTable = conditionsTabContent
        .split(/<\/h2>/)
        .filter((tableItem) => tableItem !== "")[1]
        .replace(/\\"/g, "'");

      if (_.isEqual(configTable, conditionsTab.content)) {
        /**
         * If anything in the tab header was deleted upon saving, we want to
         * render them again.
         */
        if (!_.isEqual(bio, conditionsTabContent)) {
          configObj.set("bio", conditionsTabContent);
        }
        return;
      }

      const conditionsFromTable = getConditionsFromTable(configTable);
      state.ConditionTracker.conditions = sortIgnoringCase(
        conditionsFromTable,
        "conditionName"
      );
      const tableAfterStateUpdate = createConfigTable();

      if (!_.isEqual(tableAfterStateUpdate, conditionsTab.content)) {
        state.ConditionTracker.config.conditionsTab.content =
          tableAfterStateUpdate;
        configObj.set("bio", conditionsHeader + tableAfterStateUpdate);
      }
    });
  }

  // --------------------------------------------------------------------------
  // Chat/Event Handling and Return
  // --------------------------------------------------------------------------

  function validateCommand(command, options, message) {
    const {
      help,
      markers,
      addCondition: add,
      removeCondition: remove,
      toggleCondition: toggle,
      setCondition: set,
      currentConditions,
      showTooltip,
    } = COMMANDS_LIST;

    const playerToMessage = playerIsGM(message.playerid) ? "gm" : message.who;

    if (
      command !== "config" &&
      !_.findWhere(COMMANDS_LIST, { keyword: command })
    ) {
      throw new CommandError(
        `Command <code>${command}</code> not found. Send <code>!ct help</code> for a list of valid commands.`,
        playerToMessage
      );
    }

    if (
      _.findWhere(COMMANDS_LIST, { keyword: command }) &&
      ![currentConditions.keyword, help.keyword, markers.keyword].includes(
        command
      ) &&
      !playerIsGM(message.playerid) &&
      message.playerid !== "API"
    ) {
      throw new CommandError(
        `Sorry, ${message.who}. You do not have permission to use the <code>${command}</code> command.`,
        playerToMessage
      );
    }

    if (
      [add.keyword, remove.keyword, toggle.keyword, set.keyword].includes(
        command
      ) &&
      !message.selected
    ) {
      throw new CommandError(
        `You must select at least one token before using the <code>${command}</code> command.`,
        "gm"
      );
    }

    if (
      [add.keyword, toggle.keyword, set.keyword].includes(command) &&
      !options
    ) {
      throw new CommandError(
        `You must pass in at least one option when using the <code>${command}</code> command.`,
        "gm"
      );
    }

    if (
      command === showTooltip.keyword &&
      options &&
      !/^(true|false)$/g.test(options)
    ) {
      throw new CommandError(
        `${options} is an invalid value. When calling the <code>${command}</code> command, you must pass either a value of <code>true</code> or <code>false</code>.`,
        "gm"
      );
    }
  }

  function handleChatInput(message) {
    if (!/^!ct/i.test(message.content) || message.type !== "api") {
      return;
    }

    try {
      const {
        help,
        reset,
        markers,
        addCondition: add,
        removeCondition: remove,
        toggleCondition: toggle,
        setCondition: set,
        currentConditions,
        showTooltip,
      } = COMMANDS_LIST;
      const parameters = message.content
        .slice(message.content.indexOf(" ") + 1)
        .split("|");
      const [command, options] = parameters.map((parameter) =>
        parameter.toLowerCase()
      );

      validateCommand(command, options, message);

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
          updateConditionInstances(add.keyword, options, message.selected);
          break;
        case remove.keyword:
          if (!options) {
            removeAllConditions(message.selected);
          } else {
            updateConditionInstances(remove.keyword, options, message.selected);
          }
          break;
        case toggle.keyword:
          toggleCondition(options, message.selected);
          break;
        case set.keyword:
          updateConditionInstances(set.keyword, options, message.selected);
          break;
        case currentConditions.keyword:
          if (options) {
            sendChat(
              CT_DISPLAY_NAME,
              createConditionCards(null, options),
              null,
              {
                noarchive: true,
              }
            );
          } else if (!message.selected) {
            sendChat(CT_DISPLAY_NAME, createConditionCards(), null, {
              noarchive: true,
            });
          } else {
            _.each(message.selected, (selectedItem) => {
              sendChat(
                CT_DISPLAY_NAME,
                createConditionCards(selectedItem),
                null,
                { noarchive: true }
              );
            });
          }
          break;
        case "config":
          updateActiveConfigTab(options);
          break;
        case showTooltip.keyword:
          updateShowTooltip(options);
          break;
        default:
          break;
      }
    } catch (error) {
      createMessage(error.message, error.player);
    }
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

    state.ConditionTracker.config.conditionsTab.content = createConfigTable();
    if (!config.currentTab) {
      updateActiveConfigTab(config.instructionsTab.name);
    }
  }

  function fetchCampaignMarkers() {
    const fetchedMarkers = JSON.parse(Campaign().get("token_markers"));
    campaignMarkers = sortIgnoringCase(
      [...fetchedMarkers, ...ROLL20_MARKERS],
      "name"
    );
  }

  function checkInstall() {
    if (!_.has(state, "ConditionTracker")) {
      log("Installing " + CT_DISPLAY_NAME);
      state.ConditionTracker = JSON.parse(JSON.stringify(DEFAULT_STATE));
    } else if (state.ConditionTracker.version !== VERSION) {
      log("Updating to " + CT_DISPLAY_NAME);
      state.ConditionTracker = _.extend(
        {},
        JSON.parse(JSON.stringify(DEFAULT_STATE)),
        state.ConditionTracker
      );
      state.ConditionTracker.version = VERSION;
    }

    setConfigOnReady();
    fetchCampaignMarkers();

    log(
      `${CT_DISPLAY_NAME} installed. Last updated ${new Date(
        LAST_UPDATED
      ).toLocaleDateString("en-US", {
        dateStyle: "long",
      })}.`
    );
  }

  function registerEventHandlers() {
    on("chat:message", handleChatInput);

    on("change:character:bio", (obj) => {
      const { config } = state.ConditionTracker;
      if (obj.get("name") !== CT_CONFIG_NAME) {
        return;
      }

      if (config.currentTab === config.conditionsTab.name) {
        setStateFromConfigTable(obj);
      }
    });

    on("add:graphic", (obj) => {
      const showTooltip = state.ConditionTracker.config.showTooltip;

      if (obj.get("show_tooltip") !== showTooltip) {
        obj.set("show_tooltip", showTooltip);
      }
    });
  }

  return {
    checkInstall,
    registerEventHandlers,
    updateConditionInstances,
    removeAllConditions,
    toggleCondition,
    createConditionCards,
  };
})();

on("ready", () => {
  "use strict";

  ConditionTracker.checkInstall();
  ConditionTracker.registerEventHandlers();
});
