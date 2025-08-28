# LLM Tournament Widget

A full-stack application for evaluating and comparing Large Language Model prompts through automated scoring and comprehensive analysis with configurable model selection.

<img width="1714" height="906" alt="image" src="https://github.com/user-attachments/assets/a68677c2-1c38-496e-9cd9-da445e01589a" />

## Problem Statement

LLM applications require rigorous prompt evaluation to ensure quality, safety, and effectiveness. Traditional trial-and-error approaches are inefficient and unreliable. This tool provides a systematic framework for:

- Testing multiple prompts against the same input across different LLM models
- Measuring performance across configurable criteria (accuracy, helpfulness, safety)
- Identifying the best-performing prompts through statistical analysis
- Understanding why certain prompts outperform others
- Comparing model performance for generation and evaluation tasks

## Architecture

### Backend (FastAPI + Python)

- **Evaluation Engine**: Implements LLM-as-a-Judge methodology with multi-provider support
- **Model Management**: Configurable LLM providers (OpenAI, Anthropic Claude) with model selection
- **Provider Factory**: Dynamic model instantiation with cost tracking and capability filtering
- **Async Processing**: Parallel evaluation of multiple prompts for efficiency
- **Configurable Metrics**: Weighted scoring across multiple dimensions
- **Statistical Rigor**: Multiple runs and confidence intervals
- **Database Integration**: PostgreSQL with SQLAlchemy for evaluation history and model tracking

### Frontend (React + TypeScript)

- **Evaluation Interface**: Submit prompts and configure evaluation criteria
- **Advanced Model Configuration**: Select different models for generation and evaluation tasks
- **Model Selection UI**: Provider-grouped dropdowns with cost transparency and capability filtering
- **Results Dashboard**: Ranked results with performance breakdowns and model information
- **History Panel**: Sliding panel with evaluation history and one-click reload functionality
- **Real-time Progress**: Loading states and form validation during evaluation

## Key Features

### Multi-Model Support

- **Provider Selection**: Choose between OpenAI and Anthropic Claude models
- **Independent Configuration**: Use different models for generation vs evaluation
- **Cost Transparency**: Real-time cost display per 1K tokens for each model
- **Capability Filtering**: Models filtered by generation and evaluation support
- **Model Tracking**: Full model configuration stored in evaluation history

### Direct Scoring Mode

- Evaluate all prompts simultaneously across selected models
- Rank by weighted composite scores with model performance indicators
- Show performance across individual criteria with model-specific insights
- Statistical significance testing with cross-model analysis

### Evaluation History & Management

- **History Panel**: Sliding sidebar with chronological evaluation history
- **One-Click Reload**: Instantly restore previous evaluation configurations
- **Model Information**: Track which models were used for each historical evaluation
- **Smart Filtering**: Search and filter evaluations by criteria, date, or model

### Advanced Configuration

- **Flexible Model Assignment**: Separate model selection for generation and evaluation
- **Dynamic Form States**: Form inputs disabled during loading for better UX
- **Validation & Error Handling**: Comprehensive input validation with helpful error messages
- **Responsive Design**: Optimized for desktop and mobile evaluation workflows

## Evaluation Methodology

Built on research-backed evaluation frameworks with modern infrastructure:

- **G-Eval Framework**: Uses chain-of-thought reasoning for consistent scoring across models
- **Multi-Provider Architecture**: Pluggable LLM providers with unified evaluation interface
- **Multi-Criteria Assessment**: Configurable evaluation dimensions with custom weights
- **LLM-as-a-Judge**: Automated scoring with explanatory reasoning from selected models
- **Parallel Execution**: Efficient evaluation of multiple prompts with concurrent processing
- **Model Flexibility**: Use different models for generation and evaluation tasks
- **Reproducible Results**: Deterministic scoring with full model configuration tracking
- **Cost Optimization**: Model selection with cost considerations and usage tracking

## Tech Stack

### Backend

- **FastAPI** - Async web framework with automatic API documentation
- **SQLAlchemy** - ORM with PostgreSQL database integration
- **Pydantic** - Data validation and settings management
- **Multi-Provider LLM Support**:
  - OpenAI API (GPT-4o, GPT-4o Mini, GPT-4.1 Nano)
  - Anthropic Claude API (Claude 4 Sonnet, Claude 3.5 Haiku)
