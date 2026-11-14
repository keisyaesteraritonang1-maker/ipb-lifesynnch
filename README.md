# IPB LifeSynnch

MASTER PROMPT LOVABLE AI — STUDYFLOW

Smart Learning & Grade Prediction Platform

Tagline: Learn Smarter, Achieve Better.

1. PROJECT OVERVIEW

Build a fully functional web application named StudyFlow, a digital academic learning platform designed for university students, particularly students of IPB University.

StudyFlow has two core features:

Smart Practice — Upload lecture materials, generate structured summaries, and create interactive quizzes using AI.

Grade Predictor — Analyze course grading contracts, calculate required scores, and simulate academic grade outcomes.

The website must be a real working application, NOT just a UI mockup or static prototype.

Prioritize:

Functional features.

Accurate calculations.

Reliable AI integration.

Simple and intuitive user experience.

Secure user data management.

Responsive design.

Do not add unrelated features such as social media, forums, marketplaces, or academic calendars.

2. DESIGN SYSTEM & BRAND IDENTITY

Create a modern, minimalist, soft academic aesthetic with a subtle technology-inspired appearance.

Color palette

Primary: #8EB8E8

Secondary: #C5B8EA

Background: #F8FAFC

Accent: #A99AE8

Text: #263449

Success: #A8D5BA

Design requirements

Rounded cards and buttons.

Soft, subtle shadows.

Clean typography.

Consistent icons.

Smooth transitions and micro-interactions.

Generous whitespace.

Clear visual hierarchy.

Responsive layout for desktop, tablet, and mobile.

Professional but friendly appearance.

Avoid childish illustrations, excessive gradients, overly saturated colors, and cluttered layouts.

Use a consistent design system across every page.

3. WEBSITE STRUCTURE

Create the following pages:

A. Landing / Dashboard

Display:

Welcome to StudyFlow!

"Your academic journey, made smarter."

Show two primary feature cards:

SMART PRACTICE

Turn your lecture materials into summaries and interactive practice questions.

GRADE PREDICTOR

Know what scores you need to reach your academic goals.

Each card must navigate to its respective feature.

B. Smart Practice Page

Contains:

Document upload.

Uploaded document information.

AI-generated summary.

Quiz configuration.

Interactive quiz.

Quiz results and evaluation.

C. Grade Predictor Page

Contains:

Course contract upload.

Extracted grading components.

Editable grading table.

Student score inputs.

Target grade selection.

Calculation dashboard.

Scenario simulator.

D. Authentication

Implement:

Register.

Login.

Logout.

Protected pages.

User-specific data storage.

Use Supabase Authentication.

4. FEATURE ONE — SMART PRACTICE

4.1 Document Upload

Create a drag-and-drop upload area.

Supported formats:

PDF

PPTX

DOCX

TXT

Requirements:

Allow file selection and drag-and-drop.

Display filename and file size.

Provide upload progress.

Validate file format and size.

Allow users to remove or replace uploaded files.

Show clear loading and error states.

4.2 Document Processing

After uploading, the system must:

Extract text from the uploaded document.

Preserve the document's original content and terminology.

Identify chapters and subchapters when possible.

Identify important concepts and definitions.

Analyze relationships between concepts.

Generate a structured summary.

Prepare source-grounded quiz questions.

IMPORTANT AI REQUIREMENTS:

The AI must use the uploaded document as its primary source.

Do not generate unrelated questions or invent information that does not appear in the document.

If the document is unreadable, scanned, incomplete, or contains insufficient information, inform the user.

If OCR is necessary for scanned documents, support OCR processing.

Never pretend that a document has been successfully analyzed if extraction fails.

4.3 Automatic Summary

Generate summaries using the following structure:

Overview of the material.

Main concepts.

Important definitions.

Explanation of each chapter or subchapter.

Important terminology.

Examples when supported by the document.

Conclusion.

Important points to remember.

Writing style:

Use simple Indonesian.

Explain concepts clearly.

Avoid unnecessarily complicated language.

Preserve important academic terminology.

Do not oversimplify important concepts.

Use headings, bullet points, and numbered lists.

Provide buttons:

Generate Summary.

Regenerate Summary.

Create Practice Questions.

Copy Summary.

Allow users to regenerate the summary without uploading the document again.

4.4 Quiz Configuration

Before generating questions, allow users to configure:

Number of Questions

5

10

15

20

30

50

Difficulty Level

Easy:

Basic understanding.

Definitions.

Identification of concepts.

Medium:

Conceptual understanding.

Application.

Relationships between concepts.

Hard:

Critical thinking.

Case analysis.

Reasoning.

Application of multiple concepts.

Question Types

Multiple Choice.

True or False.

Multiple-choice questions must contain exactly four options:
A, B, C, and D.

Ensure questions are relevant to the uploaded material.

Avoid repetitive questions and ensure the answer key is logically correct.

4.5 Interactive Quiz Interface

Create an interactive quiz experience.

Requirements:

Display one question at a time.

Previous and Next buttons.

Question number indicators.

Progress bar.

Interactive answer selection.

Optional countdown timer.

Finish Quiz button.

Confirmation before submitting.

Allow users to revisit previous questions.

Do not reveal correct answers before quiz submission.

Preserve selected answers when navigating between questions.

4.6 Quiz Results

After submission, display:

Total questions.

Correct answers.

Incorrect answers.

Final score (0–100).

Success percentage.

Correct answer for each question.

User's selected answer.

Explanation for each question.

Provide a performance evaluation:

Topics already understood.

Topics requiring further study.

Recommended chapters to review.

Use a simple visual dashboard with progress indicators.

5. FEATURE TWO — GRADE PREDICTOR

This feature must prioritize mathematical accuracy.

Its purpose is to help students calculate their current academic progress and determine the scores required to achieve a desired final grade.

5.1 Upload Course Contract

Supported formats:

PDF

DOCX

JPG

PNG

Extract the following information:

Course name.

Assessment components.

Weight of each component.

Final grade calculation rules.

Grade thresholds, if available.

Examples of assessment components:

Attendance.

Assignments.

Quizzes.

Midterm Examination (UTS).

Final Examination (

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://ipb-lifesynnch.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/2c13e686-0add-579a-89e4-898f3ddb3325).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
