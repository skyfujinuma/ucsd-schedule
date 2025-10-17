# Triton AI Course Organizer (taco)

An intelligent course planning assistant for UC San Diego students that uses AI to help plan academic schedules, find course sections, and navigate prerequisite requirements.

## What It Does

**taco** is a comprehensive course planning tool that helps UCSD students:

- **Smart Course Recommendations**: AI-powered suggestions for courses based on your major, completed courses, and academic goals
- **Prerequisite Tracking**: Track prerequisites for future courses that need to be taken
- **Section Planning**: Find and compare course sections with real-time availability, professor ratings, and scheduling conflicts
- **Calendar Integration**: Build your ideal schedule with an interactive calendar view
- **College Requirements**: Navigate both major and college-specific graduation requirements

## How It Works

### Frontend (React + Vite)
- **Landing Page**: Modern, animated introduction with project statistics
- **Scheduler Interface**: Interactive form to input major, college, and completed courses
- **AI Query System**: Natural language search through course offerings
- **Calendar Component**: Visual schedule builder with conflict detection
- **About Page**: Detailed project information and statistics

### Backend (Node.js + Express)
- **Course Data API**: Serves real-time course information from UCSD's schedule
- **Prerequisite Engine**: Processes complex prerequisite relationships and "choose one" logic
- **AI Integration**: Uses Google's Generative AI for intelligent course recommendations
- **Major Requirements**: Handles both standard and honors program requirements
- **College Requirements**: Manages college-specific graduation requirements

### Data Sources
- **Real-time Course Data**: Scraped from UCSD's official course schedule
- **Prerequisite Database**: Comprehensive prerequisite relationships for all courses
- **Professor Ratings**: Integrated Rate My Professor data for informed course selection
- **Major Requirements**: Complete requirement tracking for all UCSD majors
- **College Requirements**: College-specific graduation requirements

## Key Features

### 1. Intelligent Course Planning
- AI-powered course recommendations based on your academic profile
- Natural language queries to find specific courses or topics
- Prerequisite-aware suggestions that respect course dependencies

### 2. Comprehensive Data Integration
- **7,376+ prerequisite files** covering all UCSD courses
- Real-time course availability and seat counts
- Professor ratings and teaching quality metrics
- Building and room information for scheduling

### 3. Advanced Scheduling
- Interactive calendar with drag-and-drop functionality
- Conflict detection for overlapping courses
- Time-based filtering and optimization
- Section comparison with professor ratings

### 4. Academic Requirement Tracking
- Major requirement progress tracking
- College requirement management
- Honors program support (e.g., CS26H)
- Prerequisite chain visualization

## Technical Architecture

### Frontend Stack
- **React 19** with modern hooks and functional components
- **Vite** for fast development and building
- **Tailwind CSS** for responsive, modern UI design
- **Vercel Analytics** for usage tracking

### Backend Stack
- **Node.js** with Express.js for API server
- **Google Generative AI** for intelligent recommendations
- **Puppeteer** for web scraping capabilities
- **CORS** enabled for cross-origin requests

### Data Processing
- **Python Selenium** scrapers for course data collection
- **JSON** data structures for efficient querying
- **Real-time** data updates from UCSD systems

## Project Statistics

- **44,000+ lines of code**
- **42 commits** with active development
- **14 issues** tracked and resolved
- **1 major** supported (Computer Science)
- **1 college** supported (Warren College)
- **7,376+ prerequisite files** processed

## Supported Academic Programs

### Majors
- **Computer Science (CS26)**: Complete major requirements

### Colleges
- **Warren College**: College-specific requirements and GEs

## Data Sources and Credits

This project makes use of the following open-source resources:

- **[Classes_Scraper](https://github.com/newracket/Classes_Scraper)** by Aniket Gupta — Python-based scraper for UCSD course data
- **[GrAPE (Graphical Assistant for Prerequisite Enrollment)](https://github.com/wllmwu/course-grapher)** by William Wu — structured prerequisite data for all courses

All data and code are used in accordance with their respective licenses and with attribution. No affiliation with UC San Diego is implied.

## Development Status

**Version**: v1.0.0-alpha  
**Status**: Active Development  
**Last Updated**: Fall 2025

This is an alpha version with core functionality implemented. Future releases will include additional majors, colleges, and enhanced AI features.

