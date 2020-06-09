const Nano = require('nano')
const renderer = require('renderer')
const choirlessAPI = require('choirlessapi')
const fs = require('fs')

// get options from environment variables
const opts = {
  COUCH_URL: process.env.COUCH_URL,
  COUCH_USERS_DATABASE: process.env.COUCH_USERS_DATABASE,
  COUCH_CHOIRLESS_DATABASE: process.env.COUCH_CHOIRLESS_DATABASE,
  COUCH_KEYS_DATABASE: process.env.COUCH_KEYS_DATABASE,
  COUCH_QUEUE_DATABASE: process.env.COUCH_QUEUE_DATABASE,
  COS_ENDPOINT: process.env.COS_ENDPOINT,
  COS_API_KEY: process.env.COS_API_KEY,
  COS_INSTANCE_ID: process.env.COS_INSTANCE_ID,
  COS_BUCKET: process.env.COS_BUCKET
}

// using Nano to connect to
const nano = Nano(opts.COUCH_URL)
const qdb = nano.db.use(opts.COUCH_QUEUE_DATABASE)
const SINCE_FILE = './since.json'
let lastSince = '0'

// load previous 'since' value from file since.json
const loadLastSince = () => {
  if (fs.existsSync(SINCE_FILE)) {
    const str = fs.readFileSync(SINCE_FILE)
    const j = JSON.parse(str)
    lastSince = j.lastSince
  } else {
    lastSince = 'now'
  }
  console.log('resuming from', lastSince)
}

// save lastSince to disk
const saveLastSince = () => {
  const obj = {
    lastSince: lastSince
  }
  fs.writeFileSync(SINCE_FILE, JSON.stringify(obj))
}


// listen to changes feed of the queue database
// - wait=true - wait until we call ...resume() before getting next change
// - includeDocs=true - include document body
// - selector... - we're only interested in status=new documents where type=mixdown
loadLastSince()
const cr = qdb.changesReader.start({ wait: true, since: lastSince, includeDocs: true, selector: { status: 'new', type: 'mixdown' } })
  .on('batch', async (b) => {
    // stash the latest since value
    lastSince = b[0].seq
    saveLastSince()

    // extract the doc
    const doc = b[0].doc
    console.log('changes', doc)

    // set the status to 'inprogress'
    await choirlessAPI.postQueueMixdown({ id: doc._id, status: 'inprogress' })

    // sleep
    const params = {}
    Object.assign(params, opts)
    params.songId = doc.songId
    params.choirId = doc.choirId
    console.log('Mixing down', doc.name, doc.choirId, doc.songId)
    await renderer.main(params)

    // set status to 'complete'
    await choirlessAPI.postQueueMixdown({ id: doc._id, status: 'complete' })

    // allow next change to be fetched
    qdb.changesReader.resume()
  })
