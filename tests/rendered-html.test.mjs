import assert from "node:assert/strict";
import test from "node:test";

async function render() {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request("http://localhost/", {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Kessel-Krawall main menu before the game", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /<title>Kessel-Krawall<\/title>/i);
  assert.match(html, /Kessel/);
  assert.match(html, /Krawall/);
  assert.match(html, /KESSELKABINETT ÖFFNEN/);
  assert.match(html, /Ton aktivieren/);
  assert.match(html, /Was ist die Kampagne/);
  assert.match(html, /Siegel &amp; Niederlagen/);
  assert.match(html, /2 KAMPAGNEN/);
  assert.doesNotMatch(html, /HEXENMARKT|KAMPF STARTEN/);
  assert.doesNotMatch(html, /codex-preview|react-loading-skeleton/i);
});
