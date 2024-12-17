import fs from "fs";

import { HfInference} from "@huggingface/inference";
import { nylasClient } from "../constants/nylas.js";
import OpenAIClient from "../constants/OpenAi.js";
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
    const response =await OpenAIClient.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that classifies emails related to insurance.",
        },
        {
          role: "user",
          content: `Only respond 'Yes' if the email specifically pertains to financial or general insurance services, policies, claims, or inquiries. 
          Be strict: respond 'No' if the email is promotional, unrelated, or ambiguous. 
          Subject: '${message.subject}'. Body: '${message.snippet}'. Respond with 'Yes' or 'No'.`
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

const generatePdfFromSummary = async (Summary, outputDir, index,message) => {
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
      <div>
      <p
      style="font-size: 16px; line-height: 1.6; margin: 20px;"
      >

      ${Summary}
      </p>
      </div>
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
        const text = await extractPolicyDetails(message.body);
        await generatePdfFromSummary(text, outputDirs.pdfs, index,message);
      }
    })
  );
};


const summarizeTextFromPdf = async (filePath) => {
  const response = await HfInferenceClient.textGeneration({
    model: "facebook/bart-large-cnn",
    inputs: `Extract text from PDF file: ${filePath}` ,
  });

  const text = response.generated_text;
  console.log(`Extracted text from PDF: ${text}`);
  return text;
}

const summarizeTextFromImage = async (arrayBlob) => {


  const imageText = await HfInferenceClient.imageToText({
    model:'microsoft/layoutlm-base-uncased',
    data:arrayBlob

  });
  

  const response = await HfInferenceClient.textGeneration({
    model: "t5-base",
    inputs: `Extract text from image text: ${imageText.generated_text}` ,
  });


  const text = response.generated_text;
  console.log(`Extracted text from image: ${text}`);
  return text;
}

const summarizeTextFromDocument = async (filePath) => {

 
  const response = await HfInferenceClient.textGeneration({
    model: "t5-base",
    inputs: `Extract text from document file: ${filePath}` ,
  });

  const text = response.generated_text;
  console.log(`Extracted text from document: ${text}`);
  return text;
}


const generateSummaryFromAttachmentStream = async (message, outputDir, index) => {
  for (const attachment of message.attachments) {
    const filePath = path.join(outputDir, attachment.filename);

    const attachmentStream = await nylasClient.attachments.download({
      identifier: attachment.grantId,
      attachmentId: attachment.id,
      queryParams: {
        messageId: message.id,
      },
    });

    await attachmentStream.pipe(fs.createWriteStream(filePath));


    if (attachment.contentType === "application/pdf") {
      const text = await summarizeTextFromPdf(filePath);
      await generatePdfFromSummary(text, outputDir, index);
    } else if (attachment.contentType.startsWith("image/")) {
      const text = await summarizeTextFromImage(filePath);
      await generatePdfFromSummary(text, outputDir, index);
    } else {
      const text = await summarizeTextFromDocument(filePath);
      await generatePdfFromSummary(text, outputDir, index);
    }

  }
}
const extractPolicyDetails = async (text) => {
  const prompt = `
  Extract the following information from the given text and return it in valid JSON format. If any field is not present, use N/A as the value. Extract these fields:
  - name: The name of the policyholder or relevant entity.
  - policy_number: The unique policy identifier.
  - policy_category: The type or category of the policy (e.g., health, life, auto).
  - issuer_name: The organization or issuer of the policy.
  - start_date: The policy's start date.
  - end_date: The policy's end date (if applicable).
  - premium_amount: The amount of the premium (if stated).
  - coverage_amount: The coverage amount provided by the policy.
  - contact_info: Any contact details (phone, email, or address)

  Text: ${text}

  Return only valid JSON Format
  `;

  try {
    const response = await OpenAIClient.chat.completions.create({
      model: "gpt-4o",
      messages:[
        {
          role:'system',
          content: 'You are a helpful assistant that extracts policy details from text.'

        },
        {
          role:'user',
          content: prompt
        }
      ]
    });

    const rawOutput = response.choices[0].message.content;
    const jsonMatch = rawOutput.match(/\{.*\}/s);

    console.log("Raw JSON Output:", rawOutput);
    console.log("Extracted JSON:", jsonMatch[0]);

    if (jsonMatch) {
      const extractedJson = jsonMatch[0].trim();
      console.log("Extracted JSON:", extractedJson);
      try {
        const parsedJson = JSON.parse(extractedJson);
        return JSON.stringify(parsedJson, null, 2);
      } catch (parseError) {
        console.error("Error parsing JSON:", parseError.message);
        return extractedJson;
      }
    } else {
      throw new Error("No valid JSON block found in the response.");
    }
  } catch (error) {
    console.error("Error extracting policy details:", error.message);
    return null;
  }
};






export { getGrantId ,classifyEmails,processEmails };
