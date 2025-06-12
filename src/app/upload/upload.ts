import { Component } from '@angular/core';
import { NgIf } from '@angular/common';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import * as pdfjsLib from 'pdfjs-dist';
import { environment } from '../../environments/environment';
import { GoogleGenerativeAI } from '@google/generative-ai';

@Component({
  selector: 'app-upload',
  standalone: true,
  imports: [NgIf, HttpClientModule],
  templateUrl: './upload.html',
  styleUrl: './upload.css'
})
export class UploadComponent {
  selectedFile: File | null = null;
  selectedFileName: string = '';
  jobDescription: string = '';
  geminiResponse: any = null; // To store the raw Gemini response
  parsedGeminiResponse: { matchPercentage: number; suggestions: string } | null = null; // To store the parsed Gemini response
  loadingGemini: boolean = false; // To indicate if Gemini API call is in progress

  constructor(private http: HttpClient) {
    // Set the worker source for pdf.js
    pdfjsLib.GlobalWorkerOptions.workerSrc = './assets/pdf.worker.mjs';
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
      this.selectedFileName = this.selectedFile.name;
    }
  }

  async processPdf() {
    if (!this.selectedFile) {
      console.error('No PDF file selected.');
      return;
    }

    if (this.selectedFile.type !== 'application/pdf') {
      console.error('Please upload a PDF file.');
      return;
    }

    const reader = new FileReader();

    reader.onload = async (e: any) => {
      try {
        const arrayBuffer = e.target.result;
        const pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

        let fullText = '';
        for (let i = 1; i <= pdfDocument.numPages; i++) {
          const page = await pdfDocument.getPage(i);
          const textContent = await page.getTextContent();
          fullText += textContent.items.map((item: any) => item.str).join(' ') + '\n';
        }

        console.log('Extracted PDF Text:', fullText.trim());
        console.log('Job Description:', this.jobDescription);

        // Call Gemini API after PDF text and job description are available
        await this.callGemini(fullText.trim(), this.jobDescription);

      } catch (error) {
        console.error('Error processing PDF:', error);
      }
    };
    reader.readAsArrayBuffer(this.selectedFile);
  }

  async callGemini(resumeText: string, jobDescription: string) {
    this.loadingGemini = true;
    try {
      const genAI = new GoogleGenerativeAI(environment.geminiApiKey);
      
      // Use the text model with streaming and explicitly request JSON output
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" }, // Explicitly request JSON
      });

      const prompt = `You are a professional resume analyzer. Analyze the following resume against the job description and provide a detailed assessment.

Resume:
${resumeText}

Job Description:
${jobDescription}

Please provide your analysis in the following JSON format:
{
  "matchPercentage": number, // A number between 0-100 indicating how well the resume matches the job
  "suggestions": string // A detailed list of suggestions for improvement
}

Ensure the response is valid JSON.`;

      console.log('Sending request to Gemini API...');
      let fullText = '';
      const result = await model.generateContentStream(prompt);
      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullText += chunkText;
        console.log('Received chunk:', chunkText);
      }

      console.log('Raw Gemini Response (full):', fullText);

      try {
        // Clean the response text to ensure it's valid JSON
        const cleanedText = fullText.replace(/```json\n?|\n?```/g, '').trim();
        console.log('Cleaned Gemini Response (before parse):', cleanedText);
        this.parsedGeminiResponse = JSON.parse(cleanedText);
        console.log('Successfully parsed response:', this.parsedGeminiResponse);
      } catch (parseError) {
        console.error('Error parsing Gemini response:', parseError);
        console.error('Raw text that failed to parse:', fullText);
        this.parsedGeminiResponse = null;
      }

    } catch (error) {
      console.error('Error calling Gemini API:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      this.parsedGeminiResponse = null;
    } finally {
      this.loadingGemini = false;
    }
  }
}
