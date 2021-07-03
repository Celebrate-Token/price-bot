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
# Update config.json to match your token
node tg.js
```
Notes:

If you receive errors, try turning either ENABLE_PANCAKESWAP_V1 or ENABLE_PANCAKESWAP_V2 to false and re-test. Some Liquity Pools may not apply for you.

If you use Linux, I'd recommend running the node script as a "screen" so that the session can be detached and continue running after you logout, etc.

We are looking at configuring a docker container in the near future..
