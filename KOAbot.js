// to read the settings file
var PropertiesReader = require('properties-reader');

// to interact with Discord
const Discord = require('discord.js');

//To be able to write to files
var fs = require("fs");
//To do math evaluations
var math = require("mathjs");

//Initialising properties
var properties = PropertiesReader('settings.properties');

//Initalising the bot
const client = new Discord.Client();

//Setting up bot token
const token = properties.get('token');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/calendar',
                'https://www.googleapis.com/auth/calendar.events',
                'https://www.googleapis.com/auth/calendar.settings.readonly'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

//Initalising ownerID
var ownerID = properties.get('ownerID');

//Initalising command prefix
var prefix = properties.get('prefix');

// the regex we will use to check if the name is valid
var inputFilter = /^[A-Za-z0-9]+$/;
// the regex we will use to replace user mentions in message
var mentionFilter = /\s(<?@\S+)/g;

// this is a counter prototype
// we do not directly use it in the code as the references in javascript are weird
var dummy = {
    owner: '0',
    value: 0,
    step: 1,
    name: 'dummy',
    textView: 'Value of %name%: %value%',
    textPlus: ':white_check_mark: The pomodoro count has been incremented. New value: %value%. :arrow_up:',
    textMinus: ':white_check_mark: The pomodoro count has been decremented. New value: %value%. :arrow_down:',
    textReset: 'The value of %name% has been reset to %value%.',
    textValue: 'The value of %name% has been set to %value%.',
    textLeaderboard: 'Pomodoro Challenge Leaderboard :',
    leaderboard: {},
    whitelist: {}
};

var userLeaderboardDummy = {
    id: '0',
    username: 'dummy',
    value: 0
};

//Initialising counter file
var counters = require('./counters.json');

//Initialising Pomodoro variables
var pomRunning = false;
var breakRunning = false;
var timeLeft;
var timerID;
var intervalID;

//Initalising Calendar variables
var credentials;
var client_secret;
var client_id;
var redirect_uris;
var auth;
var calendar;

//Variables that can change depending on actions on the server MAKE SURE TO KEEP THESE UPDATED
var newsletterLink = 'https://knightsofacademia.com/weekly-sunday-newsletter-18/';
var newsletterID = 18;
var cotwLink = 'https://habitica.com/challenges/22b5e672-024e-4d89-883b-29dd7c8b6668';
var cotwPoll = 'https://goo.gl/forms/RZ0uGxsoLZLMIqzl1';

fs.readFile('credentials.json', (err, content) => {
  if (err) return console.log('Error loading client secret file:', err);
  // Authorize a client with credentials, then call the Google Calendar API.
  //authorize(JSON.parse(content), listEvents);
  credentials = JSON.parse(content);
  client_secret = credentials.installed.client_secret;
  client_id = credentials.installed.client_id;
  redirect_uris = credentials.installed.redirect_uris;
  auth = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(auth, callback);
    auth.setCredentials(JSON.parse(token));
    //callback(auth);
  });
  calendar = google.calendar({version: 'v3', auth});
});

client.on('ready', () => {
    //Start-up Message
    console.log(' -- READY TO RUMBLE -- ');
});

