module.exports = function (RED) {
  function TriggercmdConfig(n) {
    RED.nodes.createNode(this, n);
    this.baseUrl = n.baseUrl || "https://www.triggercmd.com";
    this.getHeaders = () => ({
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.credentials?.token || ""}`
    });
  }
  RED.nodes.registerType("triggercmd-config", TriggercmdConfig, {
    credentials: { token: { type: "password" } }
  });
};
