import { nylasClient } from "../constants/nylas.js";
import { getGrantId } from "../utils/helpers.js";
import { HfInference } from "@huggingface/inference";
import fs from "fs";
import path from "path";
import pdf from "html-pdf-node";

const HfInferenceClient = new HfInference(process.env.HF_TOKEN);


const classifyEmails = async (messages) => {
  const filteredMessages = [];

  for (const message of messages.data) {
    const response = await HfInferenceClient.chatCompletion({
      model:'microsoft/Phi-3-mini-4k-instruct',
      messages: [
        {
          role: "system",
          content: "You are a helpful assistant that classifies emails related to insurance.",
        },
        {
          role: "user",
          content: `Does this email specifically pertain to financial or general insurance services, policies, claims, or inquiries? Subject: '${message.subject}'. Respond with 'Yes' or 'No'.`,
        },
      ],
    })
    console.log(response.choices[0].message.content.trim().toLowerCase());

    if (response.choices[0].message.content.trim().toLowerCase() === "yes") {
      filteredMessages.push(message);
    }
  }

  return filteredMessages;
};


const generatePdfForEachEmail = async (filteredMessages) => {
  const outputDir = "FilteredEmails";
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

  for (const [index, message] of filteredMessages.entries()) {
    const sanitizedSubject = message.subject.replace(/[^a-zA-Z0-9]/g, "_");
    const filePath = path.join(outputDir, `Email_${index + 1}_${sanitizedSubject}.pdf`);

    const emailDate = new Date(message.date * 1000).toLocaleString();

    // Create HTML for the email content
    const emailHTML = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; margin: 20px; }
          h1 { color: #333; }
          .email-header { margin-bottom: 10px;margin-left: 20px; }
        </style>
      </head>
      <body>
        <div class="email-header">
          <p><strong>Subject:</strong> ${message.subject}</p>
          <p><strong>From:</strong> ${message.from[0]?.email}</p>
          <p><strong>Date:</strong> ${emailDate}</p>
        </div>
        <div>
          ${message.body}
        </div>
      </body>
      </html>
    `;

    // Options for PDF generation
    const options = { format: "A4" };

    // Generate the PDF
    const pdfBuffer = await pdf.generatePdf({ content: emailHTML }, options);

    // Save the PDF
    fs.writeFileSync(filePath, pdfBuffer);

    console.log(`PDF saved: ${filePath}`);
  }
};




const RecentEmail = async (req, res) => {
  try {
    const grantId = await getGrantId("teamsjain@gmail.com"); 
    console.log(grantId);
    const messages = await nylasClient.messages.list({
      identifier: grantId,
      queryParams: {
        limit: 200,
      },
    });
    const filteredMessages = await classifyEmails(messages);
    if (filteredMessages.length > 0) {
      await generatePdfForEachEmail(filteredMessages);
    }
    res.send({ message: `${filteredMessages.length} PDF(s) generated successfully!` });
  } catch (error) {
    console.error("Error fetching emails:", error);
    res.status(500).send("Error occurred");
  }
};


export { RecentEmail };




