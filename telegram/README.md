Pre-requisites:
- git
- nodejs
- A telegram bot configured, and a token generated (see https://core.telegram.org/bots)

Setup in a nut shell
```
git clone https://github.com/Celebrate-Token/price-bot.git
cd price-bot/telegram
npm install
mkdir secrets
echo BOTTOKEN="YOURSECRETTGTOKENHERE" > ./secrets/.env
node tg.js
```

Note: If you use Linux, I'd recommend running the node script as a "screen" so that the session can be detached and continue running after you logout, etc.
