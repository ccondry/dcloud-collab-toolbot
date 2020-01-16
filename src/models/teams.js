const request = require('request-promise-native')
const db = require('./db')

module.exports = {
  handleWebhook,
  handleMessage,
  getSenderInfo,
  sendMessage
}

const session = {
  // delete dcloud session
  async delete (personEmail, words, i) {
    // authorize
    if (!isAuthorized(personEmail, 'session.delete')) {
      return `Failed to run command to delete dCloud session - ${personEmail} is not authorized to perform this action.`
    } else {
      // continue
      const datacenter = words[i + 2].toUpperCase()
      const id = words[i + 3]
      console.log(`collab-toolbot received command from ${personEmail} to delete dCloud session info for ${datacenter} ${id}`)
      // set up mongo query
      const query = {
        id,
        datacenter
      }
      try {
        // remove from cloud mongo
        const results = await db.removeOne('dcloud', 'session', query)
        if (results.deletedCount === 1) {
          // success
          console.log(`collab-toolbot found and deleted dCloud session info for '${datacenter} ${id}'.`)
          // respond in Teams
          return `Successfully deleted dCloud session info for **${datacenter}** **${id}**.`
        } else {
          // didn't find matching session
          console.log(`collab-toolbot didn't find a dCloud session matching '${datacenter} ${id}' to delete.`)
          return `Failed to delete dCloud session info for **${datacenter}** **${id}** - not found.`
        }
      } catch (e) {
        // failed db connection?
        console.log(`collab-toolbot failed database query to delete dCloud session '${datacenter} ${id}':`, e.message)
        return `Error deleting dCloud session info for **${datacenter}** **${id}**: ${e.message}`
      }
    }
  },
  async get (personEmail, words, i) {
    // authorize
    if (!isAuthorized(personEmail, 'session.get')) {
      return `Failed to run command to get dCloud session - ${personEmail} is not authorized to perform this action.`
    } else {
      // continue
      const datacenter = words[i + 2].toUpperCase()
      const id = words[i + 3]
      console.log(`collab-toolbot received command from ${personEmail} to delete dCloud session info for ${datacenter} ${id}`)
      // set up mongo query
      const query = {
        id,
        datacenter
      }
      try {
        // get from cloud mongo
        const results = await db.find('dcloud', 'session', query)
        if (results) {
          // found
          console.log(`collab-toolbot found dCloud session info for '${datacenter} ${id}'.`)
          // trim results
          const smallResults = {
            datacenter: results.datacenter,
            id: results.id,
            demo: results.demo,
            version: results.version,
            instant: results.instant,
            owner: results.owner,
            status: results.status,
            anycpwd: results.anycpwd
          }
          // add DID
          try {
            smallResults.did1 = results.dids.did.find(v => v.name === 'DID1').number
          } catch (e) {
            console.log('collab-toolbot failed to find DID1 for', datacenter, id)
          }
          // add public IP
          try {
            smallResults.publicIp = results.translations.translation.find(v => v.inside === '198.18.135.68').outside
          } catch (e) {
            console.log('collab-toolbot failed to find public IP for', '198.18.135.68', 'in', datacenter, id)
          }
          if (results.instant) {
            // instant demo = true
            // add instant demo VPN public IP
            try {
              smallResults.vpnPublicIp = results.translations.translation.find(v => v.inside === '198.18.133.254').outside
            } catch (e) {
              console.log('collab-toolbot failed to find public IP for', '198.18.133.254', 'in', datacenter, id)
            }
          }
          // respond in Teams with formatted JSON code
          return '```json\n' + JSON.stringify(smallResults, null, 2) + '\n```'
        } else {
          // didn't find matching session
          console.log(`collab-toolbot didn't find a dCloud session matching '${datacenter} ${id}'.`)
          return `Failed to delete dCloud session info for **${datacenter}** **${id}** - not found.`
        }
      } catch (e) {
        // failed db connection?
        console.log(`collab-toolbot failed database query to get dCloud session '${datacenter} ${id}':`, e.message)
        return `Error finding dCloud session info for **${datacenter}** **${id}**: ${e.message}`
      }
    }
  }
}

