import { OAuthCallbackResponse } from "@koe/core";
import { FastifyReply } from "fastify";

export const renderOAuthResultPage = (
  payload: unknown,
  clientOrigin: string
): string => {
  const escapeJsonForHtml = (value: unknown) =>
    JSON.stringify(value)
      .replace(/</g, "\\u003c")
      .replace(/>/g, "\\u003e")
      .replace(/&/g, "\\u0026")
      .replace(/\u2028/g, "\\u2028")
      .replace(/\u2029/g, "\\u2029");

  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>koe auth</title></head>
<body>
<script id="koe-oauth-result" type="application/json">${escapeJsonForHtml(
    payload
  )}</script>
<script>
  (function () {
    var result = document.getElementById("koe-oauth-result");
    var payload = JSON.parse(result.textContent);
    var origin = ${escapeJsonForHtml(clientOrigin)};
    var target = window.opener || window.parent;
    if (target) {
      target.postMessage(payload, origin);
    }
    window.close();
  })();
</script>
</body>
</html>`;
};

export const renderOAuthSuccessPage = (
  payload: OAuthCallbackResponse,
  clientOrigin: string
) => {
  return renderOAuthResultPage(
    { type: "koe:oauth:success", ...payload },
    clientOrigin
  );
};

export const renderOAuthErrorPage = (
  message: string,
  status: number,
  clientOrigin: string
) => {
  return renderOAuthResultPage(
    {
      type: "koe:oauth:error",
      error: { status, message },
    },
    clientOrigin
  );
};

export const sendOAuthErrorPage = (
  reply: FastifyReply,
  message: string,
  clientOrigin: string,
  status = 400
) => {
  return reply
    .status(status)
    .type("text/html")
    .send(renderOAuthErrorPage(message, status, clientOrigin));
};