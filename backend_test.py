#!/usr/bin/env python3
"""
Backend API Test Suite for Coach IA / ONYX
Tests all API endpoints at http://localhost:3000/api/*
"""

import requests
import json
import time

BASE_URL = "http://localhost:3000/api"

def test_health():
    """Test GET /api/health"""
    print("\n" + "="*80)
    print("TEST: GET /api/health")
    print("="*80)
    try:
        start = time.time()
        response = requests.get(f"{BASE_URL}/health", timeout=10)
        elapsed = time.time() - start
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}s")
        print(f"Response: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if data.get('status') == 'ok':
                print("✅ PASS: Health check successful")
                return True
            else:
                print("❌ FAIL: Unexpected response structure")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False

def test_coach_program():
    """Test POST /api/coach/program (Priority 1)"""
    print("\n" + "="*80)
    print("TEST: POST /api/coach/program (Priority 1)")
    print("="*80)
    try:
        payload = {
            "sport": "MMA",
            "goals": "prise de masse seche",
            "level": "competiteur",
            "poids_kg": 78,
            "taille_cm": 178,
            "club_schedule": [{"jour": "Lundi", "heure": "19:00", "label": "Sparring"}],
            "one_rm": {"Squat": 135, "Developpe couche": 90},
            "is_club_day": False,
            "hrv": 68,
            "sleep_hours": 7.5,
            "recovery_score": 74,
            "fatigue": 4,
            "recent_sessions": []
        }
        
        print(f"Payload: sport=MMA, goals=prise de masse seche, level=competiteur, poids_kg=78, taille_cm=178")
        print(f"  club_schedule=[Lundi 19:00 Sparring], one_rm={{Squat:135, DC:90}}, is_club_day=False")
        print(f"  hrv=68, sleep=7.5h, recovery=74, fatigue=4")
        
        start = time.time()
        response = requests.post(f"{BASE_URL}/coach/program", json=payload, timeout=90)
        elapsed = time.time() - start
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}s (Gemini calls take 5-40s, this is expected)")
        
        # Handle potential Gemini "high demand" errors - retry once
        if response.status_code >= 500:
            print(f"⚠️  Got {response.status_code} (possible Gemini high demand error), retrying once...")
            time.sleep(2)
            start = time.time()
            response = requests.post(f"{BASE_URL}/coach/program", json=payload, timeout=90)
            elapsed = time.time() - start
            print(f"Retry Status Code: {response.status_code}")
            print(f"Retry Response Time: {elapsed:.2f}s")
        
        print(f"Response: {response.text[:1200]}...")
        
        if response.status_code == 200:
            data = response.json()
            if 'program' in data:
                program = data['program']
                required_keys = ['focus', 'intensite', 'duree_minutes', 'corps_seance']
                missing_keys = [k for k in required_keys if k not in program]
                
                if missing_keys:
                    print(f"❌ FAIL: Missing keys in program: {missing_keys}")
                    return False
                
                # Validate corps_seance is an array with blocs containing exercices
                corps_seance = program.get('corps_seance')
                if not isinstance(corps_seance, list):
                    print(f"❌ FAIL: corps_seance should be an array, got {type(corps_seance)}")
                    return False
                
                # Check structure of first bloc if exists
                if len(corps_seance) > 0:
                    bloc = corps_seance[0]
                    if 'exercices' not in bloc:
                        print(f"⚠️  WARNING: First bloc missing 'exercices' array")
                    elif not isinstance(bloc['exercices'], list):
                        print(f"❌ FAIL: bloc.exercices should be an array")
                        return False
                
                print(f"✅ PASS: Program endpoint working")
                print(f"  - focus: {program.get('focus')}")
                print(f"  - intensite: {program.get('intensite')}")
                print(f"  - duree_minutes: {program.get('duree_minutes')}")
                print(f"  - corps_seance length: {len(corps_seance)} blocs")
                if len(corps_seance) > 0 and 'exercices' in corps_seance[0]:
                    print(f"  - First bloc exercices count: {len(corps_seance[0]['exercices'])}")
                    if len(corps_seance[0]['exercices']) > 0:
                        ex = corps_seance[0]['exercices'][0]
                        print(f"  - Sample exercice: {ex.get('nom', 'N/A')} - {ex.get('series', 'N/A')}x{ex.get('reps', 'N/A')}")
                
                # Report JSON structure for frontend contract validation
                print(f"\n📋 JSON STRUCTURE REPORT (for frontend contract):")
                print(f"  program.focus: {type(program.get('focus')).__name__}")
                print(f"  program.intensite: {type(program.get('intensite')).__name__}")
                print(f"  program.duree_minutes: {type(program.get('duree_minutes')).__name__}")
                print(f"  program.corps_seance: array of {len(corps_seance)} blocs")
                if len(corps_seance) > 0:
                    print(f"  program.corps_seance[0].bloc: {type(corps_seance[0].get('bloc')).__name__}")
                    print(f"  program.corps_seance[0].exercices: array of {len(corps_seance[0].get('exercices', []))} exercices")
                
                return True
            else:
                print(f"❌ FAIL: Missing 'program' in response")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False

