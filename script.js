const sendBtn = document.getElementById('sendBtn');
const inputText = document.getElementById('inputText');
const inputFile = document.getElementById('inputFile');
const output = document.getElementById('output');
const themeToggle = document.getElementById('themeToggle');

const OPENROUTER_API_KEY = "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"; // Insert your key here

function isMathPrompt(prompt) {
  const keywords = ["solve", "simplify", "equation", "integral", "derivative", "factor", "calculate"];
  return keywords.some(word => prompt.toLowerCase().includes(word));
}

function wantsSteps(prompt) {
  return prompt.toLowerCase().includes("step by step") || prompt.toLowerCase().includes("explain");
}

async function extractTextFromImage(file) {
  const { data: { text } } = await Tesseract.recognize(file, 'eng');
  return text;
}

async function extractTextFromPDF(file) {
  const buffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: buffer }).promise;
  let allText = "";
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const text = await page.getTextContent();
    allText += text.items.map(item => item.str).join(" ") + "\n";
  }
  return allText;
}

async function readFile(file) {
  if (file.type.startsWith("image/")) {
    return await extractTextFromImage(file);
  } else if (file.type === "application/pdf") {
    return await extractTextFromPDF(file);
  } else {
    return await file.text();
  }
}

async function callOpenRouter(prompt) {
  const model = "openai/gpt-4o-mini";
  const isMath = isMathPrompt(prompt);
  const refinedPrompt = isMath
    ? wantsSteps(prompt)
      ? `Solve step-by-step: ${prompt}`
      : `Solve the problem and provide just the final answer: ${prompt}`
    : `Answer this clearly. If asked for detail, explain. Prompt: ${prompt}`;

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${OPENROUTER_API_KEY}`
    },
    body: JSON.stringify({
      model,
      messages: [{ role: "user", content: refinedPrompt }],
      max_tokens: 512
    })
  });

  const data = await response.json();
  return data.choices[0].message.content;
}

async function handleInput() {
  output.textContent = "Reading input...";
  try {
    let content = inputText.value.trim();
    if (inputFile.files.length > 0) {
      content = await readFile(inputFile.files[0]);
    }

    if (!content) {
      output.textContent = "Please type something or upload a valid file.";
      return;
    }

    output.textContent = "Thinking...";
    const reply = await callOpenRouter(content);
    output.textContent = reply;

    // Clear inputs after response for fresh start
    inputFile.value = "";
    inputText.value = "";

  } catch (err) {
    output.textContent = "❌ Error: " + err.message;
  }
}

// Handle Enter key for sending input
inputText.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    handleInput();
  }
});

// Send button click event
sendBtn.onclick = handleInput;

// Dark mode toggle
themeToggle.onclick = () => {
  document.body.classList.toggle("dark");
};
