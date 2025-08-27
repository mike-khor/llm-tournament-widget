# LLM Tournament Widget - Frontend

A modern React TypeScript frontend for the LLM Tournament Widget that allows users to submit prompts and evaluate them using multiple LLM providers.

## Features

- **Modern UI**: Built with React 19, TypeScript, and Tailwind CSS
- **Responsive Design**: Works seamlessly on desktop and mobile devices
- **Prompt Evaluation**: Submit multiple prompts for evaluation with customizable parameters
- **Real-time Results**: View detailed evaluation results with scores and reasoning
- **Error Handling**: Comprehensive error states and user feedback
- **Loading States**: Visual feedback during evaluation processes

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn
- Backend API running on http://localhost:8000

### Installation

```bash
# Install dependencies
npm install

# Start development server
npm start

# Build for production
npm run build
```

### Environment Variables

Create a `.env` file in the root directory:

```
REACT_APP_API_URL=http://localhost:8000
```

## Components

### PromptForm
- Multi-prompt input with dynamic add/remove functionality
- Test input and expected output fields
- Configurable generation and evaluation counts
- Form validation and submission

### ResultsTable
- Comprehensive results display with scoring breakdown
- Summary statistics and performance metrics
- Detailed view of best performing prompts
- Sample generation outputs and evaluation reasoning

### API Integration
- Robust error handling and retry logic
- TypeScript interfaces matching backend models
- Loading states and user feedback

## Usage

1. **Enter Prompts**: Add one or more prompts to evaluate
2. **Provide Test Input**: Enter the question or scenario for evaluation
3. **Configure Parameters**: Set generation count (1-10) and evaluation count (1-10)
4. **Submit Evaluation**: Click "Start Evaluation" to begin the process
5. **View Results**: Review detailed scores, rankings, and analysis

## Development

The frontend is configured to proxy API requests to the backend during development. Make sure the FastAPI backend is running on port 8000.

### Key Files

- `src/App.tsx`: Main application component
- `src/components/PromptForm.tsx`: Prompt input form
- `src/components/ResultsTable.tsx`: Results display component
- `src/services/api.ts`: API integration service
- `src/types/api.ts`: TypeScript type definitions
- `tailwind.config.js`: Tailwind CSS configuration

## Styling

The application uses a modern design system with:
- Custom color palette (primary blues, neutral grays)
- Consistent spacing and typography
- Responsive grid layouts
- Interactive hover states and transitions
