const TOKENLIB = require('./tokenlib.js');
const telegrampricebot = require('node-telegram-bot-api');
const dotenv = require('dotenv').config({
  path: './secrets/.env'
});
const BOTTOKEN = process.env.BOTTOKEN;
const bot = new telegrampricebot(BOTTOKEN, { polling: true });
const rmPrice = new TOKENLIB.TokenPrice();  
const stats = new TOKENLIB.TokenStats();

bot.on('message', async (msg) => {
  if (!!msg && !!msg.text && msg.text.startsWith('/price')) {
    const chatId = msg.chat.id;

    const price = await rmPrice.getLatestPrice();
    const pricePer1M = price.multipliedBy(Math.pow(10, 6));
    const burnedTokens = await stats.getBurnedTokens();
    const totalSupply = await stats.getTotalSupply();
    const totalSupplyInT = (totalSupply/Math.pow(10,12));
    const totalCirculation = totalSupply-burnedTokens;
    const burnedTokensInT = (burnedTokens/Math.pow(10,12)).toFixed(1);
    const priceBurnedTokens = stats.getDollarFormatted(price * burnedTokens);
    const totalCirculationInT = (totalCirculation / Math.pow(10,12)).toFixed(1);
    const marketCap =  stats.getDollarFormatted(price * totalCirculation);

    let reply =
`*MY TOKEN*
1M tokens = \$${pricePer1M.toFixed(6)}
💴 *Market Cap*: ${marketCap}
💰 *Circulating Supply*: ${totalCirculationInT}T / ${totalSupplyInT}T
🔥 *Total burned*: ${burnedTokensInT}T / ${priceBurnedTokens}

[Buy](https://myco.in/buy) | [Wallet](https://myco.in/wallet) | [UniRocket](https://myco.in/unirocket) | [BSCScan](https://myco.in/bscscan) | [Website](https://riskmoon.com)
📈 [Charts](https://myco.in/chart): [DexGuru](https://myco.in/dex) | [Bogged](https://myco.in/bog) | [DexT](https://myco.in/dext)
📣 *Social Insights:* [LunarCrush](https://myco.in/insights)
`;

    bot.sendMessage(chatId, reply, { parse_mode: 'Markdown' });
  }
});