client.on('message', message => {

    //Greeting reactions for people on citadel
    if(message.channel.name === 'citadel'){
      var messageText = message.content.toLowerCase();
      if(messageText.includes('morning') && (messageText.includes('all') || messageText.includes('everyone') || messageText.includes('everybody') || messageText.includes('koa') || messageText.includes('knights'))){
        message.react('🌞');
        return;
      }

      if((messageText.includes('goodnight') || (messageText.includes('good') && messageText.includes('night'))) && (messageText.includes('all') || messageText.includes('everyone') || messageText.includes('everybody') || messageText.includes('koa'))){
        message.react('🌙');
        return;
      }
    }

    //Rebel's Octopus reactions
    if(message.member.id === '290582078104535041'){
      if(Math.random() < 0.15){
        message.react('🐙');
      }
    }

    //Ash's 'Rightio' Old Chap reactions
    if(message.member.id === '530296951141564428'){
      if(message.content.toLowerCase().includes('rightio')){
        message.react('👴');
      }
    }

    /*
    //Kitty's 'AYE' reactions
    if(message.member.id === '463468673693384736'){
      const words = message.content.toLowerCase().trim().split(/ +/g);
      for(var num = 0; num < words.length; num++){
        words[num] = words[num].trim();
        if(words[num].startsWith('a') && words[num].includes('ay') && words[num].includes('ye') && words[num].endsWith('e') && Math.random() < 0.30){
          message.react('🇦');
          message.react('🇾');
          message.react('🇪');
        }
      }
    }
    */

    //COTW and COTW Poll Auto-Update Functions
    if(message.channel.name === 'challenge-of-the-week' && (message.member.id === '183699552262422529' || message.member.id === '227944612650549260') && message.mentions.roles.first() && message.mentions.roles.first().name === 'Challengers of the Week'){
      const words = message.content.trim().split(/ +/g);
      for(var num = 0; num < words.length; num++){
        if(words[num].includes('https://habitica.com/challenges/')){
          cotwLink = words[num];
          message.react('⚔');
          return;
        }
        if(words[num].includes('https://goo.gl/') || words[num].includes('https://docs.google.com/forms/')){
          cotwPoll = words[num];
          message.react('529488205473644544');
          return;
        }
      }
    }

    //Newsletter Auto-Update Function
    if(message.channel.name === 'citadel' && message.content.includes('newsletter') && (message.member.id === '183699552262422529' || message.member.id === '227944612650549260')){
      const words = message.content.trim().split(/ +/g);
      for(var num = 0; num < words.length; num++){
        if(words[num].includes('https://knightsofacademia.com/weekly-sunday-newsletter')){
          newsletterLink = words[num];
          newsletterID = parseInt(words[num].substring(55, 57));
          message.react('529488205473644544');
          return;
        }
      }
    }

    if (!message.content.startsWith(prefix) || !message.content.length > 1 || message.author.bot) {
      return;
    }

    //slice off the prefix from the input, and then separate out the arguments
    const args = message.content.slice(prefix.length).trim().split(/ +/g);
    const cmd = args.shift().toLowerCase();

    function isOwner() {
      return message.author.id == ownerID;
    }

    if (cmd === 'p' || cmd === 'play'){
      message.channel.send(":x: **Error:** I think you're trying to use the rythmBot. The command prefix for rythmbot has changed to `.`, so try typing `.p` or `.play` instead!");
    }

    //'Safe raid' - provide link to the timer
    if (cmd === 'r') {
      message.channel.send("**RAAAAAAAAAAAAAAAAAAAID!** :crossed_swords:\nhttps://cuckoo.team/koa");
      message.delete();
    }

    //Provide link to the timer and tag pomodoro knights
    if (cmd === 'raid') {
      if(!message.member.roles.find("name", "pomodoro knights")){
        message.channel.send(":x: **Error:** You need to be a Pomodoro Knight in order to be able to use this command. Feel free to sign up in <#489542065504518155>.");
        return;
      }
      message.channel.send("**RAAAAAAAAAAAAAAAAAAAID!** :crossed_swords:\nCalling all <@&458729545298739200>. You know what time it is.\nhttps://cuckoo.team/koa");
      message.delete();
    }

    //Show KOA Goodreads
    if (cmd === 'goodreads' || cmd === 'gr'){
      message.channel.send("The KOA Goodreads group can be found at: https://www.goodreads.com/group/show/756579-knights-of-academia");
      message.delete();
    }

    //Show KOA Facebook
    if (cmd === 'facebook' || cmd === 'fb'){
      message.channel.send("The KOA Facebook group can be found at: https://www.facebook.com/groups/KOAFoundation/");
      message.delete();
    }

    //Show KOA Website
    if (cmd === 'website' || cmd === 'w' || cmd === 'koa'){
      if(!args[0]){
        message.channel.send("The KOA Website can be found at: https://knightsofacademia.com");
        message.delete();
        return;
      }
      args[0] = args[0].toLowerCase();
      //Show various webpages
      if (args[0] === 'cotw'){
        message.channel.send("The KOA Challenges of the Week can be found at: https://knightsofacademia.com/category/cotw/");
      } else if (args[0] === 'botm'){
        message.channel.send("The KOA Books of the Month can be found at: https://knightsofacademia.com/category/botm/");
      } else if (args[0] === 'guide'){
        message.channel.send("The Extended Guide to KOA can be found at https://knightsofacademia.com/the-extended-guide-to-koa/");
      } else if (args[0] === 'friends' || args[0] === 'ourfriends' || args[0] === 'partners' || (args[0] === 'our' && args[1] === 'friends')){
        message.channel.send("The friends and partners of KOA can be found at https://knightsofacademia.com/our-friends/");
      } else if (args[0] === 'hardmode' || args[0] === 'hard' || (args[0] === 'hard' && args[1] === 'mode')){
        message.channel.send("An explanation of KOA's 'Hard mode' can be found at https://knightsofacademia.com/hard-mode/");
      } else if (args[0] === 'aboutus' || args[0] === 'about' || (args[0] === 'about' && args[1] === 'us')){
        message.channel.send("You can find out more about KOA at https://knightsofacademia.com/start-here/about-knights-of-academia/");
      } else if (args[0] === 'guidelines' || args[0] === 'communityguidelines' || (args[0] === 'community' && args[0] === 'guidelines')){
        message.channel.send("KOA's community guidelines can be found at: https://knightsofacademia.com/start-here/brief-community-guidelines/");
      } else if (args[0] === 'articles'){
        message.channel.send("The full list of KOA's articles can be found at: https://knightsofacademia.com/category/articles/");
      } else if (args[0] === 'newsletter' || args[0] === 'news'){
        message.channel.send("The full list of KOA's Sunday newsletters can be found at: https://knightsofacademia.com/category/announcements/");
      } else if (args[0] === 'map'){
        message.channel.send("The KOA World Map can be found at: https://knightsofacademia.com/guild-resources/world-map/");
      }
    }

    //Show the KOA Map
    if (cmd === 'map'){
      message.channel.send("To view the KOA World Map, or add yourself to it, click here: https://www.google.com/maps/d/u/0/viewer?mid=1Y6hf-5PR-nO8b6u5wn44yc0CKvlsIypS&ll=20.702053475203503%2C4.100491500000089&z=2");
      message.delete();
    }

    //Show this weeks Newsletter, and also update it
    if (cmd === 'newsletter' || cmd === 'news'){
      if(!args[0]){
        message.channel.send(`This week's newsletter can be found at: ${newsletterLink}`);
        return;
      }

      if(args[0].toLowerCase() === 'id'){
        message.channel.send(`The current newsletter ID is: **${newsletterID}**.`);
        return;
      }

      if(args[0].toLowerCase() === 'update'){
        if(!isStaff(message.member)){
          message.channel.send(":x: **Error:** You don't have permission to use this command.");
          return;
        }

        if(!args[1]){
          newsletterID++;
          message.channel.send(`:white_check_mark: The new newsletter ID is **${newsletterID}**.`);
          return;
        }

        if(isNaN(args[1])){
          message.channel.send(":x: **Error:** Please only enter a number as the desired ID, e.g. `!newsletter update 15`");
        } else {
          newsletterID = parseInt(args[1]);
          message.channel.send(`:white_check_mark: The new newsletter ID is **${newsletterID}**.`);
        }

      }

    }

    if (cmd === 'cotw'){
      if(!args[0]){
        message.channel.send(`The current Challenge of the Week can be found here: ${cotwLink}`);
        return;
      }
      if(args[0].toLowerCase() === 'poll'){
        message.channel.send(`The poll for next week's Challenge of the Week can be found here: ${cotwPoll}`);
        return;
      }
    }

    //Show KOA Guild
    if (cmd === 'guild' || cmd === 'g'){
      message.channel.send("The KOA Guild can be found at: https://habitica.com/groups/guild/e184b286-b369-46c9-ab55-054c3368af33");
      message.delete();
    }

    if (cmd === 'invite' || cmd === 'discord'){
      if(!args[0]){
        message.channel.send("The invite link for the KOA main discord server is: https://discord.gg/Jca4trC");
        message.delete();
        return;
      }

      if (args[0].toLowerCase() === 'koai' || (args[0].toLowerCase() === 'koa' && args[1].toLowerCase() === 'international')){
        message.channel.send("The invite link for the KOAI discord server is: https://discord.gg/Fuvabsm");
        message.delete();
      } else if (args[0].toLowerCase() === 'camelot'){
        message.channel.send("The invite link for the KOA Camelot server is: https://discord.gg/wu3a6JA");
        message.delete();
      }
    }

    //Function to give clan list
    if (cmd === 'clans' || cmd === 'clanlist'){
      message.channel.send(":crossed_swords: **Here is our list of KOA Clans!** :crossed_swords:\n\n:small_orange_diamond: **The Round Table:** All things Hard Mode by Alex\n:small_orange_diamond: **Bards of Academia:** All things music by poss\n:small_orange_diamond: **The Fiction Faction:** Creative Writing & Story Telling by Blue Demon\n"
      + ":small_orange_diamond: **The Wolf Pack:** Data Science & all things STEM by QueenWolf\n:small_orange_diamond: **The Gathering:** Accountability by nurse4truth\n:small_orange_diamond: **The Clockwork Knights:** Productivity & Efficiency through the use of Systems by VonKobra\n:small_orange_diamond: **The Silver Tongues:** Language & Culture by MI6\n:small_orange_diamond: **The Students:** Academics & all things Education by Eric");
    }

    if (cmd === 'events'){
      message.channel.send(":small_orange_diamond: **KOA EVENTS 2019** :small_orange_diamond:\n**January:** Fireside Chat\n**February:** Fireside Chat (TBA)\n**March:** Fireside Chat (TBA), Town Hall Meeting\n**April:** Fireside Chat (TBA)\n**May:** Fireside Chat (TBA)\n**June:** Fireside Chat (TBA), Town Hall Meeting\n"
      + "**July:** Fireside Chat (TBA)\n**August:** Fireside Chat (TBA)\n**September:** Fireside Chat (TBA) Town Hall Meeting\n**October:** Fireside Chat (TBA)\n**November:** Fireside Chat (TBA)\n**December:** KOA Secret Santa, YearCompass, Fireside Chat (TBA), Town Hall Meeting");
    }

    if (cmd === 'opportunities'){
      message.channel.send("We're always looking for new applicants to the leadership teams here on KOA and over on KOAI, so here's an idea of what roles you can apply for:\n\n<:stamp:529484015946694690> __**KOA Staff Roles**__ <:stamp:529484015946694690>\n"
      + ":small_orange_diamond: **Guardian:** The moderation team of KOA, responsible for keeping things civilised, helping out the community and welcoming new users to the fold.\n:small_orange_diamond: **Architect:** The minds that build KOA. Probably the hardest position to be accepted for, these guys are responsible for planning and building new features and the future of KOA.\n"
      + ":small_orange_diamond: **Website Team:** The team that works on the KOA website. If you've got any experience writing, editing or working in website dev, this is your place to be.\n:small_orange_diamond: **Website Manager:** The leaders of the website team, responsible for staying on top of all facets of the website, and helping it to flourish.\n"
      + ":small_orange_diamond: **Sector Leader:** The leaders of the Sectors of KOA. They aim to bring more attention to the Sector, get people talking and share relevant material and ideas.\n:small_orange_diamond: **Club Leader:** The leader of KOA special-interest groups called 'Clubs'. They facilitate discussion and engage with the other club members.\n\n"
      + "<:stamp:529484015946694690> __**KOAI Staff Roles**__ <:stamp:529484015946694690>\n:small_orange_diamond: **Keeper:** The moderation team of KOAI. Take care of all the staff and administrative matters, and also make sure people follow the rules.\n:small_orange_diamond: **Scholar:** If you're familiar with a language, and wouldn't mind helping out other people with it, or translating into or out of it, this is the role for you. Scholars are also present in staff discussions and assist the Keepers.\n\n"
      + "All roles can be applied for using the appropriate form in #community-forms, and any questions about anything should be directed to your nearest Guardian. Good luck to all applicants! :tada:");
    }

    //Function to give application form for clans
    if (cmd === 'apply'){
      if(!args[0]){
        message.channel.send("Please apply for a Clan with `!apply <Clan Name>`.");
        return;
      }
      args[0] = args[0].toLowerCase();
      if (args[0] === 'theroundtable' || args[0] === 'trt' || args[0] === 'roundtable'  || args[0] === 'hardmode' || args[0] === 'hard' || args[0] === 'round' || ((args[0] === 'the') && (args[1].toLowerCase() === 'round') && (args[2].toLowerCase() === 'table'))){
        message.channel.send(":heavy_check_mark: **Fill out your user ID to receive an invite!**\n\n`Average Response Time - 24 hours or less`\n\nhttps://goo.gl/forms/m5onrVAaFc7RN1kg2");
      } else if (args[0] === 'thebards' || args[0] === 'bards' || args[0] === 'music' || args[0] === 'bardsofacademia' || ((args[0] === 'the') && (args[1].toLowerCase() === 'bards'))){
        message.channel.send(":heavy_check_mark: **Fill out your user ID to receive an invite!**\n\n`Average Response Time - 24 hours or less`\n\nhttps://goo.gl/forms/3csyULhB5aqCHjoB3");
      } else if (args[0] === 'thefictionfaction' || args[0] === 'ff' || args[0] === 'fictionfaction' || args[0] === 'writing' || args[0] === 'fiction' || ((args[0] === 'the') && (args[1].toLowerCase() === 'fiction') && (args[2].toLowerCase() === 'faction'))){
        message.channel.send(":heavy_check_mark: **Fill out your user ID to receive an invite!**\n\n`Average Response Time - 24 hours or less`\n\nhttps://docs.google.com/document/d/1KAPSiUMTpg3a6lzWCAJuqSxrA9-zzldYn_f35DJ_xXw/edit?usp=sharing");
      } else if (args[0] === 'thewolfpack' || args[0] === 'wolfpack' || args[0] === 'twp' || args[0] === 'stem' || ((args[0] === 'the') && (args[1].toLowerCase() === 'wolf') && (args[2].toLowerCase() === 'pack'))){
        message.channel.send(":heavy_check_mark: **Fill out your user ID to receive an invite!**\n\n`Average Response Time - 24 hours or less`\n\nhttps://goo.gl/forms/QJDWzppdgGsniPWG2");
      } else if (args[0] === 'thegathering' || args[0] === 'gathering' || args[0] === 'accountability' || ((args[0] === 'the') && (args[1].toLowerCase() === 'gathering'))){
        message.channel.send(":heavy_check_mark: **Fill out your user ID to receive an invite!**\n\n`Average Response Time - 24 hours or less`\n\nhttps://goo.gl/forms/69tZ0ovv6Asd32zg2");
      } else if (args[0] === 'theclockworkknights' || args[0] === 'clockwork' || args[0] === 'systems' || args[0] === 'clock' || ((args[0] === 'the') && (args[1].toLowerCase() === 'clockwork') && (args[2].toLowerCase() === 'knights'))){
        message.channel.send(":heavy_check_mark: **Fill out your user ID to receive an invite!**\n\n`Average Response Time - 24 hours or less`\n\nhttps://goo.gl/forms/5klpWjPVeCkRfdWF2");
      } else if (args[0] === 'thesilvertongues' || args[0] === 'silvertongues' || args[0] === 'silver' || args[0] === 'tongues' || args[0] === 'language' || ((args[0] === 'the') && (args[1].toLowerCase() === 'silver') && (args[2].toLowerCase() === 'tongues'))){
        message.channel.send(":heavy_check_mark: **Fill out your user ID to receive an invite!**\n\n`Average Response Time - 24 hours or less`\n\nhttps://goo.gl/forms/GcPz3zG8kmh3ZJBw1");
      } else if (args[0] === 'thestudents' || args[0] === 'students' || args[0] === 'study' || args[0] === 'studentsofkoa' || args[0] === 'academic' || ((args[0] === 'the') && (args[1].toLowerCase() === 'students'))){
        message.channel.send(":heavy_check_mark: **Fill out your user ID to receive an invite!**\n\n`Average Response Time - 24 hours or less`\n\nhttps://goo.gl/forms/mwHlk2Kj3kfC9Bfw1");
      }
    }

    //!search, the google search command
    if (cmd === 'search'){
      if(!args[0]){
        message.channel.send("Type `!search <search terms>` to google something!");
        return;
      }

      var link = 'https://www.google.com/search?q=';
      var searchTerms = message.content.trim().substring(prefix.length + 7);
      for(var num = 0; num < args.length; num++){
        if(num === 0){
          link = link + args[num];
        } else {
          link = link + '%20' + args[num];
        }
      }

      message.channel.send(`To Google-Search **${searchTerms}** click this link: ${link}.`);
    }

    //!info, the KOA Glossary
    if (cmd === 'info' || cmd === 'i') {
      if(args[0]){
        args[0] = args[0].toLowerCase();
      }
      if (args[0] === 'raid' || args[0] === 'raids'){
        message.channel.send(":tomato: **Pomodoro Raids** :tomato:\nThis is a group activity known as 'Raiding' where members of KOA all join a synchronised timer (<https://cuckoo.team/koa>) and do productive work together, using the Pomodoro Technique."
        + " A lot of people find it easier to work knowing that other people are working 'with them', and it definitely fosters some community spirit between members that join.");
      } else if (args[0] === 'habitica' || args[0] === 'habitca'){
        message.channel.send("Habitica is an application and site that allows you to track your daily tasks, habits and to-do's,"
        + " but organises them into an RPG game to give you a bit more incentive to get things done."
        + " You can join parties and go on quests, and most of the people here use it for self-improvement and keeping track of things.");
      } else if ((args[0] === 'clan' || args[0] === 'clans') && (!args[1])){
        message.channel.send("A KOA Clan is essentially just a Habitica party that is officially endorsed by the Knights of Academia."
        + " They have a party chat on Habitica, and also a Clan channel on the discord server."
        + " As per a normal Habitica party, there is a maximum of 30 members per Clan.");
      } else if (args[0] === 'guardian' || args[0] === 'guardians'){
        message.channel.send("The Guardians are the moderation team of KOA, responsible for keeping things civilised, helping out the community and welcoming new users to the fold."
        + " The current Guardians are:\n:small_orange_diamond: **Austin**\n:small_orange_diamond: **Chel**\n:small_orange_diamond: **Eric**\n:small_orange_diamond: **poss_**\n:small_orange_diamond: **Queen Wolf**");
      } else if (args[0] === 'diva'){
        message.channel.send("Heresy. No doubt about it.");
      } else if (args[0] === 'botm' || ((args[0] === 'book') && (args[1].toLowerCase() === 'of') && (args[2].toLowerCase() === 'the') && (args[3].toLowerCase() === 'month'))){
        message.channel.send(":book:  **Book of the Month** :book:\n"
        + "The Book of the Month (BOTM) activity involves our BOTM Moderator posting polls for people to vote on what they want the next month's book to be,"
        + " that every member of the club will endeavour to read over the course of the month. Look forward to interesting discussion and listening to other people's perspectives on the book!"
        + " Feel free to check out #book-of-the-month for more info.")
      } else if (args[0] === 'cotw' || ((args[0] === 'challenge') && (args[1].toLowerCase() === 'of') && (args[2].toLowerCase() === 'the') && (args[3].toLowerCase() === 'week'))){
        message.channel.send(":bow_and_arrow: **Challenge of the Week** :bow_and_arrow:\n"
        + "The Challenge of the Week (COTW) is a Habitica challenge voted on by the community, that changes every week."
        + " This can be a challenge that can ask you to do anything; make a reading habit, exercise every day, stay hydrated - but it's all done in the name of self-improvement and building yourself up."
        + " New challenges will be posted to #challenge-of-the-week every Monday, so make sure to check out the provided link to sign up for the challenge!");
      } else if (args[0] === '10kdream'){
        message.channel.send("The '10k dream' is a reference to an old server statistic that supposedly calculated that this discord server gets 10,000 messages per day on average,"
        + " something which doesn't seem to be happening right now. So we have committed ourselves to fulfilling 'the dream', and breaking through that 10,000 message/day ceiling, one message at a time.");
      } else if (args[0] === 'sector' || args[0] === 'sectors'){
        message.channel.send("The Sectors are the areas of KOA devoted to the various academic fields, each led by their own Sector Leader. There are 6 KOA Sectors in total:\n"
        + ":small_orange_diamond: **The Arts** - led by Austin :art:\n:small_orange_diamond: **STEM** - led by ChristinaFox :straight_ruler:\n:small_orange_diamond: **Computer Science** - led by Neer :desktop:\n"
        + ":small_orange_diamond: **Hustle 'N' Bustle** - led by hannahananaB :necktie:\n:small_orange_diamond: **Social Sciences** - led by Eric :two_men_holding_hands:\n:small_orange_diamond: **Wellness** - led by QueenWolf :blush:");
      } else if (args[0] === 'habitashia'){
        message.channel.send("Please spell it correctly. It's really not that hard. H - A - B - I - T - I - C - A.");
      } else if (args[0] === 'ghosting'){
        message.channel.send("'Ghosting' is what happens when someone, usually through no fault of their own, becomes idle on the cuckoo tab and becomes invisble."
        + " This means that while they are still 'in' the cuckoo, no one else can see them and their avatar will not display. To fix the issue, all you have to do is refresh the page.");
      } else if (args[0] === 'cephil'){
        message.channel.send("I'm pretty sure you mean Cowgirl?");
      } else if (args[0] === 'poss'){
        message.channel.send("If I could speak, I'd want a voice like poss.");
      } else if (args[0] === 'alex'){
        message.channel.send("Word on the street says that before Alex started KOA, he used to run his own clothing manfucturing and distribution business. Honestly, I never would have guessed.");
      } else if (args[0] === 'pomodoro' || args[0] === 'pom'){
        message.channel.send("A 'pom' or 'pomodoro' is simply a focused work session of 25 minutes. The 'Pomodoro Technique' involves alternating work periods of 25 minutes, with rest periods of 5 minutes. Every 4 work sessions, it's recommended to take a longer break of about 15 minutes.");
      } else if (args[0] === 'kyr\'amlaar' || args[0] === 'kyramlar' || args[0] === 'kyramlaar'){
        message.channel.send(":eye:");
      } else if (args[0] === 'spaghetz'){
        message.channel.send("Fun fact: Spaghetz' favourite food is spaghetti. No surprises there.");
      } else if (args[0] === 'cassius'){
        message.channel.send("Press F to pay respects.");
      } else if (args[0] === 'elske'){
        message.channel.send("Just about one of the nicest people you're going to meet on here.");
      } else if (args[0] === 'ange'){
        message.channel.send("Something a little fishy about that girl :thinking:");
      } else if (args[0] === 'rex'){
        message.channel.send("I really can't keep up with all of his name changes. This is the only page you're getting Rex.");
      } else if (args[0] === 'citadel'){
        message.channel.send("Citadel is the 'general' channel of KOA, used for general discussions that don't neccessarily fit into any other channels. If the conversation becomes more relevant to another channel or sector, you may be asked to move your discussion there and vice versa.");
      } else if (args[0] === 'eric'){
        message.channel.send("My developer and creator. Sure are times I'd like to give *him* an upgrade though :eyes:");
      } else if (args[0] === 'austin'){
        message.channel.send("The chillest dude you'll meet on the seven seas :sailboat:");
      } else if (args[0] === 'fireside' || args[0] === 'firesidechat'){
        message.channel.send("The monthly Fireside Chats are a new addition to the KOA event line-up, and they are monthly voice calls that allow the community to get to know each other better."
        + " A survey will be done to try and find the optimal time for the event, and questions that will be up for discussion will be announced before the chat takes place.");
      } else if (args[0] === 'xp'){
        message.channel.send("On the KOA Server, members are awarded XP for talking in channels. Getting XP allows you to level up, and there are some roles that are only accessible by getting the required level. Keep in mind though, XP is off in #citadel, #bot-interaction, #music-room and #gaming.");
      } else if (args[0] === '30pomdream'){
        message.channel.send("The dream of being able to get 30 poms done in a single day, dawn to dusk. Do you have what it takes?");
      } else if (args[0] === 'voting'){
        message.channel.send("Voting on KOA is usually done through the use of reactions in #voting-hall. Polls are also released for the Challenge of the Week and Book of the Month, and when they happen, the link to them will be provided with the post.");
      } else if (args[0] === 'ash'){
        message.channel.send("Bam in a can! *Oh damn oh man!*");
      } else if (args[0] === 'rebel'){
        message.channel.send(":octopus:");
      } else if (args[0] === 'rotmg'){
        message.channel.send("Realm of the Mad God. A online multiplayer game that some members occasionally play together.");
      } else if (args[0] === 'opportunities'){
        message.channel.send("We're always looking for new applicants to the leadership teams here on KOA and over on KOAI, so here's an idea of what roles you can apply for:\n\n<:stamp:529484015946694690> __**KOA Staff Roles**__ <:stamp:529484015946694690>\n"
        + ":small_orange_diamond: **Guardian:** The moderation team of KOA, responsible for keeping things civilised, helping out the community and welcoming new users to the fold.\n:small_orange_diamond: **Architect:** The minds that build KOA. Probably the hardest position to be accepted for, these guys are responsible for planning and building new features and the future of KOA.\n"
        + ":small_orange_diamond: **Website Team:** The team that works on the KOA website. If you've got any experience writing, editing or working in website dev, this is your place to be.\n:small_orange_diamond: **Website Manager:** The leaders of the website team, responsible for staying on top of all facets of the website, and helping it to flourish.\n"
        + ":small_orange_diamond: **Sector Leader:** The leaders of the Sectors of KOA. They aim to bring more attention to the Sector, get people talking and share relevant material and ideas.\n:small_orange_diamond: **Club Leader:** The leader of KOA special-interest groups called 'Clubs'. They facilitate discussion and engage with the other club members.\n\n"
        + "<:stamp:529484015946694690> __**KOAI Staff Roles**__ <:stamp:529484015946694690>\n:small_orange_diamond: **Keeper:** The moderation team of KOAI. Take care of all the staff and administrative matters, and also make sure people follow the rules.\n:small_orange_diamond: **Scholar:** If you're familiar with a language, and wouldn't mind helping out other people with it, or translating into or out of it, this is the role for you. Scholars are also present in staff discussions and assist the Keepers.\n\n"
        + "All roles can be applied for using the appropriate form in #community-forms, and any questions about anything should be directed to your nearest Guardian. Good luck to all applicants! :tada:");
      } else if (args[0] === 'events'){
        message.channel.send(":small_orange_diamond: **KOA EVENTS 2019** :small_orange_diamond:\n**January:** Fireside Chat\n**February:** Fireside Chat (TBA)\n**March:** Fireside Chat (TBA), Town Hall Meeting\n**April:** Fireside Chat (TBA)\n**May:** Fireside Chat (TBA)\n**June:** Fireside Chat (TBA), Town Hall Meeting\n"
        + "**July:** Fireside Chat (TBA)\n**August:** Fireside Chat (TBA)\n**September:** Fireside Chat (TBA) Town Hall Meeting\n**October:** Fireside Chat (TBA)\n**November:** Fireside Chat (TBA)\n**December:** KOA Secret Santa, YearCompass, Fireside Chat (TBA), Town Hall Meeting");
      } else if (args[0] === 'hardmode' || (args[0] === 'hard' && args[1].toLowerCase() === 'mode')){
        message.channel.send("Hard mode is a 'playstyle' of Habitica that aims to make it more challenging to play, and more rewarding when you succeed. Use `!KOA hard mode` to learn more about it!");
      } else if (args[0] === 'x'){
        message.channel.send("Legend has it that this man was the first Jurgandy.");
      } else if (args[0] === 'doomflake'){
        message.channel.send("Legend has it Doomflake is still in the <#382921625768689665>.");
      } else if (args[0] === 'texas'){
        message.channel.send("Home of the lovely QueenWolf! :cowboy:");
      } else if (args[0] === 'koai'){
        message.channel.send("The sister-server of KOA, KOA International! There's more of a focus on different languages and different cultures there. Feel free to grab a link to it with `!invite KOAI` or in <#403260793644384266>!");
      } else if (args[0] === 'eko'){
        message.channel.send("Fun fact: Eko was actually Alex's first party leader!");
      } else if (args[0] === 'bunbun'){
        message.channel.send("Bunbun is the name of Kayla's pet bunny! :rabbit2:");
      } else if (args[0] === 'afk'){
        message.channel.send("Please don't use AFK unless there's a reason to, Austin.");
      } else if (args[0] === 'weasel'){
        message.channel.send("The worst thing you can be. Never be a weasel.");
      } else if (args[0] === 'mcheloous'){
        message.channel.send("If you haven't laughed to her saying *'fat rip'* in her accent, are you really a member of KOA? :rofl:");
      } else if (args[0] === 'dream'){
        message.channel.send("*You mustn't be afraid to dream a little bigger.*");
      } else if (args[0] === 'anny'){
        message.channel.send("```Welcome! I'm Anny, one of the Guardians and the leader of KOA: International! Would you mind sharing a bit about yourself and why you decided to join us?```");
      } else if (args[0] === 'townhall' || args[0] == 'th' || (args[0] === 'town' && args[1].toLowerCase() === 'hall')){
        message.channel.send("The Town Hall meetings are the quarterly meetings of KOA, where we gather in a voice call and a text channel to discuss changes that will be made to the server or to the organisation, and also get feedback on previous ideas that have been implemented. The time for the event will be sorted through a poll beforehand, and anyone is welcome to attend!");
      } else if (args[0] === '⚙'){
        message.channel.send("VonKobra, the leader of the ClockWork Knights. Wonder how hard it is to grind his gears?");
      } else if (args[0] === 'ershy'){
        message.channel.send("What *does* ershy taste like? Will the world ever know?");
      } else if (args[0] === 'jurgandy'){
        message.channel.send("The man, the myth, the legend.");
      } else if (args[0] === 'jojo'){
        message.channel.send("Stand Proud! <:violation:529488850385502219>");
      } else if (args[0] === 'camelot'){
        message.channel.send("The place for memes, ranting, debates, and pretty much anything else that might not be allowed in KOA Main. Feel free to grab a link to it with `!invite Camelot` or in <#403260793644384266>!");
      } else if (args[0] === 'demon'){
        message.channel.send("Most people don't know this, but Blue Demon is actually just one member of an entire coloured-demon family!")
      } else if (args[0] === 'cw' || args[0] === 'clanwar' || (args[0] === 'clan' && args[1].toLowerCase() === 'war')){
        message.channel.send("Clan Wars are a month-long activity that involve the Clans of KOA battling it out in a competition of some sort. During October 2018, the Clan War was the Pomodoro Challenge, and the winning clan was the Fiction Faction. In order to compete you have to be part of a clan, so make sure you sign up for one using `!apply`!")
      }
    }

    //!pom/!p, to start a pomodoro session
    if (cmd === 'pomodoro') {
      if(pomRunning){
        message.channel.send(':x: **Error:** There is already an active pomodoro!');
        return;
      } else if(breakRunning){
        message.channel.send(':x: **Error:** The break is still going!');
        return;
      }

      if(cmd === 'p' && !args[0]){
        timer(25, 'pom', message)
      } else if (Number.isInteger(parseInt(args[0]))){
        if(parseInt(args[0]) == 0){
          message.channel.send(':x: **Error:** You cannot start a pom with a length of 0 minutes.');
          return;
        }
        if(parseInt(args[0]) > 120){
          message.channel.send(':x: **Error:** You cannot start a pom with a length of over 120 minutes.');
          return;
        }
        timer(parseInt(args[0]), 'pom', message);
      } else {
        message.channel.send(':x: **Error:** use ``!pom X`` to start a pomodoro for X minutes.');
      }

    }

    //!break/!b, to start a break after a pom session
    if (cmd === 'break' || cmd === 'b') {
      if(pomRunning){
        message.channel.send(':x: **Error:** The pomodoro is still going!');
        return;
      } else if(breakRunning){
        message.channel.send(':x: **Error:** There is already an active break!');
        return;
      }

      if(cmd === 'b' && !args[0]){
        timer(5, 'break', message)
      } else if (Number.isInteger(parseInt(args[0]))){
        if(parseInt(args[0]) == 0){
          message.channel.send(':x: **Error:** You cannot start a break with a length of 0 minutes.');
          return;
        }
        if(parseInt(args[0]) > 30){
          message.channel.send(':x: **Error:** You cannot start a break with a length of over 30 minutes.');
          return;
        }
        timer(parseInt(args[0]), 'break', message);
      } else {
        message.channel.send(':x: Error: use ``!break X`` to start a break for X minutes.');
      }

    }

    //!stop/!s, to stop a pomodoro session or a break
    if (cmd === 'stop' || cmd === 's'){
      if(pomRunning){
        clearTimeout(timerID);
        message.channel.send(':white_check_mark: **Successfully stopped the pomodoro.**');
        pomRunning = false;
      } else if(breakRunning){
        clearTimeout(timerID);
        message.channel.send(':white_check_mark: **Successfully stopped the break.**');
        breakRunning = false;
      } else {
        message.channel.send(':x: **Error:** There is nothing active to stop right now.');
      }
    }

    //!time/!t, to see how much time is left in the work session or the break
    if (cmd === 'time' || cmd === 't'){
      if(!pomRunning && !breakRunning){
        message.channel.send(':x: **Error:** There is no active session right now.');
        return;
      }
      var mins = Math.floor(Math.round(timeLeft/1000)/60);

      var secs = (Math.round(timeLeft/1000)) - (mins*60);

      if(secs < 10){
        secs = '0'+ secs;
      }

      if(pomRunning){
        //message.channel.send("Time left in milliseconds: " + timeLeft);
        message.channel.send(`:timer: There are currently __**${mins}:${secs}**__ minutes left in the work session. :timer:`);
      }

      if(breakRunning){
        message.channel.send(`:timer: There are currently __**${mins}:${secs}**__ minutes left in the break. :timer:`);
      }
    }

    //!coinflip, to give you a 50/50 option when you gotta make a tough call
    if (cmd === 'coinflip' || cmd === 'flipcoin'){
      if(Math.random() < 0.5){
        message.channel.send(message.author + " flipped...\n\n**HEADS!**");
      } else {
        message.channel.send(message.author + " flipped...\n\n**TAILS!**");
      }
    }

    if (cmd === 'choose' || cmd === 'pick'){
      var data = message.content.substring(prefix.length + cmd.length + 1);
      var option = data.trim().split(',');
      if(!option[0]){
        message.channel.send(":x: **Error:** To use this command, type `!choose <option 1>, <option 2>, etc` **e.g.** `!choose eat, sleep, work, party`.");
        return;
      }

      for(var num = 0; num < option.length; num++){
        option[num] = option[num].trim();
      }

      var select = Math.floor(Math.random()*option.length);
      message.channel.send(`By decree of <@532033195688984598>,\n\n**${option[select]}.**`);

    }

    //AFK command
    if (cmd === 'afk'){
      //TODO this command
    }

    if (cmd === 'porn'){
      message.channel.send("<:wat:529484506856423429>");
    }

    if (cmd === 'stamp'){
      message.channel.send("<:stamp:530938614561898506>");
    }
    //----------------------------------------------------------------
    //            POM-COUNTER/LEADERBOARD COMMANDS
    //----------------------------------------------------------------
    if (cmd === 'addcounter' || cmd === 'ac') {
        if (args.length == 1) {
          if(!isStaff(message.member)){
            message.channel.send(":x: **Error:** You don't have permission to use this command. Please contact a Guardian.");
            return;
          }
            var state = addCounter(message.author.id, args[0]);
            if (state == 1) {
                message.channel.send(':white_check_mark: The counter has been correctly added.');
            } else if (state == 2) {
                message.channel.send(':x: **Error:** A counter with this name already exists, please choose another one.');
            } else if (state == 3) {
                message.channel.send(':x: **Error:** Your counter name contains illegal characters. Please match /^[A-Za-z0-9]+$/.');
            }
        }
    } else if (cmd === 'delcounter' || cmd === 'dc') {
        if(!isStaff(message.member)){
          message.channel.send(":x: **Error:** You don't have permission to use this command. Please contact a Guardian.");
          return;
        }
        if (args.length == 1) {
            var state = delCounter(message.author.id, args[0]);
            if (state == 1) {
                message.channel.send(':white_check_mark: The counter has been correctly deleted.');
            } else if (state == 2) {
                message.channel.send('There is no counter with this name.');
            } else if (state == 3) {
                message.channel.send('You are not the owner of this counter.');
            }
        }
    } else if (cmd === 'log') {
        console.log(counters);
    } else if (cmd === "cleardb") {
        if (isOwner()) {
            counters = {};
            message.channel.send('Local database has been cleared.');
            saveToDisk();
        } else {
            message.channel.send('Sorry, only the owner can do this.');
        }
    } else if (cmd === 'exit') {
        if (isOwner()) {
            message.channel.send('Stopping').then(x => {
                client.destroy();
                process.exit(0);
            });
        } else {
            message.channel.send('Sorry, only the owner can do this.');
        }
    } else if (cmd === "upgradecounters") {
        if (isOwner()) {
            upgradeCounters();
            message.channel.send('Counters have been upgraded. You MUST restart the bot, or weird behaviour could happen.');
            saveToDisk();
        } else {
            message.channel.send('Sorry, only the owner can do this.');
        }
    } else if (cmd === "uid") {
        message.channel.send('Your UID is : ' + message.author.id);

    } else if (cmd ===("listcounters")) {
        var output = '```\r\n';
        for (var key in counters) {
            output += counters[key].name + '\r\n';
        }
        output += '```';
        message.channel.send(output);
    } else {
        var counterName = cmd;
        if (counters[counterName]) {
            if (args.length == 0) {
                message.channel.send(getTextView(counterName));
            } else {
                if (args[0].startsWith('+')) {
                    if(!message.mentions.members.first() && !isStaff(message.member)){
                      message.channel.send(":x: **Error:** Please make sure you tag yourself properly after the +. e.g. ``!pom + @Alex#8758``");
                      return;
                    }
                    if(message.mentions.users.first() !== message.author && !isStaff(message.member)){
                      message.channel.send(":x: **Error:** Please only add to your own count.");
                      return;
                    }

                    var length = args[0].length;
                    if(length > 2 && !isStaff(message.member)){
                      message.channel.send(":x: **Error:** You don't have permission to add 10+ poms. Please contact a Guardian.");
                      return;
                    }

                    if (!parseInt(args[0].substring(1)) && length > 1){
                      message.channel.send(":x: **Error:** Please add poms using ``!pom + @<Username>``.");
                      return;
                    }

                    // TODO:  make it so that people who fuck up spacing for multiple poms get hit with error message
                    //no idea how to do that though :thonk:

                    if (setValue(counterName, length == 1 ? "1" : message.content.substring(cmd.length + 3, cmd.length + 2 + length), '+', message.mentions.users)) {
                        message.channel.send(getTextPlus(counterName));
                    } else {
                        message.channel.send("There was an error parsing your input.");
                    }
                } else if (args[0].startsWith('-')) {
                    if(!isStaff(message.member)){
                      message.channel.send(":x: **Error:** You don't have permission to use this command. Please contact a Guardian.");
                      return;
                    }
                    var length = args[0].length;
                    if (setValue(counterName, length == 1 ? "1" : message.content.substring(cmd.length + 3, cmd.length + 2 + length), '-', message.mentions.users)) {
                        message.channel.send(getTextMinus(counterName));
                    } else {
                        message.channel.send("There was an error parsing your input.");
                    }
                } else if (args[0] == 'reset') {
                    if(!isStaff(message.member)){
                      message.channel.send(":x: **Error:** You don't have permission to use this command. Please contact a Guardian.");
                      return;
                    }
                    resetValue(counterName);
                    message.channel.send(getTextReset(counterName));
                } else if (args[0] == 'value') {
                    if (args[1]) {
                        if (setValue(counterName, message.content.substring(cmd.length + 1 + args[0].length + 1), '=')) {
                            message.channel.send(getTextValue(counterName));
                        } else {
                            message.channel.send("There was an error parsing your input.");
                        }
                    }
                } else if (args[0] == 'edit') {
                    if (counters[counterName][args[2]]) {
                        var newValue = message.args.substr(message.content.indexOf(args[1]) + args[1].length + 1);
                        setCounterText(counterName, args[1], newValue);
                        message.channel.send('Property ' + args[1] + ' has been changed.');
                    }
                } else if (args[0] == 'show') {
                    if (counters[counterName][args[1]]) {
                        message.channel.send(args[1] + ' : ' + counters[counterName][args[1]]);
                    }
                } else if (args[0] == 'leaderboard' || args[0] == 'leadership') {
                    var sortable = [];

                    for (var key in counters[counterName].leaderboard) {
                        sortable.push(counters[counterName].leaderboard[key]);
                    }

                    sortable.sort(function (a, b) {
                        return b.value - a.value;
                    });

                    var output = '```\r\n';
                    output += getTextLeaderboard(counterName) + '\r\n\r\n';
                    for (var i = 0; i < sortable.length; i++) {
                        output += (i + 1) + '. ' + sortable[i].username + ' : ' + sortable[i].value + '\r\n';
                    }
                    output += '```';
                    message.channel.send(output);

                } else if (args[0] == 'clearleaderboard') {
                    if (isOwner()) {
                        counters[counterName].leaderboard = {};
                        message.channel.send('Leaderboard for ' + counterName + ' has been cleared.');
                        saveToDisk();
                    } else {
                        message.channel.send('Sorry, only the owner can do this.');
                    }
                }
                saveToDisk();
            }
        }
    }

    if(cmd === 'calendar' || cmd === 'cal' || cmd === 'eventscalendar'){

      if(!args[0]){
        message.channel.send("https://calendar.google.com/calendar/b/1?cid=a25pZ2h0c29mYWNhZGVtaWFAZ21haWwuY29t");
        return;
      }

      if(args[0] === 'display' || args[0] === 'show'){
        if(!args[1] || args[1] === 'help'){
          message.channel.send("Type ``!cal display <X>`` to show the upcoming X events in the calendar.\n**e.g.** To show the first 5 events, ``!cal display 5``.");
          return;
        }

        if(isNaN(args[1])){
          message.channel.send(":x: **Error:** Invalid input. Please make sure you enter a number, after the display, e.g. ``!cal display 5``.");
          return;
        }

        if(parseInt(args[1]) > 20){
          message.channel.send(":x: **Error:** Please display 20 or less upcoming events.");
          return;
        }

        calendar.events.list({
          calendarId: 'knightsofacademia@gmail.com',
          timeMin: (new Date()).toISOString(),
          maxResults: args[1],
          singleEvents: true,
          orderBy: 'startTime',
        }, (err, res) => {
          if (err) return message.channel.send('The API returned an error: ' + err);
          const events = res.data.items;
          if (events.length) {
            message.channel.send(`:calendar_spiral: **Upcoming ${args[1]} events on the KOA Calendar:** :calendar_spiral:\n`);
            events.map((event, i) => {
              const start = event.start.dateTime || event.start.date;
              var time = ` **@** ${start.substring(11, 16)}`;

              if (parseInt(start.substring(11,13)) <= 12) {
                time = time + 'am';
              } else {
                time = ` **@** ${parseInt(start.substring(11,13))-12}${start.substring(13,16)}pm`
              }

              if(start.substring(11, 16)){
                message.channel.send(`${start.substring(5,10)} - ${event.summary}` + time);
              } else {
                message.channel.send(`${start.substring(5,10)} - ${event.summary}`);
              }

            });
          } else {
            message.channel.send('No upcoming events found.');
          }
        });
      } else if(args[0] === 'add'){

        if(!isStaff(message.member)){
          message.channel.send(":x: **Error:** You don't have permission to use this command.");
          return;
        }

        if(!args[1] || args[1] === 'help'){
          message.channel.send('**:calendar_spiral: CALENDAR ADDING FUNCTION :calendar_spiral:**\n\n'
          + ':small_orange_diamond:To make an **all-day event:**\n``!cal add <Event Name>, YYYY, MM, DD``\n**e.g.** To make an event for the COTW Poll opening on the 17th of January 2019:\n ``!cal add COTW Polls Open, 2019, 01, 17``\n\n'
          + ':small_orange_diamond:To make an **all-day event, with description:**\n``!cal add <Event Name>, YYYY, MM, DD, <description>``\n**e.g.** For the January BOTM opening on the 1st of January 2019:\n``!cal add Book of the Month, 2019, 01, 01, January BOTM Opens!``\n\n'
          + ':small_orange_diamond:To make a **timed event on a day:**\n``!cal add <Event Name>, YYYY, MM, DD, <Start Time>, <End Time>``\n**e.g.** For the Fireside chat happening on the 20th of January 2019 at 3pm, for 3 hours:\n``!cal add Fireside Chat, 2019, 01, 20, 1500, 1800``\n\n'
          + ':small_orange_diamond:To make a **timed event on a day, with description:**\n``!cal add <Event Name>, YYYY, MM, DD, <Start Time>, <End Time>, <description>``\n**e.g.** For the 30-minute Group Meditation session happening on the 15th of January 2019 at 7pm:\n``!cal add Meditation, 2019, 01, 15, 1900, 1930, Group Meditation Session``\n\n'
          + 'Please ensure that there are commas between each argument, the date is entered properly (YYYY,MM,DD) and the Start Time and End Time are entered in 24-hour/military time.The description of the event is optional.');
          return;
        }
        var data = message.content.substring(prefix.length + cmd.length + args[0].length + 2);
        var arg = data.trim().split(',');

        if(isNaN(arg[4]) || arg[4] === ''){
          var startDate = arg[1].trim()+'-'+arg[2].trim()+'-'+arg[3].trim();
          var endDate = arg[1].trim()+'-'+arg[2].trim()+'-'+arg[3].trim();
          var desc = arg[4] ? arg[4].trim() : '';
        } else {
          var startTime = arg[1].trim()+'-'+arg[2].trim()+'-'+arg[3].trim()+'T'+arg[4].trim().substring(0,2)+':'+arg[4].trim().substring(2,4)+':00-06:00';
          var endTime = arg[1].trim()+'-'+arg[2].trim()+'-'+arg[3].trim()+'T'+arg[5].trim().substring(0,2)+':'+arg[5].trim().substring(2,4)+':00-06:00';
          var desc = arg[6] ? arg[6].trim() : '';
        }

        var newDateEvent = {
          'summary': arg[0].trim(),
          'description': desc,
          'start': {
            'date': startDate,
            'timeZone': 'America/Chicago',
          },
          'end': {
            'date': endDate,
            'timeZone': 'America/Chicago',
          },
        };

        var newTimeEvent = {
          'summary': arg[0].trim(),
          'description': desc,
          'start': {
            'dateTime': startTime,
            'timeZone': 'America/Chicago',
          },
          'end': {
            'dateTime': endTime,
            'timeZone': 'America/Chicago',
          },
        };

        if(isNaN(arg[4])){
          calendar.events.insert({
            auth: auth,
            calendarId: 'knightsofacademia@gmail.com',
            resource: newDateEvent,
          }, function(err, newDateEvent) {
            if (err) {
              message.channel.send('There was an error contacting the Calendar service: ' + err);
              return;
            }
          });
        } else {
          calendar.events.insert({
            auth: auth,
            calendarId: 'knightsofacademia@gmail.com',
            resource: newTimeEvent,
          }, function(err, newTimeEvent) {
            if (err) {
              message.channel.send('There was an error contacting the Calendar service: ' + err);
              return;
            }
          });
        }

        if(isNaN(arg[4])){
          message.channel.send(`:white_check_mark:**New event successfully created!**\n\n**Event Name:** ${newDateEvent.summary}\n**Date:** ${arg[1].trim()}-${arg[2].trim()}-${arg[3].trim()}\n**Start Time:** All Day\n**End Time:** All Day\n**Description:** ${desc}`);
        } else {
          message.channel.send(`:white_check_mark:**New event successfully created!**\n\n**Event Name:** ${newTimeEvent.summary}\n**Date:** ${arg[1].trim()}-${arg[2].trim()}-${arg[3].trim()}\n**Start Time:** ${arg[4]}\n**End Time:** ${arg[5]}\n**Description:** ${desc}`);
        }

      }
    }
});

