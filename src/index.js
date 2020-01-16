// load .env vars into process.env
require('dotenv').config()

// Node includes
const express = require('express')
const bodyParser = require('body-parser')
const cors = require('cors')
const pkg = require('../package.json')
const teamsLogger = require('./models/teams-logger')

// init express
const app = express()
// accept JSON body
app.use(bodyParser.json())
// accept URL-encoded body
app.use(bodyParser.urlencoded({ extended: true }))
// apply CORS
app.use(cors())

// Cisco Webex Teams webhooks
app.use('/api/v1/webhook', require('./routes/teams'))

// listen on port defined in .env
const server = app.listen(process.env.PORT || 3020, () => {
  console.log('Express server listening on port %d in %s mode', server.address().port, app.settings.env)
  teamsLogger.log('service started')
})
