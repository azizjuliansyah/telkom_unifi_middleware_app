import axios from 'axios'
import https from 'https'

const agent = new https.Agent({ rejectUnauthorized: false })

async function authorizeGuest(mac) {
  console.log(`[Unifi] Authorizing MAC: ${mac}`)
  const res = await axios.post(
    `${process.env.UNIFI_URL}/proxy/network/api/s/default/cmd/stamgr`,
    { cmd: 'authorize-guest', mac },
    { headers: { 'X-API-KEY': process.env.UNIFI_API_KEY }, httpsAgent: agent, timeout: 15000 }
  )
  return res.data?.meta?.rc === 'ok'
}

export { authorizeGuest }
