#!/usr/bin/env python3
"""
Integrate individual professor ratings into course data by matching professor names
"""

import json
import os
from collections import defaultdict

def load_cse_math_professors():
    """Load CSE/MATH professor data"""
    try:
        with open('cse_math_professors.json', 'r') as f:
            professors = json.load(f)
        print(f"✅ Loaded {len(professors)} CSE/MATH professors")
        return professors
    except Exception as e:
        print(f"❌ Error loading CSE/MATH professors: {e}")
        return []

def load_course_data():
    """Load course data"""
    try:
        with open('../Classes_Scraper/data/fa25.json', 'r') as f:
            courses = json.load(f)
        print(f"✅ Loaded course data with {len(courses)} departments")
        return courses
    except Exception as e:
        print(f"❌ Error loading course data: {e}")
        return {}

def normalize_name(name):
    """Normalize professor name for matching"""
    if not name:
        return ""
    
    # Convert to lowercase and remove extra spaces
    name = name.lower().strip()
    
    # Remove common suffixes and titles
    suffixes = ['jr', 'sr', 'ii', 'iii', 'iv', 'phd', 'md', 'prof', 'professor', 'dr', 'doctor']
    for suffix in suffixes:
        if name.endswith(f' {suffix}'):
            name = name[:-len(f' {suffix}')]
    
    return name

def convert_name_format(name):
    """Convert between different name formats"""
    if not name:
        return []
    
    name = name.strip()
    variations = [name]
    
    # If it's in "Last, First Middle" format, convert to "First Last"
    if ',' in name:
        parts = name.split(',')
        if len(parts) == 2:
            last = parts[0].strip()
            first_middle = parts[1].strip()
            # Remove middle names/initials
            first = first_middle.split()[0] if first_middle.split() else ""
            if first and last:
                variations.append(f"{first} {last}")
    
    # If it's in "First Last" format, convert to "Last, First"
    else:
        parts = name.split()
        if len(parts) >= 2:
            first = parts[0]
            last = parts[-1]  # Take the last part as surname
            variations.append(f"{last}, {first}")
    
    return variations

def create_professor_lookup(professors):
    """Create a lookup dictionary for professors by normalized name"""
    lookup = {}
    
    for prof in professors:
        full_name = prof.get('full_name', '')
        if full_name:
            # Get all name variations
            name_variations = convert_name_format(full_name)
            
            # Add all variations to lookup
            for variation in name_variations:
                normalized = normalize_name(variation)
                if normalized:
                    lookup[normalized] = prof
    
    print(f"📊 Created professor lookup with {len(lookup)} name variations")
    return lookup

def find_professor_rating(professor_name, professor_lookup):
    """Find professor rating by name"""
    if not professor_name:
        return None
    
    # Get all name variations for the course professor
    name_variations = convert_name_format(professor_name)
    
    # Try each variation
    for variation in name_variations:
        normalized = normalize_name(variation)
        if normalized in professor_lookup:
            return professor_lookup[normalized]
    
    # Try partial matches as fallback
    normalized = normalize_name(professor_name)
    for lookup_name, prof_data in professor_lookup.items():
        if normalized in lookup_name or lookup_name in normalized:
            return prof_data
    
    return None

def integrate_individual_ratings(courses, professor_lookup):
    """Integrate individual professor ratings into course data"""
    enhanced_courses = {}
    total_sections = 0
    enhanced_sections = 0
    matched_professors = set()
    
    for dept, dept_courses in courses.items():
        enhanced_courses[dept] = {}
        
        for course_num, sections in dept_courses.items():
            if not isinstance(sections, list):
                continue
                
            enhanced_sections_list = []
            
            for section in sections:
                if not isinstance(section, dict):
                    enhanced_sections_list.append(section)
                    continue
                
                total_sections += 1
                enhanced_section = dict(section)
                
                # Try to find individual professor rating
                professor_name = section.get('professor', '')
                professor_rating = find_professor_rating(professor_name, professor_lookup)
                
                if professor_rating:
                    enhanced_section['professor_rating'] = {
                        'rating': professor_rating['avg_rating'],
                        'difficulty': professor_rating['avg_difficulty'],
                        'num_ratings': professor_rating['num_ratings'],
                        'would_take_again': professor_rating['would_take_again_percent'],
                        'department': professor_rating['department'],
                        'professor_id': professor_rating['id']
                    }
                    enhanced_sections += 1
                    matched_professors.add(professor_name)
                
                enhanced_sections_list.append(enhanced_section)
            
            enhanced_courses[dept][course_num] = enhanced_sections_list
    
    print(f"📊 Enhanced {enhanced_sections}/{total_sections} sections with individual professor ratings")
    print(f"👥 Matched {len(matched_professors)} unique professors")
    return enhanced_courses

def main():
    """Main integration function"""
    print("🚀 Starting individual professor rating integration...")
    
    # Load data
    professors = load_cse_math_professors()
    if not professors:
        return
    
    courses = load_course_data()
    if not courses:
        return
    
    # Create professor lookup
    professor_lookup = create_professor_lookup(professors)
    
    # Integrate individual ratings
    enhanced_courses = integrate_individual_ratings(courses, professor_lookup)
    
    # Save enhanced data
    output_file = '../Classes_Scraper/data/fa25_with_individual_professor_ratings.json'
    try:
        with open(output_file, 'w') as f:
            json.dump(enhanced_courses, f, indent=2)
        print(f"💾 Enhanced course data saved to {output_file}")
    except Exception as e:
        print(f"❌ Error saving enhanced data: {e}")
    
    # Show sample enhanced courses
    print(f"\n📋 Sample Enhanced Courses:")
    sample_count = 0
    for dept, dept_courses in enhanced_courses.items():
        if dept in ['CSE', 'MATH']:
            for course_num, sections in dept_courses.items():
                if isinstance(sections, list) and sections:
                    for section in sections:
                        if isinstance(section, dict) and 'professor_rating' in section:
                            rating = section['professor_rating']
                            print(f"   {dept} {course_num} - {section.get('professor', 'Unknown')}: Rating {rating['rating']}, Difficulty {rating['difficulty']}, {rating['num_ratings']} ratings")
                            sample_count += 1
                            if sample_count >= 5:
                                break
        if sample_count >= 5:
            break

if __name__ == "__main__":
    main()