- **Python 3.10+** with asyncio for concurrent processing

### Frontend

- **React 18** with TypeScript for type safety
- **Tailwind CSS** - Utility-first styling with responsive design
- **Modern React Patterns** - Hooks, context, and custom state management
- **Component Architecture** - Reusable UI components with proper props interfaces
- **Vitest** - Fast unit testing framework for frontend logic

## Project Structure

```
├── api/                              # Backend FastAPI application
│   ├── app/
│   │   ├── main.py                   # FastAPI app factory and configuration
│   │   ├── api/v1/                   # API route handlers
│   │   │   ├── evaluation.py         # Evaluation endpoints
│   │   │   ├── models.py            # Model configuration endpoints
│   │   │   └── health.py            # Health check endpoints
│   │   ├── core/                     # Core business logic
│   │   │   ├── config.py            # Application settings
│   │   │   ├── models.py            # Pydantic request/response models
│   │   │   └── models_config.py     # LLM provider and model configuration
│   │   ├── db/                       # Database layer
│   │   │   └── database.py          # SQLAlchemy models and database manager
│   │   └── services/                 # Business logic services
│   │       ├── evaluation.py        # Core evaluation service
│   │       └── llm_providers.py     # Multi-provider LLM integration
│   ├── scripts/                      # Utility scripts
│   │   └── setup_db.py              # Database initialization
│   └── pyproject.toml               # Poetry dependencies and config
├── frontend/                         # React TypeScript application
│   ├── src/
│   │   ├── components/              # React components
│   │   │   ├── EvaluationTable.tsx  # Main evaluation interface
│   │   │   ├── ModelSelector.tsx    # Model selection component
│   │   │   └── HistoryPanel.tsx     # Evaluation history sidebar
│   │   ├── shared/                  # Shared utilities and services
│   │   │   ├── services/api.ts      # API client with type safety
│   │   │   └── types/api.ts         # TypeScript API interfaces
│   │   └── App.tsx                  # Main application component
│   ├── package.json                 # NPM dependencies
│   └── *.test.tsx                   # Vitest test files
└── README.md
```

## Usage

### Basic Evaluation Workflow

1. **Input Configuration**
   - Add multiple prompts for testing (up to 10 supported)
   - Enter your test input/question
   - Optionally specify expected output for reference

2. **Evaluation Setup**
   - Configure evaluation criteria with custom weights
   - Set number of generations per prompt (1-10)
   - Set number of evaluations per generation (1-10)

3. **Advanced Model Configuration** (Optional)
   - Enable advanced settings to choose specific models
   - Select different models for generation vs evaluation tasks
   - View cost estimates and model capabilities

4. **Evaluation Execution**
   - System runs prompts in parallel across selected models
   - Real-time progress updates during processing
   - Statistical analysis with multiple evaluation runs

5. **Results Analysis**
   - Review ranked results with composite scores
   - Analyze performance across individual criteria
   - View detailed breakdowns with confidence intervals
   - Access model-specific performance insights

6. **History Management**
   - Browse previous evaluations in the history panel
   - One-click restoration of previous configurations
   - Track model usage and performance over time

### Advanced Features

- **Model Comparison**: Compare how different models perform on the same prompts
- **Cost Optimization**: Select models based on performance vs cost trade-offs
- **Reproducible Research**: Full configuration tracking for research reproducibility
- **Batch Processing**: Efficient parallel evaluation of multiple prompt variations

## Setup & Development

### Prerequisites

- **Backend**: Python 3.10+, PostgreSQL, Poetry
- **Frontend**: Node.js 16+, NPM
- **API Keys**: OpenAI and/or Anthropic Claude API access

### Quick Start

1. Clone the repository
2. Set up environment variables for API keys and database
3. Run database setup: `cd api && make setup-pg-dev`
4. Start backend: `poetry run uvicorn app.main:create_app --factory --reload`
5. Start frontend: `npm start`

### Testing Strategy

- **Backend**: Unit tests for evaluation logic and model integration
- **Frontend**: Component testing with Vitest and React Testing Library
- **API Integration**: End-to-end testing of evaluation workflows
- **Model Provider Testing**: Mock and integration tests for LLM providers

The system provides robust error handling, comprehensive logging, and graceful degradation for reliable production deployment.
