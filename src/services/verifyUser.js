import axios from 'axios'

async function verifyUser(username, password) {
  // Jika VERIFY_API_URL tidak di-set → log warning dan return false
  if (!process.env.VERIFY_API_URL) {
    console.warn('[VerifyAPI] VERIFY_API_URL not set, skipping external verify')
    return false
  }

  console.log(`[VerifyAPI] Checking user: ${username}`)

  try {
    const res = await axios.post(process.env.VERIFY_API_URL, { username, password }, { timeout: 10000 })
    // HTTP 2xx = valid
    return res.status >= 200 && res.status < 300
  } catch (err) {
    if (err.response && (err.response.status === 401 || err.response.status === 403)) {
      return false
    }
    throw err
  }
}

export { verifyUser }