// handle incoming Spark webhooks - retrieve the message and pass info
// to the handleMessage function
async function handleWebhook(body) {
  // console.log('collab-toolbot - handleWebhook:', body)
  // ignore messages that we sent
  if (body.actorId === body.createdBy) {
    // console.log('Webex Teams message from self. ignoring.')
    return
  }

  const roomType = body.data.roomType
  const messageId = body.data.id
  try {
    // go retrieve the message details
    const response = await request({
      method: 'GET',
      url: `https://api.ciscospark.com/v1/messages/${messageId}`,
      headers: {
        'Authorization': `Bearer ${process.env.WEBEX_BOT_TOKEN}`
      },
      json: true
    })
    // console.log('teams message response:', response)
    await handleMessage(response)
  } catch (e) {
    console.error('error during Webex Teams handleWebhook', e.message)
  }
}

async function handleMessage({
  id,
  roomId,
  roomType,
  text,
  personId,
  personEmail,
  html,
  files,
  created,
  mentionedPeople
}) {
  // console.log(`collab-toolbot message received from Webex Teams user ${personEmail}:`, text)
  try {
    // check for command words
    // break message into words
    const words = text.split(' ')
    // var for reply message
    let message
    // check for session commands
    if (words.includes('/session')) {
      // find where we are in the message
      const i = words.indexOf('/session')
      // session commands
      if (['delete', 'remove'].includes(words[i + 1])) {
        // delete session
        message = await session.delete(personEmail, words, i)
      } else if (['find', 'get', 'show', 'display'].includes(words[i + 1])) {
        // get session
        message = await session.get(personEmail, words, i)
      }
      // send reply message
      try {
        await sendMessage({ roomId, toPersonEmail: personEmail, roomType, text: message })
      } catch (e) {
        console.log('collab-toolbot failed to send reply message to Teams:', e.message)
      }
    }
  } catch (e) {
    throw e
  }
  // were there any attachments?
  if (files && files.length) {
    console.log(`collab-toolbot Webex Teams webhook had file attachments - but I'm not prepared to handle those yet.`)
    // process attachments to send to agent
    // files.forEach(file => {
    //   // are we escalated to an eGain agent?
    //   if (session.isEscalated) {
    //     // download the file locally and get a public URL for it
    //     // const attachmentUrl = await saveAttachment(file, app)
    //     // TODO generate a real URL here
    //     const attachmentUrl = 'https://gribgcdrqn.localtunnel.me/api/v1/attachment/123'
    //     // send the file to the agent in eGain
    //     session.egainSession._sendCustomerAttachmentNotification(attachmentUrl, `${session.firstName} ${session.lastName}`)
    //   } else {
    //     console.log(`${session.firstName} ${session.lastName} sent a file attachment.`)
    //     // note that user attached a file
    //     session.addMessage('customer', '(file attachment)')
    //     // just the bot here - let user know we can't do anything with them
    //     const m = `I'm sorry, but I can't handle file attachments. If you would like to speak to an agent, say 'agent'.`
    //     // add message
    //     session.addMessage('bot', m)
    //   }
    // })
  }
}

// Get the sender info from FB
async function getSenderInfo(personId) {
  const options = {
    headers: {
      'Authorization': `Bearer ${process.env.WEBEX_BOT_TOKEN}`
    }
  }
  return request.get(`https://api.ciscospark.com/v1/people/${personId}`, options)
}

// send facebook message from page to user
async function sendMessage({ toPersonEmail, roomId, text, roomType }) {
  if (!text || text.length === 0) {
    return console.log(`collab-toolbot - Not sending empty string to Webex Teams.`)
  }
  const url = `https://api.ciscospark.com/v1/messages`
  const body = {
    text,
    markdown: text
  }
  // if it was a group
  if (roomType === 'group') {
    body.roomId = roomId
  } else {
    // direct message
    body.toPersonEmail = toPersonEmail
  }
  try {
    await request({
      method: 'POST',
      url,
      body,
      headers: {
        'Authorization': `Bearer ${process.env.WEBEX_BOT_TOKEN}`
      },
      json: true
    })
  } catch (e) {
    throw e
  }
}

function isAuthorized(personEmail, action) {
  // admins defined in .env are authorized for all actions
  if (process.env.ADMINS.split(',').map(v => v.trim()).includes(personEmail)) {
    return true
  }
  // default to false for all others
  return false
}

