import { Component, ViewChild, ElementRef, SecurityContext } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient, HttpHeaders, HttpClientModule } from '@angular/common/http';
import * as pdfjsLib from 'pdfjs-dist';
import { environment } from '../../environments/environment';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { marked } from 'marked';

@Component({
  selector: 'app-upload',
  templateUrl: './upload.html',
  styleUrls: ['./upload.css'],
  standalone: true,
  imports: [CommonModule, FormsModule, HttpClientModule]
})
export class UploadComponent {
  @ViewChild('fileInput') fileInput!: ElementRef;

  selectedFileName: string | null = null;
  selectedFile: File | null = null;
  jobDescription: string = '';
  loadingGemini: boolean = false;
  isDragging: boolean = false;
  error: string | null = null;
  parsedGeminiResponse: {
    matchPercentage: number;
    suggestions: string;
  } | null = null;
  sanitizedSuggestionsHtml: SafeHtml | null = null;

  constructor(private http: HttpClient, private sanitizer: DomSanitizer) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = './assets/pdf.worker.mjs';
  }

  onFileSelected(event: Event) {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      this.handleFile(input.files[0]);
    }
  }

  triggerFileInput() {
    this.fileInput.nativeElement.click();
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = true;
  }

  onDragLeave(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    event.stopPropagation();
    this.isDragging = false;

    if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
      this.handleFile(event.dataTransfer.files[0]);
    }
  }

  private handleFile(file: File) {
    if (file.type !== 'application/pdf') {
      this.error = 'Please upload a PDF file';
      return;
    }
    this.error = null;
    this.selectedFile = file;
    this.selectedFileName = file.name;
  }

  removeFile() {
    this.selectedFile = null;
    this.selectedFileName = null;
  }

  async processPdf() {
    if (!this.selectedFile || !this.jobDescription) {
      this.error = 'Please upload a resume and provide a job description';
      return;
    }

    this.loadingGemini = true;
    this.error = null;
    this.parsedGeminiResponse = null;
    this.sanitizedSuggestionsHtml = null;

    try {
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

          await this.callGemini(fullText.trim(), this.jobDescription);

        } catch (error) {
          console.error('Error processing PDF:', error);
          this.error = 'An error occurred while processing your resume. Please try again.';
        }
      };
      reader.readAsArrayBuffer(this.selectedFile);

    } catch (err) {
      this.error = 'An error occurred while processing your resume. Please try again.';
      this.loadingGemini = false;
    }
  }

  async callGemini(resumeText: string, jobDescription: string) {
    this.loadingGemini = true;
    try {
      const genAI = new GoogleGenerativeAI(environment.GEMINI_API_KEY);
      
      const model = genAI.getGenerativeModel({
        model: "gemini-2.0-flash",
        generationConfig: { responseMimeType: "application/json" },
      });

      const prompt = `You are a professional resume analyzer. Analyze the following resume against the job description and provide a detailed assessment.\n\nResume:\n${resumeText}\n\nJob Description:\n${jobDescription}\n\nPlease provide your analysis in the following JSON format:\n{\n  "matchPercentage": number, // A number between 0-100 indicating how well the resume matches the job\n  "suggestions": string // A detailed list of suggestions for improvement\n}\n\nEnsure the response is valid JSON.`;

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
        const cleanedText = fullText.replace(/```json\n?|\n?```/g, '').trim();
        console.log('Cleaned Gemini Response (before parse):', cleanedText);
        if (!cleanedText) {
          throw new Error("Cleaned text is empty, cannot parse.");
        }
        this.parsedGeminiResponse = JSON.parse(cleanedText);

        // Convert Markdown suggestions to HTML and sanitize
        if (this.parsedGeminiResponse && this.parsedGeminiResponse.suggestions) {
          const html = await marked.parse(this.parsedGeminiResponse.suggestions);
          this.sanitizedSuggestionsHtml = this.sanitizer.bypassSecurityTrustHtml(html as string);
        }

        console.log('Successfully parsed response:', this.parsedGeminiResponse);
      } catch (parseError) {
        console.error('Error parsing Gemini response:', parseError);
        console.error('Raw text that failed to parse:', fullText);
        this.parsedGeminiResponse = null;
        this.error = 'Failed to parse Gemini response. Please try again.';
      }

    } catch (error) {
      console.error('Error calling Gemini API:', error);
      if (error instanceof Error) {
        console.error('Error details:', error.message);
        console.error('Error stack:', error.stack);
      }
      this.parsedGeminiResponse = null;
      this.error = 'An error occurred while communicating with the Gemini API. Please check your API key and try again.';
    } finally {
      this.loadingGemini = false;
    }
  }
}
