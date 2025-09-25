const assert = require('assert');

describe('node-red-contrib-triggercmd registration', function () {
  it('registers nodes without throwing', function () {
    const registered = {};
    const routes = [];

    const RED = {
      nodes: {
        registerType(name, ctor, opts) { registered[name] = { ctor, opts }; },
        getNode() { return null; },
        createNode() { /* no-op for tests */ }
      },
      httpAdmin: {
        get(path, handler) { routes.push({ path, handler }); }
      }
    };

    // Load modules
    require('../triggercmd.js')(RED);
    require('../triggercmd-config.js')(RED);

    // Assertions: nodes were registered
    assert.ok(registered['triggercmd out'], 'triggercmd out should be registered');
    // The separate 'triggercmd list' node has been removed; listing is handled in the editor
    assert.ok(registered['triggercmd-config'], 'triggercmd-config should be registered');

    // Config node should declare credentials
    const cfg = registered['triggercmd-config'];
    assert.ok(cfg.opts && cfg.opts.credentials && cfg.opts.credentials.token,
      'triggercmd-config should define token credentials');
    assert.strictEqual(cfg.opts.credentials.token.type, 'password');

    // Admin route should be registered
    const route = routes.find(r => String(r.path).includes('/triggercmd/')); 
    assert.ok(route, 'admin list route should be registered');
  });
});
