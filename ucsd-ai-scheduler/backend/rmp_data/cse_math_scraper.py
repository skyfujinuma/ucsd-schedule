#!/usr/bin/env python3
"""
Targeted UCSD RateMyProfessor scraper for CSE and MATH departments only
"""

import time
import json
import re
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from webdriver_manager.chrome import ChromeDriverManager

class CSEMathScraper:
    def __init__(self):
        self.driver = None
        self.ucsd_school_id = "1079"
        self.target_departments = ["Computer Science", "Mathematics", "Computer Science & Engineering", "CSE"]
        self.all_professors = []
        self.setup_driver()
    
    def setup_driver(self):
        """Setup Chrome driver with options"""
        options = Options()
        options.add_argument("--headless")
        options.add_argument("--no-sandbox")
        options.add_argument("--disable-dev-shm-usage")
        options.add_argument("--window-size=1920,1080")
        options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36")
        
        try:
            self.driver = webdriver.Chrome(
                service=Service(ChromeDriverManager().install()),
                options=options
            )
            print("✅ Chrome driver initialized successfully")
        except Exception as e:
            print(f"❌ Failed to initialize Chrome driver: {e}")
            self.driver = None
    
    def is_target_department(self, department):
        """Check if professor is from target departments"""
        if not department:
            return False
        
        department_lower = department.lower()
        target_keywords = ["computer science", "mathematics", "cse", "math"]
        
        return any(keyword in department_lower for keyword in target_keywords)
    
    def extract_professors_from_page(self):
        """Extract professors from current page, filtering for target departments"""
        try:
            js_store = self.driver.execute_script("return window.__RELAY_STORE__;")
            
            if not js_store:
                return []
            
            page_professors = []
            for key, value in js_store.items():
                if isinstance(value, dict) and value.get('__typename') == 'Teacher':
                    department = value.get('department', '')
                    
                    # Only include professors from target departments
                    if self.is_target_department(department):
                        professor_data = {
                            'id': value.get('id'),
                            'legacy_id': value.get('legacyId'),
                            'first_name': value.get('firstName'),
                            'last_name': value.get('lastName'),
                            'full_name': f"{value.get('firstName', '')} {value.get('lastName', '')}".strip(),
                            'department': department,
                            'avg_rating': value.get('avgRating'),
                            'num_ratings': value.get('numRatings'),
                            'would_take_again_percent': value.get('wouldTakeAgainPercent'),
                            'avg_difficulty': value.get('avgDifficulty'),
                            'is_saved': value.get('isSaved', False)
                        }
                        
                        if professor_data['full_name']:
                            page_professors.append(professor_data)
            
            return page_professors
            
        except Exception as e:
            print(f"❌ Error extracting professors from page: {e}")
            return []
    
    def load_more_professors(self):
        """Load more professors by clicking Show More button"""
        try:
            # Try different selectors for the Show More button
            selectors = [
                "//button[contains(text(), 'Show More')]",
                "//button[contains(text(), 'Load More')]",
                "//button[contains(@class, 'ShowMore')]",
                "//button[contains(@class, 'LoadMore')]"
            ]
            
            show_more_button = None
            for selector in selectors:
                try:
                    show_more_button = self.driver.find_element(By.XPATH, selector)
                    print(f"   🔍 Found Show More button with selector: {selector}")
                    break
                except:
                    continue
            
            if show_more_button:
                if show_more_button.is_enabled():
                    print(f"   ➡️  Clicking Show More button...")
                    self.driver.execute_script("arguments[0].click();", show_more_button)
                    time.sleep(3)
                    return True
                else:
                    print(f"   ⏹️  Show More button is disabled")
                    return False
            else:
                print(f"   ❌ No Show More button found")
                return False
        except Exception as e:
            print(f"   ❌ Error with Show More button: {e}")
            return False
    
    def scrape_target_departments(self, max_pages=100):
        """Scrape professors from CSE and MATH departments only"""
        if not self.driver:
            return []
        
        print(f"🔍 Scraping CSE and MATH professors from UCSD (max {max_pages} pages)...")
        print(f"🎯 Target departments: {', '.join(self.target_departments)}")
        
        try:
            # Navigate to UCSD page
            url = f"https://www.ratemyprofessors.com/search/professors/{self.ucsd_school_id}?q=*"
            print(f"📄 Loading: {url}")
            
            self.driver.get(url)
            time.sleep(5)
            
            # Verify we're on the right page
            try:
                page_title = self.driver.title
                if "University of California San Diego" in page_title:
                    print(f"✅ Confirmed: {page_title}")
                else:
                    print(f"❌ Wrong page: {page_title}")
                    return []
            except:
                print("❌ Could not verify page title")
                return []
            
            # Extract professors from multiple pages
            for page in range(max_pages):
                print(f"📄 Processing page {page + 1}...")
                
                # Extract professors from current page
                page_professors = self.extract_professors_from_page()
                
                if not page_professors:
                    print(f"❌ No target department professors found on page {page + 1}")
                    # Continue to next page in case there are more
                else:
                    # Add new professors (avoid duplicates)
                    new_professors = 0
                    for prof in page_professors:
                        if not any(p['id'] == prof['id'] for p in self.all_professors):
                            self.all_professors.append(prof)
                            new_professors += 1
                    
                    print(f"   📊 Page {page + 1}: {len(page_professors)} target professors, {new_professors} new, Total: {len(self.all_professors)}")
                    
                    # Show sample of new professors
                    if new_professors > 0:
                        for prof in page_professors[:3]:
                            if any(p['id'] == prof['id'] for p in self.all_professors):
                                print(f"   ✅ {prof['full_name']} - {prof['department']} - Rating: {prof['avg_rating']}")
                
                # Try to load more
                if not self.load_more_professors():
                    print(f"   ⏹️  No more pages available")
                    break
                
                # Save progress every 10 pages
                if (page + 1) % 10 == 0:
                    self.save_progress(f"cse_math_professors_progress_{page + 1}.json")
            
            print(f"🎉 Scraping complete! Total CSE/MATH professors: {len(self.all_professors)}")
            return self.all_professors
            
        except Exception as e:
            print(f"❌ Error scraping professors: {e}")
            return []
    
    def save_progress(self, filename):
        """Save current progress to file"""
        try:
            with open(filename, 'w') as f:
                json.dump(self.all_professors, f, indent=2)
            print(f"💾 Progress saved to {filename}")
        except Exception as e:
            print(f"❌ Error saving progress: {e}")
    
    def save_final_data(self, filename="cse_math_professors.json"):
        """Save final data to file"""
        try:
            with open(filename, 'w') as f:
                json.dump(self.all_professors, f, indent=2)
            print(f"💾 Final data saved to {filename}")
        except Exception as e:
            print(f"❌ Error saving final data: {e}")
    
    def get_department_stats(self):
        """Get statistics by department"""
        if not self.all_professors:
            return {}
        
        dept_stats = {}
        for prof in self.all_professors:
            dept = prof['department']
            if dept not in dept_stats:
                dept_stats[dept] = {
                    'count': 0,
                    'avg_rating': 0,
                    'avg_difficulty': 0,
                    'total_ratings': 0
                }
            
            dept_stats[dept]['count'] += 1
            dept_stats[dept]['avg_rating'] += prof['avg_rating'] or 0
            dept_stats[dept]['avg_difficulty'] += prof['avg_difficulty'] or 0
            dept_stats[dept]['total_ratings'] += prof['num_ratings'] or 0
        
        # Calculate averages
        for dept in dept_stats:
            count = dept_stats[dept]['count']
            dept_stats[dept]['avg_rating'] = dept_stats[dept]['avg_rating'] / count
            dept_stats[dept]['avg_difficulty'] = dept_stats[dept]['avg_difficulty'] / count
        
        return dept_stats
    
    def close(self):
        """Close the driver"""
        if self.driver:
            self.driver.quit()
            print("✅ Driver closed")

