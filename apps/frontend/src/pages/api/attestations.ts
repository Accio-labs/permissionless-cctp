import type { NextApiRequest, NextApiResponse } from "next";
import Axios from "axios";
import web3 from "web3";

const CCTP_API_ENDPOINT_TESTNET = 'https://iris-api-sandbox.circle.com/v1/attestations/';
// TODO: distinguish between testnet vs mainnet
const CCTP_API_ENDPOINT_MAINNET = 'https://iris-api.circle.com/v1/attestations/';

const CCTP_API_STATUS_COMPLETE = "complete";

const axios = Axios.create();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const { data, sender } = req.body;
    console.log("data:", data);
    console.log("sender:", sender);

    const msgHash = web3.utils.keccak256(data);
    console.log("msgHash:", msgHash);
    return await axios.get(CCTP_API_ENDPOINT_TESTNET + msgHash)
      .then((response) => {
        console.log("response:", response);
        if (response.data.status == CCTP_API_STATUS_COMPLETE) {
          return res.json(response.data.attestation);
        } else {
          return res.status(404).json(response.data);
        }
      })
      .catch((error) => {
        console.log("error:", error);
        return res.status(error?.response.status).send(error?.data?.error);
      })
  } else {
    return res.status(404).send('Invalid method');
  }
}