def test_nutrition_estimate():
    """Test POST /api/nutrition/estimate (Priority 4)"""
    print("\n" + "="*80)
    print("TEST: POST /api/nutrition/estimate (Priority 4)")
    print("="*80)
    try:
        payload = {
            "description": "poulet, riz, brocolis + yaourt"
        }
        
        print(f"Payload: description='poulet, riz, brocolis + yaourt'")
        
        start = time.time()
        response = requests.post(f"{BASE_URL}/nutrition/estimate", json=payload, timeout=90)
        elapsed = time.time() - start
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}s")
        print(f"Response: {response.text[:800]}...")
        
        if response.status_code == 200:
            data = response.json()
            if 'estimate' in data:
                estimate = data['estimate']
                required_keys = ['name', 'calories', 'protein', 'carbs', 'fat']
                missing_keys = [k for k in required_keys if k not in estimate]
                
                if missing_keys:
                    print(f"❌ FAIL: Missing keys in estimate: {missing_keys}")
                    return False
                
                print(f"✅ PASS: Nutrition estimate endpoint working")
                print(f"  - name: {estimate.get('name')}")
                print(f"  - calories: {estimate.get('calories')}")
                print(f"  - protein: {estimate.get('protein')}g")
                print(f"  - carbs: {estimate.get('carbs')}g")
                print(f"  - fat: {estimate.get('fat')}g")
                return True
            else:
                print(f"❌ FAIL: Missing 'estimate' in response")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False

def test_coach_week():
    """Test POST /api/coach/week (Priority 2)"""
    print("\n" + "="*80)
    print("TEST: POST /api/coach/week (Priority 2)")
    print("="*80)
    try:
        payload = {
            "sport": "MMA",
            "goals": "prepa combat",
            "level": "competiteur",
            "poids_kg": 78,
            "club_schedule": [{"jour": "Lundi", "heure": "19:00", "label": "Sparring"}],
            "hrv": 68,
            "sleep_hours": 7.5,
            "recovery_score": 74,
            "fatigue": 4,
            "recent_sessions": []
        }
        
        print(f"Payload: sport=MMA, goals=prepa combat, level=competiteur, poids_kg=78, club_schedule=[Lundi 19:00 Sparring]")
        
        start = time.time()
        response = requests.post(f"{BASE_URL}/coach/week", json=payload, timeout=90)
        elapsed = time.time() - start
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}s (Gemini calls take 5-40s, this is expected)")
        
        # Handle potential Gemini "high demand" errors - retry once
        if response.status_code >= 500:
            print(f"⚠️  Got {response.status_code} (possible Gemini high demand error), retrying once...")
            time.sleep(2)
            start = time.time()
            response = requests.post(f"{BASE_URL}/coach/week", json=payload, timeout=90)
            elapsed = time.time() - start
            print(f"Retry Status Code: {response.status_code}")
            print(f"Retry Response Time: {elapsed:.2f}s")
        
        print(f"Response: {response.text[:1200]}...")
        
        if response.status_code == 200:
            data = response.json()
            if 'plan' in data:
                plan = data['plan']
                required_keys = ['objectif_semaine', 'week']
                missing_keys = [k for k in required_keys if k not in plan]
                
                if missing_keys:
                    print(f"❌ FAIL: Missing keys in plan: {missing_keys}")
                    return False
                
                # Validate week is an array of 7 days
                week = plan.get('week')
                if not isinstance(week, list):
                    print(f"❌ FAIL: week should be an array, got {type(week)}")
                    return False
                
                if len(week) != 7:
                    print(f"⚠️  WARNING: Expected 7 days in week, got {len(week)}")
                
                # Check structure of first day
                if len(week) > 0:
                    day = week[0]
                    day_keys = ['date', 'jour', 'type', 'intensite', 'focus', 'duree_minutes']
                    missing_day_keys = [k for k in day_keys if k not in day]
                    if missing_day_keys:
                        print(f"⚠️  WARNING: Missing keys in day plan: {missing_day_keys}")
                
                print(f"✅ PASS: Week plan endpoint working")
                print(f"  - objectif_semaine: {plan.get('objectif_semaine')}")
                print(f"  - week length: {len(week)} days")
                if len(week) > 0:
                    print(f"  - Sample day 1: date={week[0].get('date')}, type={week[0].get('type')}, intensite={week[0].get('intensite')}, focus={week[0].get('focus')}")
                if len(week) > 1:
                    print(f"  - Sample day 2: date={week[1].get('date')}, type={week[1].get('type')}, intensite={week[1].get('intensite')}, focus={week[1].get('focus')}")
                return True
            else:
                print(f"❌ FAIL: Missing 'plan' in response")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False