// Create an event listener for new guild members
client.on('guildMemberAdd', member => {
  //Adding initiate role
  member.addRole('459085352917925908');
  // Send the message to a designated channel on a server:
  const channel = member.guild.channels.find(ch => ch.name === 'citadel');
  // Do nothing if the channel wasn't found on this server
  if (!channel) return;
  // Send the message, mentioning the member
  channel.send(`:tada: **A new member has arrived!** :tada:\nWelcome to Knights of Academia ${member}!`);
  member.send("**Welcome to Knights of Academia!**\n\nFirst things first, introduce yourself in #citadel! The community is excited to meet you :smile:\n\n"
  + "Feel free to join us on our social media:\n:small_orange_diamond:**Habitica:** <https://habitica.com/groups/guild/e184b286-b369-46c9-ab55-054c3368af33>\n"
  + ":small_orange_diamond:**Facebook:** <https://www.facebook.com/groups/KOAFoundation/>\n:small_orange_diamond:**Goodreads:** <https://www.goodreads.com/group/show/756579-knights-of-academia>\n\n"
  + "If you have any questions about anything, please don't hesitate to ask someone on the server. Hope you enjoy your stay here! :tada:");
});

client.login(token);

function isStaff(member){
  if(member.roles.find("name", "Guardians")){
    return true;
  } else if (member.roles.find("name", "Architects")){
    return true;
  } else if (member.id === '183699552262422529'){
    return true;
  }

  //get Alex's ID probably
  return false;
}

