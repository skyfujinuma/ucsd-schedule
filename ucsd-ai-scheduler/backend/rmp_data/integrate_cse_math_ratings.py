#!/usr/bin/env python3
"""
Integrate CSE/MATH professor ratings into course data
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

def create_department_mapping():
    """Create mapping from RMP departments to course departments"""
    return {
        'Mathematics': ['MATH'],
        'Computer Science': ['CSE'],
        'Electrical Engineering & Computer Science': ['CSE', 'ECE']
    }

def calculate_department_stats(professors):
    """Calculate average stats for each department"""
    dept_stats = defaultdict(lambda: {
        'ratings': [],
        'difficulties': [],
        'would_take_again': [],
        'total_ratings': 0
    })
    
    for prof in professors:
        dept = prof['department']
        if prof['avg_rating']:
            dept_stats[dept]['ratings'].append(prof['avg_rating'])
        if prof['avg_difficulty']:
            dept_stats[dept]['difficulties'].append(prof['avg_difficulty'])
        if prof['would_take_again_percent']:
            dept_stats[dept]['would_take_again'].append(prof['would_take_again_percent'])
        if prof['num_ratings']:
            dept_stats[dept]['total_ratings'] += prof['num_ratings']
    
    # Calculate averages
    for dept in dept_stats:
        stats = dept_stats[dept]
        stats['avg_rating'] = sum(stats['ratings']) / len(stats['ratings']) if stats['ratings'] else 0
        stats['avg_difficulty'] = sum(stats['difficulties']) / len(stats['difficulties']) if stats['difficulties'] else 0
        stats['avg_would_take_again'] = sum(stats['would_take_again']) / len(stats['would_take_again']) if stats['would_take_again'] else 0
        stats['num_professors'] = len(stats['ratings'])
    
    return dict(dept_stats)

def integrate_ratings(courses, dept_stats, dept_mapping):
    """Integrate professor ratings into course data"""
    enhanced_courses = {}
    total_sections = 0
    enhanced_sections = 0
    
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
                
                # Find matching department stats
                matching_stats = None
                for rmp_dept, course_depts in dept_mapping.items():
                    if dept in course_depts and rmp_dept in dept_stats:
                        matching_stats = dept_stats[rmp_dept]
                        break
                
                if matching_stats:
                    enhanced_section['professor_rating'] = {
                        'rating': round(matching_stats['avg_rating'], 1),
                        'difficulty': round(matching_stats['avg_difficulty'], 1),
                        'num_ratings': matching_stats['total_ratings'],
                        'would_take_again': round(matching_stats['avg_would_take_again'], 1),
                        'department': rmp_dept,
                        'num_professors': matching_stats['num_professors']
                    }
                    enhanced_sections += 1
                
                enhanced_sections_list.append(enhanced_section)
            
            enhanced_courses[dept][course_num] = enhanced_sections_list
    
    print(f"📊 Enhanced {enhanced_sections}/{total_sections} sections with professor ratings")
    return enhanced_courses

def main():
    """Main integration function"""
    print("🚀 Starting CSE/MATH professor rating integration...")
    
    # Load data
    professors = load_cse_math_professors()
    if not professors:
        return
    
    courses = load_course_data()
    if not courses:
        return
    
    # Create department mapping and calculate stats
    dept_mapping = create_department_mapping()
    dept_stats = calculate_department_stats(professors)
    
    print(f"\n📊 Department Statistics:")
    for dept, stats in dept_stats.items():
        print(f"   {dept}: {stats['num_professors']} professors, Avg Rating: {stats['avg_rating']:.1f}, Avg Difficulty: {stats['avg_difficulty']:.1f}")
    
    # Integrate ratings
    enhanced_courses = integrate_ratings(courses, dept_stats, dept_mapping)
    
    # Save enhanced data
    output_file = '../Classes_Scraper/data/fa25_with_cse_math_ratings.json'
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
                    section = sections[0]
                    if isinstance(section, dict) and 'professor_rating' in section:
                        rating = section['professor_rating']
                        print(f"   {dept} {course_num}: Rating {rating['rating']}, Difficulty {rating['difficulty']}, {rating['num_professors']} professors")
                        sample_count += 1
                        if sample_count >= 5:
                            break
        if sample_count >= 5:
            break

if __name__ == "__main__":
    main()
