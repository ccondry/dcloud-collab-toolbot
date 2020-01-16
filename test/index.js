require('dotenv').config()
const db = require('../src/models/db')
db.removeOne('dcloud', 'session', {
    datacenter: 'RTP',
    id: 'test'
})
.then(results => console.log('deletedCount', results.deletedCount))
.catch(e => console.log('error', e.message))