def main():
    """Main function to run the scraper"""
    print("🚀 Starting CSE/MATH UCSD RateMyProfessor scraper...")
    
    scraper = CSEMathScraper()
    
    if not scraper.driver:
        print("❌ Failed to initialize driver")
        return
    
    try:
        # Scrape CSE and MATH professors
        professors = scraper.scrape_target_departments(max_pages=100)  # Increased pages for better coverage
        
        if professors:
            print(f"✅ Successfully scraped {len(professors)} CSE/MATH professors")
            
            # Save final data
            scraper.save_final_data()
            
            # Get department statistics
            dept_stats = scraper.get_department_stats()
            
            print(f"\n📊 Department Statistics:")
            for dept, stats in sorted(dept_stats.items(), key=lambda x: x[1]['count'], reverse=True):
                print(f"   {dept}: {stats['count']} professors, Avg Rating: {stats['avg_rating']:.1f}, Avg Difficulty: {stats['avg_difficulty']:.1f}")
            
            # Show sample data
            print(f"\n📋 Sample Professor Data:")
            for i, prof in enumerate(professors[:10]):
                print(f"   {i+1}. {prof['full_name']} ({prof['department']}) - Rating: {prof['avg_rating']}, Difficulty: {prof['avg_difficulty']}, Ratings: {prof['num_ratings']}")
        else:
            print("❌ No CSE/MATH professors scraped")
            
    finally:
        scraper.close()

if __name__ == "__main__":
    main()
