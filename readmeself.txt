to update/start/restart/stop lizzie now using the 'forever' application:
run lizzie persistently with 'forever start app.js'
and stop it with 'forever stop app.js'
to update the repo, i just run 'git pull' from within the folder



how i set up the server:
on digital ocean, i made a Droplet to create a server with public ip 165.227.194.91
i made a ssh key with puttygen, public key: ecdsa-sha2-nistp256 AAAAE2VjZHNhLXNoYTItbmlzdHAyNTYAAAAIbmlzdHAyNTYAAABBBMFTr6UMoABpvcS5wUTlif+kiwkI869m1DgIgTeZStSPAA5/RAexvbs+Z6CcwRFG3xdMJC4gcHMUoXjZDAjnMf0= ecdsa-key-20250217
private key is in a .ppk file somewhere, maybe /Documents
i ssh in as the root user using a saved profile in PuTTy (lizzie)
on the server, i first downloaded the zearth zip
but later removed that and used 'git clone [url]'
i tried using filezilla to get the node_modules, but ran into a display problem?
patrick said to use 'npm install' within the folder to utilize the package.json to auto download the dependencies
(i think i installed node on my own, forget how exactly)
then i had to recreate the .env file using the discord bot's secret token
then it worked, but i needed it to stay running forever
patrick told me about 'forever'
i 'apt install forever -g' i think (first i accidentally did 'forever-monitor' and that had issues)



if using power shell on windows:
fnm env --use-on-cd | Out-String | Invoke-Expression
or whatever so it can find 'node' in the path




the below is no longer necessary:
run ngrok.exe and open tunnel 
ngrok http 3000 
(this can be set in the .env variable for port i guess)
this creates a new endpoint which has to be updated in the Discord developer portal app endpoint, annoying

to update slash commands for the bot,
npm run register 
then restart Discord