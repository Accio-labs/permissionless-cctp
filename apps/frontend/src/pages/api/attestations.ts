import type { NextApiRequest, NextApiResponse } from "next";
import Axios from "axios";
import web3 from "web3";

type Query = {
  query: string;
  variables: string;
};

type QueryResponse = {
  data: {
    messageSents: [
      {
        message: string;
      }
    ];
  };
};

const CCTP_API_ENDPOINT_TESTNET =
  "https://iris-api-sandbox.circle.com/v1/attestations/";
// TODO: distinguish between testnet vs mainnet
const CCTP_API_ENDPOINT_MAINNET =
  "https://iris-api.circle.com/v1/attestations/";

const CCTP_API_STATUS_COMPLETE = "complete";

const axios = Axios.create();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { data, sender } = req.body;
    console.log("data:", data);
    console.log("sender:", sender);

    const nonce = extractNonceFromMessage(data);
    const cctpMsg = await executeGraphQLQuery(nonce);
    console.log("cctpMsg:", cctpMsg);
    const cctpMsgHash = web3.utils.keccak256(cctpMsg);
    console.log("cctpMsgHash:", cctpMsgHash);
    return await axios
      .get(CCTP_API_ENDPOINT_TESTNET + cctpMsgHash)
      .then((response) => {
        console.log("cctp response:", response.data);
        if (response.data.status == CCTP_API_STATUS_COMPLETE) {
          return res.json(response.data.attestation);
        } else {
          return res.status(404).json(response.data);
        }
      })
      .catch((error) => {
        console.log("error:", error);
        return res.status(error?.response.status).send(error?.data?.error);
      });
  } else {
    return res.status(404).send("Invalid method");
  }
}

const extractNonceFromMessage = (msg: string) => {
  console.log("msg:", msg);
  const nonce = msg.substring(240, 240 + 8 * 2); // 240 is offset to nonce
  console.log("nonce:", nonce);
  return nonce.toLocaleLowerCase();
};

const executeGraphQLQuery = async (nonce: string) => {
  const options = {
    method: "POST",
    url: "https://api.studio.thegraph.com/query/49312/cctp/version/latest",
    headers: {
      "content-type": "application/json",
    },
    data: {
      query: `query GetMessageSentsByNonce($nonce: String!) {
        messageSents(where: {nonce: $nonce}) {
          id
          nonce
          message
          transactionHash
        }
      }`,
      variables: {
        nonce: nonce,
      },
    },
  };

  let cctpMsg = "";
  await axios
    .request(options)
    .then(function (response) {
      const res = response.data; // Response received from the API
      console.log("res:", res);
      cctpMsg = res.data.messageSents[0].message;
    })
    .catch(function (error) {
      console.error(error);
    });

  return cctpMsg;
};
