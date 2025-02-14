power shell:
fnm env --use-on-cd | Out-String | Invoke-Expression
or whatever so it can find 'node' in the path

run ngrok.exe and open tunnel 
ngrok http 3000 
(this can be set in the .env variable for port i guess)
this creates a new endpoint which has to be updated in the Discord developer portal app endpoint, annoying

to update slash commands for the bot,
npm run register 
then restart Discord