def test_coach_chat():
    """Test POST /api/coach/chat (Priority 3)"""
    print("\n" + "="*80)
    print("TEST: POST /api/coach/chat (Priority 3)")
    print("="*80)
    try:
        payload = {
            "messages": [{"role": "user", "content": "Comment gerer ma recuperation avant un combat?"}],
            "sport": "MMA",
            "context": {}
        }
        
        print(f"Payload: messages=[user: 'Comment gerer ma recuperation avant un combat?'], sport=MMA")
        
        start = time.time()
        response = requests.post(f"{BASE_URL}/coach/chat", json=payload, timeout=90)
        elapsed = time.time() - start
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}s")
        
        # Handle potential Gemini "high demand" errors - retry once
        if response.status_code >= 500:
            print(f"⚠️  Got {response.status_code} (possible Gemini high demand error), retrying once...")
            time.sleep(2)
            start = time.time()
            response = requests.post(f"{BASE_URL}/coach/chat", json=payload, timeout=90)
            elapsed = time.time() - start
            print(f"Retry Status Code: {response.status_code}")
            print(f"Retry Response Time: {elapsed:.2f}s")
        
        print(f"Response: {response.text[:800]}...")
        
        if response.status_code == 200:
            data = response.json()
            if 'reply' in data:
                reply = data['reply']
                if not isinstance(reply, str):
                    print(f"❌ FAIL: reply should be a string, got {type(reply)}")
                    return False
                
                if len(reply.strip()) == 0:
                    print(f"❌ FAIL: reply is empty")
                    return False
                
                print(f"✅ PASS: Chat endpoint working")
                print(f"  - reply length: {len(reply)} chars")
                print(f"  - reply preview: {reply[:200]}...")
                return True
            else:
                print(f"❌ FAIL: Missing 'reply' in response")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False

def test_nutrition_analyze():
    """Test POST /api/nutrition/analyze (Priority 5 - regression)"""
    print("\n" + "="*80)
    print("TEST: POST /api/nutrition/analyze (Priority 5 - regression)")
    print("="*80)
    try:
        payload = {
            "meals": [
                {"name": "Poulet riz", "calories": 600, "protein": 45, "carbs": 60, "fat": 15, "date": "2026-09-30"}
            ],
            "sport": "MMA",
            "goals": "prise de masse"
        }
        
        print(f"Payload: meals=[Poulet riz 600kcal], sport=MMA, goals=prise de masse")
        
        start = time.time()
        response = requests.post(f"{BASE_URL}/nutrition/analyze", json=payload, timeout=90)
        elapsed = time.time() - start
        
        print(f"Status Code: {response.status_code}")
        print(f"Response Time: {elapsed:.2f}s")
        print(f"Response: {response.text[:800]}...")
        
        if response.status_code == 200:
            data = response.json()
            if 'analysis' in data:
                analysis = data['analysis']
                print(f"✅ PASS: Nutrition analyze endpoint working")
                print(f"  - analysis keys: {list(analysis.keys())}")
                return True
            else:
                print(f"❌ FAIL: Missing 'analysis' in response")
                return False
        else:
            print(f"❌ FAIL: Expected 200, got {response.status_code}")
            return False
    except Exception as e:
        print(f"❌ FAIL: Exception occurred: {str(e)}")
        return False

def main():
    print("\n" + "="*80)
    print("COACH IA / ONYX - BACKEND API TEST SUITE")
    print("Testing ONYX backend AI endpoints after .env keys restoration")
    print("Testing against: http://localhost:3000/api")
    print("="*80)
    
    results = {}
    
    # Health check first
    results['health'] = test_health()
    
    # Priority 1: POST /api/coach/program
    results['coach_program'] = test_coach_program()
    
    # Priority 2: POST /api/coach/week
    results['coach_week'] = test_coach_week()
    
    # Priority 3: POST /api/coach/chat
    results['coach_chat'] = test_coach_chat()
    
    # Priority 4: POST /api/nutrition/estimate
    results['nutrition_estimate'] = test_nutrition_estimate()
    
    # Priority 5 (regression): POST /api/nutrition/analyze
    results['nutrition_analyze'] = test_nutrition_analyze()
    
    # Summary
    print("\n" + "="*80)
    print("TEST SUMMARY")
    print("="*80)
    passed = sum(1 for v in results.values() if v)
    total = len(results)
    
    for test_name, result in results.items():
        status = "✅ PASS" if result else "❌ FAIL"
        print(f"{status}: {test_name}")
    
    print(f"\nTotal: {passed}/{total} tests passed ({passed*100//total}%)")
    
    if passed == total:
        print("\n🎉 ALL TESTS PASSED!")
        return 0
    else:
        print(f"\n⚠️  {total - passed} test(s) failed")
        return 1

if __name__ == "__main__":
    exit(main())