function addCounter(id, title) {
    if (inputFilter.test(title) && title != "addcounter" && title != "delcounter" && title != "ac" && title != "dc") {
        if (counters[title]) {
            return 2;
        } else {
            counters[title] = JSON.parse(JSON.stringify(dummy));
            counters[title].owner = id;
            counters[title].name = title;
            saveToDisk();
            return 1;
        }
    } else {
        return 3;
    }
}

function getTextView(title) {
    return counters[title].textView.replace('%name%', counters[title].name).replace('%value%', counters[title].value);
}

function getTextPlus(title) {
    return counters[title].textPlus.replace('%name%', counters[title].name).replace('%value%', counters[title].value);
}

function getTextMinus(title) {
    return counters[title].textMinus.replace('%name%', counters[title].name).replace('%value%', counters[title].value);
}

function getTextReset(title) {
    return counters[title].textReset.replace('%name%', counters[title].name).replace('%value%', counters[title].value);
}

function getTextValue(title) {
    return counters[title].textValue.replace('%name%', counters[title].name).replace('%value%', counters[title].value);
}

function getTextLeaderboard(title) {
    return counters[title].textLeaderboard.replace('%name%', counters[title].name).replace('%value%', counters[title].value);
}

function setCounterText(title, textToChange, newText) {
    counters[title][textToChange] = newText;
}

