const auth = require('basic-auth')
const { getAccessToken, upsertBookmark, processBody, fetchBookmarks } = require('./businessLogic')
const { LEANIX_USERNAME: username = null, LEANIX_PASSWORD: password = null } = process.env

let requests = 0

module.exports = async function (context, req) {
  requests++
  if (username === null || password === null) context.warn('APP Settings "LEANIX_USERNAME" and "LEANIX_PASSWORD" should be set for basic auth of POST requests')
  const { method, headers, body } = req
  const { 'content-type': contentType = null, 'x-forwarded-for': forwardedFor } = headers
  if (username !== null && password !== null) {
    const { name: providedUsername = null, pass: providedPassword = null } = auth(req) || {}
      if (providedUsername !== username || providedPassword !== password) {
      context.res = { status: 403, body: 'invalid credentials' }
      context.error(new Date().toISOString(), '403 Forbidden', forwardedFor)
      return
    }
  }
  if (method === 'POST') {
    if (contentType !== 'application/json') {
      context.res = { status: 415, body: `invalid content-type ${contentType}` }
      return
    }
    try {
      const { applicationId, xml } = processBody(context, body)
      const accessToken = await getAccessToken()
      const bookmarks = await fetchBookmarks(accessToken)
      const { id = null } = bookmarks.find(({ name }) => name === applicationId) || {}
      const bookmark = await upsertBookmark(context, accessToken, id, applicationId, xml)
      context.res = {
        status: 200,
        body: bookmark,
        headers: { 'content-type': 'application/json' }
      }
    } catch (error) {
      context.res = {
        status: 400,
        body: error.message || 'an error occurred'
      }
    }
  }
  context.res = {
    body: `${new Date().toISOString()} ===> #${requests}: `
  }
}
