# Lumina

**Lumina** is a modern, AI-powered media platform built with Next.js, leveraging Cloudinary for media management, Pinecone for vector search, and Groq for ultra-fast AI processing.

## 🚀 Technologies Used

- **Framework**: [Next.js 15](https://nextjs.org/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Media Management**: [Cloudinary](https://cloudinary.com/)
- **Vector Database**: [Pinecone](https://www.pinecone.io/)
- **AI Processing**: [Groq](https://groq.com/)
- **Testing**: [Vitest](https://vitest.dev/) & [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

## 🛠️ Getting Started

### Prerequisites

- Node.js (v18+)
- npm / yarn / pnpm

### Installation

1. Clone the repository and install dependencies:
   ```bash
   npm install
   ```

2. Configure your environment variables. Ensure you have populated your `.env` file with the necessary credentials:
   ```env
   CLOUDINARY_CLOUD_NAME=
   CLOUDINARY_API_KEY=
   CLOUDINARY_API_SECRET=
   
   PINECONE_API_KEY=
   
   GROQ_API_KEY=
   ```

3. Run the development server:
   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## 🧪 Testing

This project uses Vitest for testing. To run the test suite:

```bash
npm run test
```

## 📂 Project Structure

- `src/` - Application source code.
- `docs/` - Project documentation.
- `next.config.mjs` - Next.js configuration.
- `vitest.config.ts` - Vitest configuration for testing.
