import type { NextApiRequest, NextApiResponse } from "next";
import Axios from "axios";
import web3 from "web3";
import graphQLEndpoints from "../../config/graphql_endpoints.json";

const DOMAIN_ETH = 1;
const DOMAIN_GOERLI = 5;
const DOMAIN_AVAX = 43114;
const DOMAIN_FUJI = 43113;
const DOMAIN_ARB = 42161;
const DOMAIN_ARBGOERLI = 421613;
const DOMAIN_OP = 10;
const DOMAIN_OPGOERLI = 420;

const CCTP_API_ENDPOINT_TESTNET =
  "https://iris-api-sandbox.circle.com/v1/attestations/";
const CCTP_API_ENDPOINT_MAINNET =
  "https://iris-api.circle.com/v1/attestations/";
const CCTP_API_STATUS_COMPLETE = "complete";

const OFFSET_TO_NONCE = 156 + 240; // 156 is offset to Hyperlane message body, 240 is offset to nonce in message body
const NONCE_DATA_SIZE = 16;

const axios = Axios.create();

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === "POST") {
    const { data, sender } = req.body;
    console.log("data:", data);
    console.log("sender:", sender);

    const destinationDomain = extractDestinationDomainFromMessage(data);
    console.log("destinationDomain:", destinationDomain);
    let graphQLEndpoint = "";
    let cctpEndpoint = "";
    switch (destinationDomain) {
      case DOMAIN_ETH:
        cctpEndpoint = CCTP_API_ENDPOINT_MAINNET;
        graphQLEndpoint = graphQLEndpoints.eth;
        break;
      case DOMAIN_AVAX:
        cctpEndpoint = CCTP_API_ENDPOINT_MAINNET;
        graphQLEndpoint = graphQLEndpoints.avax;
        break;
      case DOMAIN_ARB:
        cctpEndpoint = CCTP_API_ENDPOINT_MAINNET;
        graphQLEndpoint = graphQLEndpoints.arbitrum;
        break;
      case DOMAIN_OP:
        cctpEndpoint = CCTP_API_ENDPOINT_MAINNET;
        graphQLEndpoint = graphQLEndpoints.optimism;
        break;
      case DOMAIN_GOERLI:
        cctpEndpoint = CCTP_API_ENDPOINT_TESTNET;
        graphQLEndpoint = graphQLEndpoints.goerli;
        break;
      case DOMAIN_FUJI:
        cctpEndpoint = CCTP_API_ENDPOINT_TESTNET;
        graphQLEndpoint = graphQLEndpoints.fuji;
        break;
      case DOMAIN_ARBGOERLI:
        cctpEndpoint = CCTP_API_ENDPOINT_TESTNET;
        graphQLEndpoint = graphQLEndpoints.arbgoerli;
        break;
      case DOMAIN_OPGOERLI:
        cctpEndpoint = CCTP_API_ENDPOINT_TESTNET;
        graphQLEndpoint = graphQLEndpoints.opgoerli;
    }
    const nonce = extractNonceFromMessage(data);
    const cctpMsg = await executeGraphQLQuery(graphQLEndpoint, nonce);
    console.log("cctpMsg:", cctpMsg);
    const cctpMsgHash = web3.utils.keccak256(cctpMsg);
    console.log("cctpMsgHash:", cctpMsgHash);
    return await axios
      .get(cctpEndpoint + cctpMsgHash)
      .then((response) => {
        console.log("cctp response:", response.data);
        if (response.data.status == CCTP_API_STATUS_COMPLETE) {
          return res.json({
            data: cctpMsg + response.data.attestation.substring(2),
          });
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

const extractDestinationDomainFromMessage = (msg: string) => {
  let destinationDomain = msg.substring(12, 20);
  destinationDomain = destinationDomain.replace(/^0+/, "");
  destinationDomain = "0x" + destinationDomain;
  return parseInt(destinationDomain);
};

const extractNonceFromMessage = (msg: string) => {
  console.log("msg:", msg);
  const nonce = msg.substring(OFFSET_TO_NONCE, OFFSET_TO_NONCE + NONCE_DATA_SIZE);
  // example message: 0x000000696600000005000000000000000000000000903C7F403AE2EB194241B0C4C8368D6CC95ABD080000A86900000000000000000000000050D7EADC7F417406310A81A0C3386E257DCF75F400000000000000000000000050D7EADC7F417406310A81A0C3386E257DCF75F4000000000000000000000000000000000000000000000000000000000000271000000000000000000000000
  console.log("nonce:", nonce);
  return nonce.toLocaleLowerCase();
};

const executeGraphQLQuery = async (endpoint: string, nonce: string) => {
  const options = {
    method: "POST",
    url: endpoint,
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
