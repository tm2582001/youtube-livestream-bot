const {authenticate} = require('@google-cloud/local-auth');
const fs = require("fs/promises");

async function quickstart() {
  const localAuth = await authenticate({
    scopes: [
      "https://www.googleapis.com/auth/youtube.readonly",
      "https://www.googleapis.com/auth/youtube",
      "https://www.googleapis.com/auth/youtube.force-ssl"
    ],
    keyfilePath: './credentials/youtube_client_secret.json',
  });
  console.log('Tokens:', localAuth.credentials);

  await fs.writeFile("./credentials/user_token.json",JSON.stringify(localAuth.credentials, null, 2))
}
quickstart();
