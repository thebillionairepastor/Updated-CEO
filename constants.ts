
import { Template } from './types';

export const SYSTEM_INSTRUCTION_ADVISOR = `You are the "Executive Security Advisor" for the CEO of "AntiRisk Management".

CORE DIRECTIVES:
1. **Audience**: Speaking to the CEO. Strategic and high-level.
2. **Language**: Use clear, actionable English. Explain technical terms if they are critical.
3. **Knowledge**: ISO 18788, ASIS, and Nigerian industrial security context.
4. **Output**: Bullet points for readability. Prioritize Liability Reduction.`;

export const SYSTEM_INSTRUCTION_AUDIT_INTELLIGENCE = `You are the "Principal Intelligence Auditor" for AntiRisk Management. 
Your specialty is identifying tactical failures and liability risks in logs and reports.

AUDIT CATEGORIES:
1. **Temporal Logic**: Check for unrealistic patrol timing.
2. **Inconsistency**: Look for contradictions in narratives.
3. **Directives**: Provide specific "Action Items" for the CEO to fix the identified gaps.

TONE: Sharp, clinical, investigative.`;

export const SYSTEM_INSTRUCTION_NEWS = `You are the "Chief Intelligence Officer" for AntiRisk Management. 
Generate a real-time CEO Security News Blog for the manpower industry.

SOURCES: NSCDC, NIMASA, ISO, ASIS.
OUTPUT: 10 latest items with business impact summaries and direct URLs.`;

export const SYSTEM_INSTRUCTION_TRAINER = `You are the "Global Master Security Training Architect" for AntiRisk Management. 

CORE OBJECTIVE:
Generate high‑quality, unique security training objectives for specific roles.

STRICT FORMAT:
# [Topic Title]
### 💡 Simple Lesson
[Plain English description]
### 🔍 What to Look For
[Clear indicators]
### 🛡️ Correct Action
[Step-by-step response]
### 🎬 Real-World Scenario
[Industrial context]
### 📌 Key Reminder
[One strong sentence]

---
**From: Antirisk Expert Security Advisor**
**Signed - CEO/MD**`;

export const SYSTEM_INSTRUCTION_WEEKLY_TIP = `You are the "Chief Mentor & Head of Standards" for AntiRisk Management.

TASK: Generate the "Weekly Strategic Focus" briefing for the CEO.

CLARITY & TEACHING RULES:
1. **Plain Language**: DO NOT use complex jargon. Use clear, simple, and powerful English that a CEO can explain to a Site Supervisor or a Guard.
2. **Teach the "Why"**: Don't just give an order. Explain why this specific focus saves money or prevents life-loss.
3. **Structured Briefing**:
   - ## [Focus Topic Name]
   - ### 📅 Operational Period: [State the current date and the following 7 days]
   - ### 🎯 The Goal: [Explain the goal in 1 simple sentence]
   - ### 🛠️ Tactical Instructions: [3 simple, numbered steps]
   - ### ⚠️ Common Mistake to Watch For: [Identify 1 way guards usually fail here]

MANDATORY FOOTER: 
---
**From: Antirisk Expert Security Advisor**
**Signed - CEO/MD**`;

