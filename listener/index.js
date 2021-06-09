const { getAccessToken, upsertBookmark, processBody, fetchBookmarks } = require('./businessLogic')

module.exports = async function (context, req) {
  const { method, headers, body } = req
  const { 'content-type': contentType = null } = headers
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
}