function resetValue(title) {
    setValue(title, dummy.value, '=', []);
}

//
function setValue(title, value, operator, mentions) {
    try {
        var val = math.eval(value);

        // ensure that each mentionned user is present in the leaderboard, creating them when needed

        mentions.forEach(function (value2) {
            if (!counters[title].leaderboard[value2.id]) {
                counters[title].leaderboard[value2.id] = {
                    id: value2.id,
                    username: value2.username,
                    value: 0
                };
            }
        });

        switch (operator) {
            case '+':
                counters[title].value += val;
                mentions.forEach(function (value) {
                    counters[title].leaderboard[value.id].value += val;
                });
                break;
            case '-':
                counters[title].value -= val;
                mentions.forEach(function (value) {
                    counters[title].leaderboard[value.id].value -= val;
                });
                break;
            case '=':
                counters[title].value = val;
                mentions.forEach(function (value) {
                    counters[title].leaderboard[value.id].value = val;
                });
                break;
        }
        return true;
    } catch (err) {
        return false;
    }
}

function getValue(title) {
    // since the value can be invalide due to the edit command, we check that it is an integer and reset it when needed
    var val = parseInt(counters[title].value);
    if (isNaN(val)) {
        counters[title].value = val = 0;
    }
    return val;
}

function getStep(title) {
    // since the value of step can be invalide due to the edit command, we check that it is an integer and reset it when needed
    var val = parseInt(counters[title].step);
    if (isNaN(val)) {
        counters[title].step = val = 1;
    }
    return val;
}