export const SECURITY_TRAINING_DB = {
  "Vehicle & Logistics Search": [
    "Hidden Compartments & Spare Tire Wells",
    "Engine Bay (Bonnet) Concealment",
    "Dashboard & Glovebox Tampering",
    "Inside Bumpers & Door Panel Voids",
    "Fake Loads & False Bottom Detection",
    "Driver Distraction Tactics During Search",
    "Mismatch Detection: Waybill vs. Cargo",
    "Fuel Tank Siphoning & Valve Tampering",
    "Under-Carriage Magnetic Contraband Detection",
    "Heavy Machinery Voids & Toolboxes"
  ],
  "Document & Waybill Verification": [
    "Signature Forgery & Stamp Inconsistencies",
    "Altered Quantities & Date Manipulation",
    "Fake Material Movement Approvals",
    "Cross-Checking Physical Materials vs. Logs",
    "Red Flags in Hand-Written Authorizations",
    "Identifying Photocopied vs. Original Stamps",
    "Waybill Serial Number Pattern Analysis",
    "Gate Pass Tampering & Expiry Fraud",
    "Collusion: Driver-Clerk Document Swapping",
    "Electronic Waybill Verification Protocols"
  ],
  "Industrial Staff & Asset Protection": [
    "Staff Exit Search Etiquette & Professionalism",
    "Hidden Items in PPE & Tool Belts",
    "Concealment in Shoes, Waistbands & Jackets",
    "Internal Theft: Identifying Insider Collusion",
    "Power Cable & Spare Part Theft Prevention",
    "Fuel & Liquid Asset Anti-Siphoning Patrols",
    "Laptop & Small Electronics Concealment",
    "Metal Scraps & Raw Material Diversion",
    "Kitchen/Canteen Food & Supply Pilferage",
    "Warehouse Bin Location Tampering Detection"
  ],
  "Perimeter & Facility Integrity": [
    "Fence Bridge & Underground Tunnel Detection",
    "Identifying Holes under Fences & Weak Points",
    "Night vs. Day Patrol Route Randomization",
    "Identifying Unusual Sounds, Smells, or Shadows",
    "Monitoring Blind Spots & Unlit Access Areas",
    "Emergency Alarm Raising & Chain-of-Command",
    "Intruder Detection: Cutting vs. Jumping Fence",
    "CCTV Blind-Spot Exploitation Countermeasures",
    "Security Lighting Failure Response",
    "Vegetation Overgrowth & Concealment Risks"
  ],
  "Maritime & NIMASA Compliance": [
    "ISPS Code: Access Control to Restricted Areas",
    "Vessel Gangway Watch & Visitor Logs",
    "Detecting Stowaways in Cargo Holds/Voids",
    "Underwater Hull Attachment Inspection",
    "Bunkering Safety & Anti-Theft Surveillance",
    "Small Craft Approach Detection & Alarms",
    "Quayside Cargo Integrity & Seal Checks",
    "Maritime Radio Etiquette & Signal Codes",
    "Oil Spill Detection During Loading Ops",
    "Piracy/Armed Robbery Deterrence Measures"
  ],
  "Professional Ethics & Command": [
    "Avoiding Compromise & Bribery Attempts",
    "Situational Awareness & Observation Skills",
    "Professional Body Language & Command Presence",
    "Guard Credibility & Evidence Preservation",
    "Evidence Documentation for Site Records",
    "Conflict De-escalation with Hostile Persons",
    "Radio Communication: Clear, Concise, Tactical",
    "Reporting Hierarchy & Shift Handover Accuracy",
    "Post-Incident Scene Preservation",
    "Uniformity as a Deterrence Mechanism"
  ]
};

export const STATIC_TEMPLATES: Template[] = [
  {
    id: 'patrol-checklist',
    title: 'Daily Patrol Checklist',
    description: 'Standard exterior and interior patrol logs.',
    content: `🛡️ *ANTI-RISK PERIMETER PATROL CHECKLIST*\n\n*Guard Name:* ____________________\n*Shift:* ____________________\n\n*EXTERIOR*\n[ ] Perimeter Fencing: Intact/No breaches\n[ ] Lighting: All exterior lights functional\n[ ] Gates: Locked & Secured\n\n*INTERIOR*\n[ ] Entrances: Secured\n[ ] Fire Exits: Clear\n\n*Notes:*\n__________________\n\n*– AntiRisk Management*`
  },
  {
    id: 'incident-report',
    title: 'Incident Report Form (5Ws)',
    description: 'The standard 5Ws format for critical incidents.',
    content: `📝 *INCIDENT REPORT FORM*\n\n*1. TYPE:* _____________________\n*2. TIME & DATE:* _____________________\n*3. LOCATION:* _____________________\n*4. WHO:* _____________________\n*5. WHAT (Narrative):*\n_____________________\n\n*Reported By:* ____________________`
  }
];
