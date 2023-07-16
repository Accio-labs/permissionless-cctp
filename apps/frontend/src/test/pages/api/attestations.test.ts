import { createMocks } from 'node-mocks-http';
import handler from '../../../pages/api/attestations';

describe('attestations', () => {
  it('should return the expected response', async () => {
    // Create mock request and response objects
    const { req, res } = createMocks({
      method: 'POST',
      query: {
        "data": "00000068BA000000050000000000000000000000009BF4AA106A74F5661500BD58499C6360F53508200000A86900000000000000000000000099E8AB1779B7BD9F96A9719A6178CF7E3C65BF010000000000000000000000005A616C69759B225964E391500798E5B2999683950000000000000000000000000000000000000000000000000000000000002710000000000000000000000000421ED2FB212ED93BC8E16538B0C870D2BD01791C000000000000000000000000000000000000000000000000000000000003913e00000000000000000000000000000000000000000000000000000000000000A000000000000000000000000000000000000000000000000000000000000000045553444300000000000000000000000000000000000000000000000000000000",
        "sender": "0x57f91E50cD281B1C3891C70629818c2Ce3fa5f5e"
      },
    });

    // Call the API route handler
    await handler(req, res);

    // Assert the response
    expect(res._getStatusCode()).toBe(200); // Ensure the response status code is 200
    expect(JSON.parse(res._getData())).toEqual({ message: 'Hello, world!' }); // Ensure the response body is as expected
  });
});
