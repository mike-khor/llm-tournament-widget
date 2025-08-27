# LLM Tournament Widget

A full-stack application for evaluating and comparing Large Language Model prompts through automated scoring and head-to-head analysis.

<img width="1714" height="906" alt="image" src="https://github.com/user-attachments/assets/a68677c2-1c38-496e-9cd9-da445e01589a" />


## Problem Statement

LLM applications require rigorous prompt evaluation to ensure quality, safety, and effectiveness. Traditional trial-and-error approaches are inefficient and unreliable. This tool provides a systematic framework for:

- Testing multiple prompts against the same input
- Measuring performance across configurable criteria (accuracy, helpfulness, safety)
- Identifying the best-performing prompts through statistical analysis
- Understanding why certain prompts outperform others

## Architecture

### Backend (FastAPI + Python)

- **Evaluation Engine**: Implements LLM-as-a-Judge methodology
- **Async Processing**: Parallel evaluation of multiple prompts for efficiency
- **Configurable Metrics**: Weighted scoring across multiple dimensions
- **Statistical Rigor**: Multiple runs and confidence intervals

### Frontend (React + TypeScript)

- **Evaluation Interface**: Submit prompts and configure evaluation criteria
- **Results Dashboard**: Ranked results with performance breakdowns
- **Head-to-Head Comparison**: A/B testing interface for detailed prompt analysis
- **Real-time Progress**: Streaming updates during evaluation

## Key Features

### Direct Scoring Mode

- Evaluate all prompts simultaneously
- Rank by weighted composite scores
- Show performance across individual criteria
- Statistical significance testing

### Head-to-Head Comparison

- Select any two prompts for detailed analysis
- Side-by-side metric breakdowns
- Example output comparison with highlighted differences
- Performance relative to dataset average

## Evaluation Methodology

Built on research-backed evaluation frameworks:

- **G-Eval Framework**: Uses chain-of-thought reasoning for consistent scoring
- **Multi-Criteria Assessment**: Configurable evaluation dimensions with custom weights
- **LLM-as-a-Judge**: Automated scoring with explanatory reasoning
- **Parallel Execution**: Efficient evaluation of multiple prompts
- **Reproducible Results**: Deterministic scoring for consistent comparisons

## Tech Stack

1. Backend
   - FastAPI (async web framework)
   - Pydantic (data validation)
   - OpenAI API (LLM evaluation)
   - Python 3.10+
2. Frontend
   - React 18 with TypeScript
   - Tailwind CSS (utility-first styling)
   - React Query (server state management)
   - Chart.js (data visualization)

## Project Structure

```
├── backend/
│   ├── main.py              # FastAPI application
│   ├── models.py            # Pydantic data models
│   ├── evaluation.py        # Core evaluation logic
│   └── requirements.txt
├── frontend/
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── services/        # API integration
│   │   ├── types/           # TypeScript definitions
│   │   └── utils/           # Helper functions
│   └── package.json
└── README.md
```

## Development Approach

- Phase 1: Core backend with basic evaluation endpoint
- Phase 2: React frontend with results display
- Phase 3: Multi-criteria evaluation and parallel processing
- Phase 4: Head-to-head comparison interface

### Testing Strategy

- **Backend**: Unit tests for evaluation logic
- **Frontend**: Component testing with mock data
- **Integration**: End-to-end evaluation workflows

## Usage

1. **Input**: Provide multiple prompts and a test question
2. **Configure**: Set evaluation criteria and weights
3. **Evaluate**: System runs prompts in parallel and scores outputs
4. **Analyze**: Review ranked results and detailed breakdowns
5. **Compare**: Select two prompts for head-to-head analysis

The system handles variability in LLM outputs through multiple evaluation runs and statistical analysis, providing confidence intervals and significance testing for reliable prompt comparison.
