const request = require('request-promise-native')

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
  // if (body.actorId === body.createdBy) {
  //   console.log('Webex Teams message from self. ignoring.')
  //   return
  // }

  const roomType = body.data.roomType
  if (roomType === 'direct') {
    // direct message - go retrieve the message details
    const messageId = body.data.id
    const options = {
      headers: {
        'Authorization': `Bearer ${app.token}`
      }
    }
    try {
      const response = await request.get(`https://api.ciscospark.com/v1/messages/${messageId}`, options)
      console.log('response.data', response.data)
      await handleMessage(response.data)
    } catch (e) {
      console.error('error during Webex Teams handleWebhook', e.message)
    }
  } else {
    console.log(`Webex Teams webhook received, but it was not direct room type. room type = ${roomType}`)
  }
}

async function handleMessage ({text, personEmail, personId, roomId, files}) {
  console.log(`collab-toolbot message received from Webex Teams user ${personEmail}:`, text)

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
function getSenderInfo(personId, token) {
  const options = {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
  return axios.get(`https://api.ciscospark.com/v1/people/${personId}`, options)
}

// send facebook message from page to user
async function sendMessage(toPersonEmail, text, {token}) {
  if (!text || text.length === 0) {
    return console.log(`Not sending empty string to Webex Teams.`)
  }
  const url = `https://api.ciscospark.com/v1/messages`
  const body = {toPersonEmail, text}
  const options = {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  }
  await request.post(url, body, options)
}
