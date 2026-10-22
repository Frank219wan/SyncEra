import { handleProxy } from '../server/proxy.js';

export default {
  fetch(request: Request) { return handleProxy(request); },
};
