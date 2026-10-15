import { handleMathverseHttpRequest } from "../server/mathverseProxy.js";

export default function handler(request, response) {
  return handleMathverseHttpRequest(request, response);
}

