const sdk = require('api')('@reservoirprotocol/v1.0#cpy2fla8spifn');

const sdk = require('api')('@reservoirprotocol/v1.0#cpy2fla8spifn');

sdk.auth(process.env.RESERVOIR_API_KEY);
sdk.server('https://api-goerli.reservoir.tools');
sdk.postExecuteListV4({
  params: [
    {
      orderKind: 'seaport',
      orderbook: 'reservoir',
      automatedRoyalties: true,
      fees: ['"Test"'],
      currency: '0x0000000000000000000000000000000000000000',
      token: '0x46e663972AfE9D500B0A366CdEb8788e39DF1478',
      quantity: 3,
      weiPrice: '2200000000000000000',
      listingTime: '	1668559911',
      expirationTime: '1669164711'
    },
    {
      orderKind: 'seaport',
      orderbook: 'reservoir',
      automatedRoyalties: true,
      currency: '0x0000000000000000000000000000000000000000'
    }
  ],
  maker: '0xaF609ef0f3b682B5992c7A2Ecc0485afD4816d54',
  source: 'lux.market'
}, {accept: '*/*'})
  .then(({ data }) => console.log(data))
  .catch(err => console.error(err));