import { fetchAPI } from "./client.js";

export async function sendChatMessage(model, messages, signal) {
    return fetchAPI("chat", {
        method: "POST",
        body: JSON.stringify({ model, messages }),
        signal
    });
}