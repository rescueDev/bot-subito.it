import "dotenv/config";
import Scraper from "./scraper";

var category: string;
var query: string;
var page_current: number = 1;

const TelegramBot = require("node-telegram-bot-api");
// Create a bot that uses 'polling' to fetch new updates
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

var answerCallbacks = {};

bot.on("message", function (message) {
  var callback = answerCallbacks[message.chat.id];
  if (callback) {
    delete answerCallbacks[message.chat.id];
    return callback(message);
  }
});

bot.onText(/\/start/, (msg, match) => {
  bot.sendMessage(
    msg.chat.id,
    "Ciao sono il tuo bot Subito Scraper, scegli uno dei comandi di seguito"
  );
});

//delayed sending messages, prevent too many request telegram server
const timer = (ms) => new Promise((res) => setTimeout(res, ms));
async function SendDelayedMessages(links: string[], chatID) {
  for (let index = 0; index < links.length; index++) {
    const link = links[index];
    bot.sendMessage(chatID, link);
    await timer(1500);
  }
}

function SetCategory(chatID: any, page: number = 1) {
  bot.on("callback_query", function onCallbackQueryCategory(callbackQuery) {
    category = callbackQuery.data;

    //remove event listener category callback
    bot.removeListener("callback_query");

    //scraping
    initScraping(chatID);
  });
}

function initScraping(chatID) {
  let scraper = new Scraper(query, category, page_current);

  scraper.FetchHtml().then(function (html) {
    let last_page: number = Scraper.GetLastPage(html);
    let links: string[] = scraper.ExtractLink(html);

    //send links with timeout
    SendDelayedMessages(links, chatID).then((res) => {
      //creating paging
      let pagine = {
        reply_markup: JSON.stringify({
          inline_keyboard: JSON.parse(
            Scraper.CreateJsonPages(last_page, page_current)
          ),
        }),
      };

      if (page_current <= last_page) {
        bot
          .sendMessage(chatID, "Vuoi cambiare pagina?", pagine)
          .then(function (res) {
            bot.on(
              "callback_query",
              function onCallbackQueryPages(callbackQuery2) {
                page_current = callbackQuery2.data;
                //remove event listener category callback
                bot.removeListener("callback_query");
                initScraping(chatID);
              }
            );
          });
      }
    });
  });
}

/*  OOP version  */
bot.onText(/\/cerca/, (msg, match) => {
  bot.sendMessage(msg.chat.id, "Dimmi cosa cerchi").then(function () {
    answerCallbacks[msg.chat.id] = function (answer) {
      query = answer.text;

      let options = {
        reply_markup: JSON.stringify({
          inline_keyboard: JSON.parse(Scraper.CreateJsonOption()),
        }),
      };

      bot
        .sendMessage(msg.chat.id, "Scegli una di queste categorie:", options)
        .then(function (res) {
          //funzione core
          SetCategory(msg.chat.id);
        });
    };
  });
});
