#====================================================================================================
# START - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================

# THIS SECTION CONTAINS CRITICAL TESTING INSTRUCTIONS FOR BOTH AGENTS
# BOTH MAIN_AGENT AND TESTING_AGENT MUST PRESERVE THIS ENTIRE BLOCK

# Communication Protocol:
# If the `testing_agent` is available, main agent should delegate all testing tasks to it.
#
# You have access to a file called `test_result.md`. This file contains the complete testing state
# and history, and is the primary means of communication between main and the testing agent.
#
# Main and testing agents must follow this exact format to maintain testing data. 
# The testing data must be entered in yaml format Below is the data structure:
# 
## user_problem_statement: {problem_statement}
## backend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.py"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## frontend:
##   - task: "Task name"
##     implemented: true
##     working: true  # or false or "NA"
##     file: "file_path.js"
##     stuck_count: 0
##     priority: "high"  # or "medium" or "low"
##     needs_retesting: false
##     status_history:
##         -working: true  # or false or "NA"
##         -agent: "main"  # or "testing" or "user"
##         -comment: "Detailed comment about status"
##
## metadata:
##   created_by: "main_agent"
##   version: "1.0"
##   test_sequence: 0
##   run_ui: false
##
## test_plan:
##   current_focus:
##     - "Task name 1"
##     - "Task name 2"
##   stuck_tasks:
##     - "Task name with persistent issues"
##   test_all: false
##   test_priority: "high_first"  # or "sequential" or "stuck_first"
##
## agent_communication:
##     -agent: "main"  # or "testing" or "user"
##     -message: "Communication message between agents"

# Protocol Guidelines for Main agent
#
# 1. Update Test Result File Before Testing:
#    - Main agent must always update the `test_result.md` file before calling the testing agent
#    - Add implementation details to the status_history
#    - Set `needs_retesting` to true for tasks that need testing
#    - Update the `test_plan` section to guide testing priorities
#    - Add a message to `agent_communication` explaining what you've done
#
# 2. Incorporate User Feedback:
#    - When a user provides feedback that something is or isn't working, add this information to the relevant task's status_history
#    - Update the working status based on user feedback
#    - If a user reports an issue with a task that was marked as working, increment the stuck_count
#    - Whenever user reports issue in the app, if we have testing agent and task_result.md file so find the appropriate task for that and append in status_history of that task to contain the user concern and problem as well 
#
# 3. Track Stuck Tasks:
#    - Monitor which tasks have high stuck_count values or where you are fixing same issue again and again, analyze that when you read task_result.md
#    - For persistent issues, use websearch tool to find solutions
#    - Pay special attention to tasks in the stuck_tasks list
#    - When you fix an issue with a stuck task, don't reset the stuck_count until the testing agent confirms it's working
#
# 4. Provide Context to Testing Agent:
#    - When calling the testing agent, provide clear instructions about:
#      - Which tasks need testing (reference the test_plan)
#      - Any authentication details or configuration needed
#      - Specific test scenarios to focus on
#      - Any known issues or edge cases to verify
#
# 5. Call the testing agent with specific instructions referring to test_result.md
#
# IMPORTANT: Main agent must ALWAYS update test_result.md BEFORE calling the testing agent, as it relies on this file to understand what to test next.

#====================================================================================================
# END - Testing Protocol - DO NOT EDIT OR REMOVE THIS SECTION
#====================================================================================================



#====================================================================================================
# Testing Data - Main Agent and testing sub agent both should log testing data below this section
#====================================================================================================

user_problem_statement: "PWA de coaching sportif intelligent (Athlétisation, MMA, No-Gi) avec Next.js + Supabase (auth + BDD RLS) + Vercel. Dashboard forme du jour, programme IA, RPA vocal (Web Speech API), import lien/image analysé par IA. Design dark mobile-first."

backend:
  - task: "AI endpoint - Generate today's program"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "POST /api/coach/program tested with curl - returns detailed MMA program JSON (échauffement, corps_seance blocs, retour_au_calme, conseil_coach, attention). Using Gemini 3.6 Flash via direct API call with user's GEMINI_API_KEY. Adapts intensity to HRV/sleep/fatigue."
  - task: "AI endpoint - Voice feedback analysis (RPA)"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "POST /api/coach/feedback tested - extracts charge_percue, articulations, questions_precises, ajustements from raw voice transcript. Returns structured JSON."
  - task: "AI endpoint - Analyze video/image link"
    implemented: true
    working: true
    file: "/app/app/api/[[...path]]/route.js"
    stuck_count: 0
    priority: "medium"
    needs_retesting: false
    status_history:
      - working: true
        agent: "main"
        comment: "POST /api/analyze/link tested - structures a session from URL+description with type_travail, bloc_principal, progressions, pieges_a_eviter."

frontend:
  - task: "Auth flow (Supabase signup/login)"
    implemented: true
    working: "NA"
    file: "/app/app/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "AuthGate component with tabs signup/login using @supabase/ssr createBrowserClient. Not yet tested end-to-end - requires user to run SUPABASE_SETUP.sql first."
  - task: "Dashboard mobile-first dark UI"
    implemented: true
    working: "NA"
    file: "/app/app/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "Dashboard with 3 tabs: Aujourd'hui (health + program), RPA (voice feedback), Import. Landing screenshot validated - beautiful dark UI with red/orange fighting sports theme."
  - task: "Voice RPA (Web Speech API native)"
    implemented: true
    working: "NA"
    file: "/app/app/page.js"
    stuck_count: 0
    priority: "high"
    needs_retesting: true
    status_history:
      - working: "NA"
        agent: "main"
        comment: "VoiceFeedbackCard uses window.SpeechRecognition (fr-FR, continuous, interimResults). No external STT. Fallback textarea for typing."

metadata:
  supabase_setup_required: true
  supabase_setup_file: "/app/SUPABASE_SETUP.sql"
  gemini_model: "gemini-3.6-flash"
  speech_to_text: "Web Speech API (browser native)"

test_plan:
  current_focus:
    - "Auth flow (Supabase signup/login)"
    - "Dashboard mobile-first dark UI"
    - "Voice RPA (Web Speech API native)"
  stuck_tasks: []
  test_all: false
  test_priority: "high_first"

agent_communication:
  - agent: "main"
    message: "MVP livré. 3 endpoints IA testés OK avec Gemini 3.6 Flash (basculé automatiquement suite à messages Google indiquant que gemini-2.5-pro et gemini-2.5-flash ne sont plus dispo aux nouveaux utilisateurs). Web Speech API native pour la transcription vocale. Frontend affiché correctement au premier chargement. Reste à: (1) utilisateur exécute /app/SUPABASE_SETUP.sql dans Supabase SQL Editor, (2) tester signup + création de séance de bout en bout."
