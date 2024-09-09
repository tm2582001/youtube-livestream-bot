const { google } = require("googleapis");

const tokens = require("./credentials/user_token.json");
const youtubeCreds = require("./credentials/youtube_client_secret.json");
const commands = require("./commands.json");

const oauth2Client = new google.auth.OAuth2(
  youtubeCreds.installed.client_id,
  youtubeCreds.installed.client_secret,
  youtubeCreds.installed.redirect_uris
);

oauth2Client.setCredentials(tokens);

const youtube = google.youtube({ version: "v3", auth: oauth2Client });

const COMMAND_TYPES = {
  help: async(broadcast,message)=>{
    let reply = `@${message.authorDetails.displayName} use these commands `
    for(let i =0; i<commands.length; i++){
      const command = commands[i]
      reply += `${i+1}- ${command.identifier}: ${command.description}`;
    }
    await writeChatTextMessage(broadcast,reply)
  }
}


class ReadedChat{
  constructor(){
    this.readedId = new Set();
  }

  add(id){
    this.readedId.add(id)
  }

  isReaded(id){
    return this.readedId.has(id)
  }

}

const readMessages = new ReadedChat();


function requestYoutubeBrodcastList(request) {
  return new Promise((resolve, reject) => {
    youtube.liveBroadcasts.list(request, (err, response) => {
      if (err) return reject(err);

      return resolve(response);
    });
  });
}

function requestYoutubeLiveChat(request) {
  return new Promise((resolve, reject) => {
    youtube.liveChatMessages.list(request, (err, response) => {
      if (err) return reject(err);

      return resolve(response);
    });
  });
}

function sendYoutubeLiveChat(request) {
  return new Promise((resolve, reject) => {
    youtube.liveChatMessages.insert(request, (err, response) => {
      if (err) return reject(err);

      return resolve(response);
    });
  });
}

async function writeChatTextMessage(broadcast, message) {
  const request = {
    part: "snippet",
    resource: {
      snippet: {
        liveChatId: broadcast.snippet.liveChatId,
        type: "textMessageEvent",
        textMessageDetails: {
          messageText: message,
        },
      },
    },
  };

  try {
    const response = await sendYoutubeLiveChat(request);
    
    readMessages.add(response.data.id)
    
    // console.log(JSON.stringify(response.data));
  } catch (err) {
    console.log(JSON.stringify(err), "error");
  }
}


async function runCommand(broadcast, message){
  for(let command of commands){
    
    if(message.snippet.textMessageDetails.messageText === command.identifier){
      // console.log("running commands")
      COMMAND_TYPES[command.type](broadcast,message)
    }
  }
}

async function readChatMessages(broadcast, nextPageToken = "") {
  const request = {
    part: "id, snippet, authorDetails",
    liveChatId: broadcast.snippet.liveChatId,
    PageToken: nextPageToken,
  };

  // console.log(request);

  try {
    const response = await requestYoutubeLiveChat(request);

    // console.log(response.data);
    // console.log(JSON.stringify(response.data.items));

    const messages = response.data.items

    for(let message of messages){

      if(message.offlineAt) return;

      if(readMessages.isReaded(message.id)) continue;
      
      // console.log(message, "here")
      runCommand(broadcast, message);

      readMessages.add(message.id)

    }


    setTimeout(() => {
      readChatMessages(broadcast, response.data.nextPageToken);
    }, response.data.pollingIntervalMillis);
  } catch (err) {
    console.log(err);
  }
}

async function getBroadcastList() {
  console.log("searching broadcasts");
  const request = {
    part: "id, snippet, contentDetails, status",
    broadcastStatus: "active",
  };

  try {
    const response = await requestYoutubeBrodcastList(request);
    // console.log(response.data.items);

    if (!response.data.items.length) {
      setTimeout(() => {
        getBroadcastList();
      }, 3000);
    } else {
      const broadcasts = response.data.items;
      for (let broadcast of broadcasts) {
        console.log(
          `${broadcast.snippet.channelId} is livestreaming about ${broadcast.snippet.title} at ${broadcast.snippet.liveChatId}`
        );

        await writeChatTextMessage(
          broadcast,
          "This stream is powered by unnamed bot created by @TSR PlayZ please type help to get all the commands"
        );

        readChatMessages(broadcast);
      }
    }
  } catch (err) {
    console.log(err);
  }
}

(() => {
  getBroadcastList();
})();
