# TOEIC Test Simulator

A comprehensive ReactJS application for TOEIC test simulation with OCR capabilities, built with modern web technologies.

## Features

- **Fully Client-Side**: No backend required, everything runs in the browser
- **Production OCR**: Real Tesseract.js implementation with image preprocessing and intelligent text parsing
- **Local Storage**: All data persisted in browser localStorage
- **Modern UI**: Built with TailwindCSS and shadcn/ui components
- **Responsive Design**: Mobile-friendly interface
- **Progress Tracking**: Detailed statistics and performance analytics
- **Admin Panel**: Edit and manage test questions
- **Timer**: Built-in timer for realistic test experience

## Tech Stack

- **React 18** with TypeScript
- **Vite** for build tooling
- **TailwindCSS** for styling
- **shadcn/ui** for UI components
- **React Router** for navigation
- **Tesseract.js** for OCR functionality
- **Recharts** for data visualization
- **Lucide React** for icons

## Getting Started

### Prerequisites

- Node.js (version 16 or higher)
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd TOEICSimulation
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open your browser and navigate to `http://localhost:5173`

### Building for Production

```bash
npm run build
```

The built files will be in the `dist` directory.

## Usage

### Creating a Simulation

1. Go to the Home page
2. Click "Create Simulation"
3. Enter a title for your test
4. Upload problem images (screenshots of test questions)
5. Upload an answer sheet image
6. Click "Create Simulation" to process the images

### Taking a Test

1. From the Home page, select "Load Simulation"
2. Choose a simulation from the list
3. Click "Start Test"
4. Answer questions one by one
5. Use the navigation to move between questions
6. Submit when finished to see your results

### Managing Tests

1. Go to the Admin page
2. Select a simulation to edit
3. Click on any question to edit it
4. Modify text, options, or correct answers
5. Save your changes

### Viewing Statistics

1. Go to the Stats page
2. View your performance over time
3. Filter by specific simulations
4. See detailed score distributions and progress charts

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── ui/             # shadcn/ui components
│   ├── Layout.tsx      # Main layout component
│   ├── UploadForm.tsx  # File upload form
│   ├── QuestionCard.tsx # Question display component
│   └── ResultsPage.tsx # Test results component
├── pages/              # Page components
│   ├── HomePage.tsx    # Landing page
│   ├── SimulationPage.tsx # Test taking page
│   ├── AdminPage.tsx   # Admin panel
│   └── StatsPage.tsx   # Statistics page
├── lib/                # Utility functions
│   ├── utils.ts        # General utilities
│   ├── storage.ts      # localStorage helpers
│   ├── ocr.ts          # OCR processing
├── types/              # TypeScript type definitions
└── App.tsx             # Main app component
```

## Data Structure

### Simulation
```typescript
{
  id: string;
  title: string;
  questions: Question[];
  createdAt: string;
}
```

### Question
```typescript
{
  id: number;
  type: 'image' | 'text';
  question: string;
  image?: string;
  options: string[];
  answer: string;
}
```

### Stats Record
```typescript
{
  simulationId: string;
  score: number;
  timeSpent: string;
  date: string;
  answers: AnswerRecord[];
}
```

## OCR Processing

The app includes a production-ready OCR implementation using Tesseract.js that:

1. **Processes answer sheet images** to extract correct answers using pattern matching
2. **Processes problem images** to extract questions and options with intelligent text parsing
3. **Maps questions to answers** automatically based on question numbering
4. **Handles various image formats** with automatic preprocessing for better recognition
5. **Provides fallback options** when OCR results are unclear

### OCR Features:
- **Image Preprocessing**: Automatic contrast enhancement and grayscale conversion
- **Pattern Recognition**: Multiple regex patterns to identify questions, options, and answers
- **Error Handling**: Graceful fallbacks when text extraction fails
- **Progress Tracking**: Real-time OCR progress updates
- **Character Whitelisting**: Optimized character recognition for test content

## Browser Compatibility

- Chrome (recommended)
- Firefox
- Safari
- Edge

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

This project is licensed under the MIT License.

## Support

For issues and questions, please create an issue in the repository.
