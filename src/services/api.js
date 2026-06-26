// Mock data removed — using real backend now

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export async function fetchInitialDocuments() {
  return [];
}

export async function fetchInitialMessages() {
  return [];
}

export async function sendChatMessage(message) {
  await delay(800);
  return {
    id: Date.now(),
    sender: "bot",
    text: `קיבלתי: "${message}". שירות ה-API האמיתי יחבר כאן.`,
  };
}