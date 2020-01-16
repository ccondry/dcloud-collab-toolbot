const request = require('request-promise-native')
const db = require('./db')

module.exports = {
  handleWebhook,
  handleMessage,
  getSenderInfo,
  sendMessage
}

// handle incoming Spark webhooks - retrieve the message and pass info
// to the handleMessage function
async function handleWebhook (body) {
  console.log('collab-toolbot - handleWebhook:', body)
  // ignore messages that we sent
  if (body.actorId === body.createdBy) {
    console.log('Webex Teams message from self. ignoring.')
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
    console.log('teams message response:', response)
    await handleMessage(roomType, response)
  } catch (e) {
    console.error('error during Webex Teams handleWebhook', e.message)
  }
}

async function handleMessage (roomType, {
  text,
  personEmail,
  personId,
  roomId,
  files,
}) {
  console.log(`collab-toolbot message received from Webex Teams user ${personEmail}:`, text)

  // check for command words
  // break message into words
  const words = text.split(' ')
  // remove the @metion
  if (words.includes('/session')) {
    const i = words.indexOf('/session')
    // session commands
    if (words[i+1] === 'delete' || words[i+1] === 'remove') {
      const datacenter = words[i+2].toUpperCase()
      const id = words[i+3]
      console.log(`collab-toolbot received command from ${personEmail} to delete dCloud session info for ${datacenter} ${id}`)
      // set up mongo query
      const query = {
        id,
        datacenter
      }
      let message
      try {
        // remove from cloud mongo
        const results = await db.removeOne('dcloud', 'session', query)
        if (results.deletedCount === 1) {
          // success
          console.log(`collab-toolbot found and deleted dCloud session info for '${datacenter} ${id}'.`)
          // respond in Teams
          message = `Successfully deleted dCloud session info for **${datacenter}** **${id}.`
        } else {
          // didn't find matching session
          console.log(`collab-toolbot didn't find a dCloud session matching '${datacenter} ${id}' to delete.`)
          message = `Failed to delete dCloud session info for **${datacenter}** **${id} - not found.`
        }
      } catch (e) {
        // failed db connection?
        console.log(`collab-toolbot failed database query to delete dCloud session '${datacenter} ${id}':`, e.message)
        message = `Error deleting dCloud session info for **${datacenter}** **${id}: ${e.message}`
      }
      // send reply message
      try {
        await sendMessage({roomId, toPersonEmail: personEmail, roomType, text: message})
      } catch (e) {
        console.log('failed to send reply message to Teams:', e.message)
      }
    }
  }
  // were there any attachments?
  if (files && files.length) {
    console.log(`Webex Teams webhook had file attachments - but I'm not prepared to handle those yet.`)
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
async function sendMessage({toPersonEmail, roomId, text, roomType}) {
  if (!text || text.length === 0) {
    return console.log(`Not sending empty string to Webex Teams.`)
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
