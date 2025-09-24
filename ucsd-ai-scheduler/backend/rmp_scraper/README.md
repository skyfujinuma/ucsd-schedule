# RMP Data Files

This folder contains the essential RateMyProfessor (RMP) files and data for UCSD course scheduling.

## Essential Files:

### Python Scripts:
- `cse_math_scraper.py` - **Main scraper** for CSE and MATH departments only
- `integrate_cse_math_ratings.py` - **Main integration script** that merges professor ratings with course data

### Data Files:
- `cse_math_professors.json` - **Active dataset** of 94 CSE/MATH professors with ratings
- `ucsd_all_professors.json` - Backup of all 250 UCSD professors (for reference)

## Usage:

The current system uses:
1. `cse_math_scraper.py` - Scrapes CSE and MATH professors from RateMyProfessor
2. `integrate_cse_math_ratings.py` - Integrates ratings into course data
3. Enhanced course data is loaded by `server.js` for AI filtering and frontend display

## Current Data Coverage:

- **Mathematics**: 56 professors (Avg Rating: 3.5, Difficulty: 3.4)
- **Computer Science**: 33 professors (Avg Rating: 3.2, Difficulty: 3.5)  
- **Electrical Engineering & Computer Science**: 5 professors (Avg Rating: 3.6, Difficulty: 3.9)

## Data Structure:

Each professor entry contains:
- `id`: Unique professor ID
- `full_name`: Professor's full name
- `department`: Department affiliation
- `avg_rating`: Average rating (1-5)
- `num_ratings`: Number of ratings
- `would_take_again_percent`: Percentage who would take again
- `avg_difficulty`: Average difficulty rating (1-5)

## Integration:

The professor ratings appear in the frontend as:
```
Prof: Alvarado, Christine J. ★★★☆☆ (3.2/5) Difficulty: 3.5/5 • 1136 ratings
```
