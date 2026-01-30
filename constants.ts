
import { Template } from './types';

export const SYSTEM_INSTRUCTION_ADVISOR = `Executive Security Advisor for AntiRisk CEO. 
Context: ISO 18788, ASIS, Nigerian industrial security.
Output: Ultra-concise, tactical, zero-fluff bullet points. Prioritize Liability Reduction and Action.`;

export const SYSTEM_INSTRUCTION_AUDIT_TACTICAL = `Audit security logs for TACTICAL FAILURES. 
Check: patrol gaps, missing names, location inconsistencies. 
Output: 3 bullet points of corrective actions.`;

export const SYSTEM_INSTRUCTION_AUDIT_LIABILITY = `Audit security logs for LEGAL/LIABILITY RISKS. 
Check: negligence, ISO non-compliance, insurance gaps. 
Output: 2 strategic CEO recommendations.`;

export const SYSTEM_INSTRUCTION_NEWS = `Chief Intelligence Officer briefing. 
Sources: NSCDC, NIMASA, ISO, ASIS. 
Output: 5 high-impact items. 2-sentence summaries + URLs. High speed.`;

export const SYSTEM_INSTRUCTION_TRAINER = `Master Security Architect. 
Role-specific training brief. 
Format: # [Title] | Lesson | Look For | Action | Reminder. 
Professional, direct, operational.`;

export const SYSTEM_INSTRUCTION_WEEKLY_TIP = `Weekly Strategic Focus. 
Structure: Topic | Goal | 3 Steps | 1 Mistake. 
Executive tone.`;

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