function delCounter(id, title) {
    if (inputFilter.test(title)) {
        if (counters[title]) {
            if (id != counters[title].owner && id != ownerID) {
                return 3;
            } else {
                delete counters[title];
                return 1;
            }
        } else {
            return 2;
        }

    } else {
        return 2;
    }
}

function saveToDisk() {
    fs.writeFile('counters.json', JSON.stringify(counters), "utf8", err => {
        if (err) throw err;
        console.log('Counters successfully saved !');
    });
}

// this function take the existing counters and upgrade them to the newest counter prototype
function upgradeCounters() {
    for (var key in counters) {
        if (!counters.hasOwnProperty(key)) continue;

        for (var key2 in dummy) {
            if (!dummy.hasOwnProperty(key2)) continue;

            if (!counters[key][key2]) {
                counters[key][key2] = dummy[key2];
            }

        }

    }
}

//Timer function for the pom-bot
function timer(time, session, message){
  //Multiply by 60 and 1000 to turn it from minutes to milliseconds
  timeLeft = time*60*1000;
  if(session === 'pom'){
    pomRunning = true;
    message.channel.send(`:tomato: **${time} minute pomodoro started!** :tomato:`);
    //setInterval(debug, 5000);
    timerID = setTimeout(endPom, time*60*1000);
    intervalID = setInterval(countdown, 1000);
  } else if (session === 'break'){
    breakRunning = true;
    message.channel.send(`:couch: **${time} minute break started!** :couch:`);
    timerID = setTimeout(endBreak, time*60*1000);
    intervalID = setInterval(countdown, 1000);
  } else {
    message.channel.send(":x: **Error:** Something isn't right.");
  }

  function endPom(){
    message.channel.send(`:tada: **${time} minute pomodoro finished!** :tada:`);
    pomRunning = false;
  }

  function endBreak(){
    message.channel.send(`:tada: **${time} minute break finished!** :tada:`);
    breakRunning = false;
  }

  function countdown(){
    //Lower timeLeft by 1 second/1000 milliseconds every second
    timeLeft = timeLeft - 1000;
  }

}

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getAccessToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getAccessToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error retrieving access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Lists the next 10 events on the user's primary calendar.
 * @param {google.auth.OAuth2} auth An authorized OAuth2 client.
 */
function listEvents(auth) {
  const calendar = google.calendar({version: 'v3', auth});
  calendar.events.list({
    calendarId: 'knightsofacademia@gmail.com',
    timeMin: (new Date()).toISOString(),
    maxResults: 20,
    singleEvents: true,
    orderBy: 'startTime',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const events = res.data.items;
    if (events.length) {
      console.log('Upcoming 10 events:');
      events.map((event, i) => {
        const start = event.start.dateTime || event.start.date;
        console.log(`${start} - ${event.summary}`);
      });
    } else {
      console.log('No upcoming events found.');
    }
  });
}

function addReaction(message, reaction){
  message.react(reaction);
}
