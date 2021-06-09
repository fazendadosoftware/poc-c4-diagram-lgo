const { LEANIX_INSTANCE: instance = null, LEANIX_APITOKEN: apiToken = null } = process.env
if (!instance || !apiToken) throw Error('invalid credentials')

const jsdom = require('jsdom')
const { JSDOM } = jsdom
const dom = new JSDOM()

global.window = dom.window
global.document = window.document
global.XMLSerializer = window.XMLSerializer
global.navigator = window.navigator

const mxgraph = require('mxgraph')()
const { mxGraph, mxCodec, mxUtils, mxCircleLayout } = mxgraph

const fetch = require('node-fetch')
const jwtDecode = require('jwt-decode')

const getAccessToken = async () => {
  const base64ApiToken = Buffer.from(`apitoken:${apiToken}`).toString('base64')
  const options = {
    method: 'POST',
    headers: {
      Authorization: `Basic ${base64ApiToken}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: Object.entries({ grant_type: 'client_credentials' }).map(([key, value]) => `${key}=${value}`).join('&')
  }
  const response = await fetch(`https://${instance}/services/mtm/v1/oauth2/token`, options)
  const { status } = response
  const body = await response.json()
  if (status === 200) {
    const { access_token: accessToken } = body
    return accessToken
  } else {
    throw Error(`${JSON.stringify(body)}`)
  }
}

const fetchBookmarks = async (accessToken = null) => {
  if (accessToken === null) throw Error('not authenticated')
  const { instanceUrl } = jwtDecode(accessToken)
  const url = `${instanceUrl}/services/pathfinder/v1/bookmarks?bookmarkType=VISUALIZER&groupKey=freedraw`
  const response = await fetch(url, { method: 'GET', headers: { Authorization: `Bearer ${accessToken}` } })
  const { ok, status } = response
  if (ok) {
    const { data: bookmarks } = await response.json()
    return bookmarks
  }
  throw Error(`${status} while fetching bookmarks`)
}

const upsertBookmark = async (context, accessToken = null, id = null, name, graphXml) => {
  if (accessToken === null) throw Error('not authenticated')
  const description = ''
  const { instanceUrl } = jwtDecode(accessToken)
  const url = `${instanceUrl}/services/pathfinder/v1/bookmarks${id !== null ? `/${id}` : ''}`
  const method = id === null ? 'POST' : 'PUT'
  const bookmark = { groupKey: 'freedraw', description, name, type: 'VISUALIZER', state: { graphXml } }
  if (id !== null) bookmark.id = id

  const response = await fetch(
    url, {
      method,
      body: JSON.stringify(bookmark),
      headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' }
    }
  )
  if (response.ok) {
    const { data: bookmark } = await response.json()
    return bookmark
  }
  const error = await response.json()
  context.log(error)
  throw Error(`error while creating bookmark: ${error.errorMessage}`)
}

const extractGraph = body => {
  const {
    ApplicationID: applicationId,
    UUID: id = null,
    ApplicationName: name = null,
    Applications: relatedApplications = [],
    UserGroups: relatedUserGroups = []
  } = body
  const vertexes = [{ id, name, type: 'Application' }]
  const edges = []
  relatedApplications
    .forEach(({ UUID: factSheetId, FactsheetType: type, FactSheetName: name, ConnectionType: direction, ConnectionDescription: description }) => {
      vertexes.push({ id: factSheetId, name, type })
      const [source, target] = direction === 'Outbound' ? [id, factSheetId] : [factSheetId, id]
      edges.push({ source, target, description })
    })
  relatedUserGroups
    .forEach(({ UUID: factSheetId, FactsheetType: type, FactSheetName: name, ConnectionType: direction, ConnectionDescription: description }) => {
      vertexes.push({ id: factSheetId, name, type })
      const [source, target] = direction === 'Outbound' ? [id, factSheetId] : [factSheetId, id]
      edges.push({ source, target, description })
    })
  return { applicationId, vertexes, edges }
}

// https://github.com/jgraph/mxgraph-js/tree/master/javascript/examples
const processBody = (context, body) => {
  const { applicationId, vertexes, edges } = extractGraph(body)
  const graph = new mxGraph()

  const layout = new mxCircleLayout(graph)
  layout.radius = 140

  const w = 140
  const h = 60

  const vertexIndex = {}

  const parent = graph.getDefaultParent()

  graph.getModel().beginUpdate()
  try {
    vertexes
      .forEach(({ id, name, type }) => {
        const vertex = graph.insertVertex(parent, null, name, 0, 0, w, h, 'whiteSpace=wrap;')
        vertexIndex[id] = vertex
      })
    edges
      .forEach(({ source, target, description }) => {
        const v1 = vertexIndex[source]
        const v2 = vertexIndex[target]
        graph.insertEdge(parent, null, description, v1, v2, 'whiteSpace=wrap;')
      })
    layout.execute(parent)
  } finally {
    graph.getModel().endUpdate()
  }
  const encoder = new mxCodec()
  const result = encoder.encode(graph.getModel())
  const xml = mxUtils.getXml(result)
  return { applicationId, xml }
}

module.exports = {
  processBody,
  getAccessToken,
  fetchBookmarks,
  upsertBookmark
}
