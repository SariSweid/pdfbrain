import { initialDocuments, initialMessages } from "../data/mockData";

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchInitialDocuments() {
  await delay(400);
  return initialDocuments;
}

export async function fetchInitialMessages() {
  await delay(400);
  return initialMessages;
}

export async function sendChatMessage(message) {
  await delay(800);

  return {
    id: Date.now(),
    sender: "bot",
    text: `I reviewed your question about "${message}". PDFBrain is checking the uploaded academic papers and preparing a short answer with relevant context.`,
  };
}
