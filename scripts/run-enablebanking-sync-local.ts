import { handler } from '../src/infrastructure/lambda-enablebanking-sync.js';

const result = await handler({} as any, {} as any, () => {});
console.log('Result:', JSON.stringify(result, null, 2));
