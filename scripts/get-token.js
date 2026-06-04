const { google } = require('googleapis')
const readline = require('readline')

const CLIENT_ID = process.env.GOOGLE_CLIENT_ID
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET
const REDIRECT_URI = 'http://localhost:3000/api/auth/callback'

const oauth2Client = new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT_URI)

const authUrl = oauth2Client.generateAuthUrl({
  access_type: 'offline',
  prompt: 'consent',
  scope: [
    'https://www.googleapis.com/auth/calendar.readonly',
    'https://www.googleapis.com/auth/gmail.send',
  ],
})

console.log('\n以下のURLをブラウザで開いてください:\n')
console.log(authUrl)
console.log('\n認証後に表示されるコードを貼り付けてください:\n')

const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
rl.question('コード: ', async (code) => {
  const { tokens } = await oauth2Client.getToken(code)
  console.log('\nGOOGLE_REFRESH_TOKEN=' + tokens.refresh_token)
  rl.close()
})
