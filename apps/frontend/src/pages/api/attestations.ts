import type { NextApiRequest, NextApiResponse } from "next";

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method === 'POST') {
    const { data, sender } = req.body;
    console.log("data:", data);
    console.log("sender:", sender);

    // TODO: parse message from data, hash it, and get attestations for it
    // 'https://iris-api-sandbox.circle.com/attestations/'
  }
}