import fs from "fs";

import { HfInference } from "@huggingface/inference";
import { nylasClient } from "../constants/nylas.js";
import { promisify } from "util";
import stream from "stream";
const pipeline = promisify(stream.pipeline);
const HfInferenceClient = new HfInference(process.env.HF_TOKEN);
import path from "path";
import pdf from "html-pdf-node";
const getGrantId = async (Email) => {
  const filePath = "data.json";
  try {
    let fileContent = fs.existsSync(filePath)
      ? fs.readFileSync(filePath, "utf8")
      : "[]";

    let dataArray = JSON.parse(fileContent);

    if (!Array.isArray(dataArray)) {
      throw new Error("The file does not contain a valid JSON array.");
    }

    const user = dataArray.find((item) => item.email == Email);
    const grantId = user.grantId;
    return grantId;
  } catch (error) {
    console.error(`${error}`.red);
  }
};
// Classify Emails using Hugging Face Inference
const classifyEmails = async (messages) => {
  const filteredMessages = [];

  for (const message of messages.data) {
    const response = await HfInferenceClient.chatCompletion({
      model: "microsoft/Phi-3-mini-4k-instruct",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that classifies emails related to insurance.",
        },
        {
          role: "user",
          content: `Only respond 'Yes' if the email specifically pertains to financial or general insurance services, policies, claims, or inquiries. 
          Be strict: respond 'No' if the email is promotional, unrelated, or ambiguous. 
          Subject: '${message.subject}'. Body snippet: '${message.snippet}'. Respond with 'Yes' or 'No'.`
        },
      ],
    });

    const classification = response.choices[0].message.content.trim().toLowerCase();
    console.log(`Classification result for '${message.subject}': ${classification}`);

    if (classification === "yes") {
      filteredMessages.push(message);
    }
  }

  return filteredMessages;
};

// Save Attachments to Disk
const saveAttachments = async (message, outputDir) => {
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  for (const attachment of message.attachments) {
    try {
      console.log(`Saving attachment: ${attachment.filename} (${attachment.size} bytes)`);
      const attachmentStream = await nylasClient.attachments.download({
        identifier: attachment.grantId,
        attachmentId: attachment.id,
        queryParams: {
          messageId: message.id,
        },
      });

      const filePath = path.join(outputDir, attachment.filename);

      await pipeline(attachmentStream, fs.createWriteStream(filePath));

      console.log(`Attachment saved at: ${filePath}`);
    } catch (error) {
      console.error(`Failed to save attachment ${attachment.filename}:`, error.message);
    }
  }
};

// Generate PDFs for Emails without Attachments
const generatePdfForEmail = async (message, outputDir, index) => {
  const sanitizedSubject = message.subject.replace(/[^a-zA-Z0-9]/g, "_");
  const filePath = path.join(outputDir, `Email_${index + 1}_${sanitizedSubject}.pdf`);

  const emailDate = new Date(message.date * 1000).toLocaleString();
  const emailHTML = `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
        h1 { color: #333; }
        .email-header { margin-bottom: 10px; }
      </style>
    </head>
    <body>
      <div class="email-header">
        <p><strong>Subject:</strong> ${message.subject}</p>
        <p><strong>From:</strong> ${message.from[0]?.email}</p>
        <p><strong>Date:</strong> ${emailDate}</p>
      </div>
      <div>${message.body}</div>
    </body>
    </html>
  `;

  try {
    const options = { format: "A4" };
    const pdfBuffer = await pdf.generatePdf({ content: emailHTML }, options);
    fs.writeFileSync(filePath, pdfBuffer);
    console.log(`PDF saved: ${filePath}`);
  } catch (error) {
    console.error(`Failed to generate PDF for ${message.subject}:`, error.message);
  }
};

// Process Emails
const processEmails = async (messages) => {
  const outputDirs = {
    attachments: "Attachments",
    pdfs: "FilteredEmails",
  };

  if (!fs.existsSync(outputDirs.attachments)) fs.mkdirSync(outputDirs.attachments);
  if (!fs.existsSync(outputDirs.pdfs)) fs.mkdirSync(outputDirs.pdfs);
  await Promise.all(
    messages.map(async (message, index) => {
      if (message.attachments && message.attachments.length > 0) {
        await saveAttachments(message, outputDirs.attachments);
      } else {
        await generatePdfForEmail(message, outputDirs.pdfs, index);
      }
    })
  );
};

export { getGrantId ,classifyEmails,processEmails };
