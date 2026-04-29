# कुटुंब · KUTUMB — In-Depth Product Document

*Away from home, close to the heart.*

**An AI-powered family health companion. Voice-first. 100+ languages. Privacy by architecture. Built in India, designed for the world.**

---

## 1. The Core Insight (Why this exists)

Every Indian abroad — and every Indian whose parents live in a different city — runs the same broken loop:

> *"Khaana khaaya?" "Haan."*
> *"Tabiyat theek hai?" "Bilkul."*
> *"Dawai li?" "Le li."*

Three lies in thirty seconds. Not because parents want to lie — because they don't want to worry their kids, because they can't articulate "my left chest feels heavy when I climb stairs" in WhatsApp video, because the doctor is 30km away and the trip itself is exhausting.

Kutumb is not another telemedicine app. Telemedicine fires when something has already gone wrong. Kutumb is the **layer underneath** — the daily, ambient, voice-first companion that catches deterioration *months before* a crisis and translates a grandmother's Marwari complaint into a doctor-ready clinical note.

We're not building a doctor replacement. We're building the **memory and the messenger** between three people who currently don't talk to each other in any structured way: the patient, the family, and the doctor.

---

## 2. The Three-Sided Problem (Deeper)

### 2.1 The Patient Side
- **Symptom illiteracy in clinical language.** A 68-year-old farmer in Vidarbha doesn't say "intermittent claudication." He says "thoda chalo toh paer mein jalan hoti hai." That gap is where diagnoses die.
- **Episodic memory failure.** By the time a patient sees a doctor, the symptom that mattered three weeks ago is gone. The doctor sees a snapshot, not the film.
- **Medicine non-adherence is mostly silent.** Patients don't say "I stopped my BP meds because they made me dizzy" — they just stop. Six months later: a stroke. Globally this costs **$300B/year** and **125,000 preventable deaths in the US alone**.

### 2.2 The Family Side
- The diaspora caregiver problem is uniquely brutal: 8,000 miles, 12-hour timezone gaps, parents who refuse to "burden" their children. There are an estimated **18 million Indians living abroad**, most of whom have aging parents back home.
- "Surprise emergency flights" cost ₹80k–₹2L each and are almost always preventable with earlier signal.
- Siblings fight about caregiving because nobody has shared, structured information. Kutumb makes the facts a single source of truth.

### 2.3 The System Side
- A 10-minute consultation cannot reconstruct 6 months of symptoms. Doctors guess from incomplete narratives. Wrong referrals cost the system money and the patient time.
- ASHA workers in rural India serve 200+ families on paper notebooks. Patient histories are literally rewritten or lost.
- Insurance, government schemes, and labs all live in disconnected silos. A patient's data is fragmented across 8 systems and owned by none of them.

---

## 3. The Solution Stack (Expanded)

Kutumb is a single React Native app + FastAPI backend + Claude-powered intelligence layer that does six interlocking things. The original deck listed them; here is what each one *actually means at the implementation layer*.

### 3.1 Voice-First NLP Engine (Layer 1, deeper)
- **Primary path:** Bhashini ASR for 11 Indic languages on Day 1. Bhashini is government-backed, free for non-commercial use, and ships with healthcare-domain phrase models.
- **Fallback path:** Whisper large-v3 (open weights) for any language Bhashini doesn't cover. Runs on-device via TFLite for offline 2G scenarios.
- **Sentiment + paralinguistic analysis:** voice tone, speech rate, pause distribution, and pitch variance feed a small classifier that outputs a "distress score" 0–1. This is what catches the lying "I'm fine."
- **Code-switching support:** rural Indian speech is almost never monolingual. "Doctor saab ne medicine de di, but pet me abhi bhi pain hai" needs to be parsed as one utterance, not three failed transcriptions.

### 3.2 Claude Health Memory (Layer 2, the core brain)
This is the differentiator.

- Each user has a single encrypted file: `<user_id>.kutumb` (AES-256-GCM, key wrapped by biometric/Secure Enclave).
- The file contains: rolling 6-month symptom log, medicine list with adherence percentages, organ scores, lab values, family history, allergy contraindications, and a "behavioural fingerprint" (when they usually wake, how they normally describe themselves).
- On every Claude session, the **decrypted file is sent in the system prompt**, Claude responds, and we get back three structured outputs:
  1. The natural-language reply to the user (in their language)
  2. A JSON `memory_patch` (what to update in the file)
  3. A JSON `trigger_rules` block (any new personalised alert thresholds)
- The server **never persists health content**. The decrypted blob exists in RAM for the duration of one HTTP request and is purged. This is what makes us simultaneously DPDP, HIPAA, and GDPR compliant *by architecture, not by policy promise*.

### 3.3 Predictive Health Intelligence (Layer 3, deeper)
We use a **two-tier rule system**:

- **Hard rules (offline, deterministic, fire instantly):**
  - SpO₂ < 88% → SOS
  - Random blood glucose > 300 mg/dL → emergency push
  - Systolic BP > 180 OR diastolic > 120 → hypertensive crisis flow
  - NSAID + GI-bleed allergy on file → block medicine add, force doctor confirmation
  - Three consecutive missed doses of any cardiac medicine → family escalation
- **Soft rules (Claude-assisted):**
  - Trend analysis on organ scores (Heart, Brain, Gut, Lungs — each 0–100)
  - Symptom pattern recognition ("you've mentioned chest tightness 4 times in 2 weeks")
  - Adherence drift, sleep degradation, mood decline

### 3.4 Computer Vision for Prescriptions & Labs (Layer 4, deeper)
- Google Cloud Vision OCR + Claude post-processing for structured extraction
- Schema: drug name → RxNorm normalised name → dose → frequency → duration
- Lab schema: biomarker → value → unit → reference range → flag (low/normal/high/critical)
- **Critical-value escalation:** any lab value in the "critical" band triggers an immediate push to the user *and* every linked family member, plus an auto-generated draft message to the patient's primary doctor.

---

## 4. New Feasible Features to Add

These are deliberately **buildable inside the existing architecture** — no new infrastructure, just new logic on top of what's already there.

### 4.1 Voice Biomarker Screening (high-impact, low-cost)
The same audio you're already capturing for transcription contains clinically useful signal:
- **Parkinsonian tremor in voice** — micro-modulations at 4–6 Hz detectable from 30 seconds of sustained phonation. Multiple peer-reviewed studies show >85% sensitivity.
- **Respiratory distress** — speech-breath ratio and pause patterns flag COPD exacerbation and pneumonia.
- **Depression markers** — speech rate, pitch variance, and pause length correlate with PHQ-9 scores.
- **Cognitive decline** — word-finding pauses and lexical diversity drift can be early MCI signal.

We don't need to *diagnose*. We just need to flag "voice patterns have changed since baseline — recommend doctor visit." The patient's own 6-month voice history is the reference, which makes this far more reliable than population-level models.

### 4.2 Pill Identifier (camera-based)
Elderly patients lose medicine boxes constantly. They end up with a strip of unmarked pills and no idea what they are.
- Open camera → photograph pill → CV model matches against a pill image database (NIH RxImage is open) → returns drug name + dose.
- Critical safety check: if the identified pill is on the user's "discontinued" list or contraindicates with current meds, flag immediately.
- Already feasible with existing Google Vision API; just needs the matching layer.

### 4.3 Hereditary Risk Family Tree
A structured family medical tree built collaboratively across linked accounts.
- Each linked family member contributes their own conditions.
- Claude computes risk-adjusted thresholds: e.g. if both parents are diabetic, the user's glucose alert threshold drops from 140 → 110 fasting.
- Genetic risk doesn't require 23andMe — family history alone explains 40–60% of common chronic disease risk.

### 4.4 Maternal & Pediatric Mode (ASHA-critical)
This is a huge unlock for the Savitribai persona:
- **Pregnancy track:** week-by-week milestones, danger signs in local language, auto-scheduled ANC visits, iron/folic acid adherence.
- **Pediatric track:** WHO growth chart percentiles auto-plotted from voice-input weight/height. Vaccination schedule synced with the Indian National Immunization Schedule. Developmental milestones with video examples.
- ASHA workers can manage 200+ pregnancies and infants from one screen with offline sync.

### 4.5 Mental Health Companion Mode
- Voice-based PHQ-9 (depression) and GAD-7 (anxiety) administered as natural conversation, not as a form. Claude asks the questions in flowing dialogue and scores in the background.
- Crisis detection with hard-coded escalation: any suicidal ideation phrase triggers immediate connection to iCall (India), 988 (US), or equivalent regional crisis line.
- **This is the highest-stakes feature and needs the strongest guardrails.** Claude must never claim therapeutic competence; the role is screening + signposting only.

### 4.6 Vaccination & Preventive Care Tracker
- Adult vaccine schedule (flu, pneumococcal, shingles, Tdap) which is wildly under-utilised in India.
- Childhood UIP (Universal Immunization Programme) integration.
- Cancer screening reminders by age and gender (mammography, Pap, colonoscopy, PSA).
- The trick: most of these are *missed* not because patients refuse, but because nobody reminded them.

### 4.7 Caregiver Burnout Tracker (for the Priya persona)
- The diaspora child is also a patient.
- Track *their* sleep, stress check-ins, and care-coordination time. After 4+ weeks of declining sleep + rising care hours, surface a prompt: "You've been carrying a lot. Consider talking to someone."
- This is the kind of feature that makes Kutumb stick — it serves the person who actually pays.

### 4.8 Insurance & Government Scheme Matcher
- Auto-match the patient against Ayushman Bharat (PMJAY) eligibility, state-level schemes, and ESI based on already-known demographics.
- Generate the documentation packet for claims directly from the longitudinal health record.
- This converts Kutumb from "nice to have" to "saved my family ₹40,000 last year."

### 4.9 Smart Reminders with Contextual Timing
Generic "8 AM medicine reminder" gets ignored. Instead:
- Learn when the user *actually* takes the medicine (confirmed by voice check-in).
- Adapt the reminder to that real time.
- Pair the reminder with a habit anchor: "When you finish your morning chai, take your BP medicine."
- Studies show contextual reminders improve adherence 30–45% over time-only reminders.

### 4.10 Fall Detection
The phone's accelerometer + gyroscope can detect falls with reasonable precision. Open-source models exist (Apple's HealthKit fall detection is the reference; reproducible with on-device TFLite).
- Detected fall → 30s grace period → if no "I'm okay" voice response → SOS to family + ambulance.
- Free feature that genuinely saves lives in the elderly demographic.

### 4.11 Local Pharmacy & Lab Network
- Auto-route medicine refills to PharmEasy / 1mg / Tata 1mg / local stores based on user location.
- Auto-route lab orders from referral PDFs to Thyrocare / Redcliffe / Dr. Lal PathLabs.
- Revenue: per-transaction commission. Patient-facing: cheaper meds via aggregated price comparison.

### 4.12 Diet & Cooking Coach (regional, voice-first)
- Diabetic in Tamil Nadu doesn't want a "Mediterranean diet." She wants to know if she can eat *idli* for breakfast.
- Claude generates region-specific, condition-aware meal suggestions in the user's language.
- Photo-based food logging: snap a thali → Claude estimates carbs, sodium, and flags issues.

### 4.13 Wearable Integration (deeper)
The deck mentions "wearable sync." In practice:
- Mi Band / Noise / boAt (cheap, dominant in India) — via the unofficial GadgetBridge protocols
- Apple Watch / Fitbit / Garmin — via HealthKit / Google Fit
- Blood pressure cuffs (Omron) — Bluetooth integration
- Glucometers (Accu-Chek, OneTouch) — Bluetooth + photo-OCR fallback
- All raw data flows into the encrypted local file. Patterns get computed locally.

### 4.14 Family Health Group Chat with AI Summary
- A linked-family group chat *inside the app* where everyone can see check-ins, ask questions, and discuss.
- Claude summarises the week's family health into a single Sunday digest: "This week — Papa: BP stable, missed two metformin doses. Mummy: sleep declining 4 nights in a row. Recommended action: book Mummy a check-up."

### 4.15 Pregnancy Loss & Bereavement Mode
A small but humane feature: when a pregnancy or family member is lost, the app needs to *immediately* stop sending reminders that would re-traumatise the user. Most health apps don't handle this and it's brutal. One conversation with the user → respectful pause + memory update.

### 4.16 Travel Health Mode
- Geo-aware: when the user is in a different city/country, surface nearest hospital + their preferred-language doctor.
- Auto-translate the user's Doctor Referral PDF into the local language for emergency use.
- Vaccination + medicine adjustment recommendations for travel.

### 4.17 Chronic Disease Programs (12-week structured)
- Diabetes, hypertension, PCOS, thyroid — each with a guided 12-week protocol that combines voice check-ins, lab cadence, medicine adherence, and lifestyle micro-interventions.
- Outcomes are measurable: HbA1c drop, BP trajectory, weight delta. This is the data we'd publish for clinical credibility.

### 4.18 Federated Community Health Insights (privacy-preserving)
- Aggregate anonymised, district-level trends: "Dengue cases up 40% in Vidarbha this week."
- No individual data leaves the device. Only differentially-private summary statistics.
- Massive value for public health agencies; zero privacy compromise. WHO and ICMR would license this.

### 4.19 Doctor's Companion App (B2B side)
- A separate slim app for doctors that receives the longitudinal Referral PDF as a structured stream rather than a static PDF.
- The doctor sees the 6-month trend graph, adherence percentages, and "things the patient didn't mention but should have."
- Becomes a sticky B2B revenue channel: ₹999/month per doctor, basic CRM + patient-history layer.

### 4.20 WhatsApp Bot Channel (for app-resistant users)
- Many of our target users will never install an app. They will, however, send a voice note on WhatsApp.
- WhatsApp Business API → Kutumb backend → same Claude pipeline → reply.
- Feature parity is limited (no SOS, no dashboard) but the daily check-in works. This is the lowest-friction onboarding ramp in India.

---

## 5. Architecture Notes (Implementation-Ready)

### 5.1 The .kutumb File Format
```
.kutumb (AES-256-GCM encrypted)
├── identity { sha256_user_hash, locale, age_band, gender }
├── family_links [{ link_hash, role, permissions }]
├── conditions [{ icd10, onset_date, status }]
├── medicines [{ rxnorm_id, dose, schedule, adherence_30d }]
├── allergies [{ substance, severity, source }]
├── symptom_log [{ date, free_text, parsed_tags, severity, language }]
├── lab_history [{ date, biomarker, value, unit, ref_range, flag }]
├── organ_scores { heart, brain, gut, lungs, history[] }
├── voice_baseline { spectral_fingerprint, distress_baseline }
├── trigger_rules [{ condition, threshold, action }]
└── audit_log [{ timestamp, action, actor }]
```
Versioned. Forward-compatible. Exportable as a single file for full data portability.

### 5.2 The 3-Layer Claude Prompt
1. **System layer (fixed):** non-diagnosis rules, ethical guardrails, language pinning, refusal patterns for fabricated pharmacology.
2. **Memory layer (per-user):** the decrypted .kutumb summary, capped at ~3000 tokens via summarisation of older content.
3. **Session layer (turn-by-turn):** the user's current utterance, the last 5 turns of context, any active triggers.

Output is forced into a strict JSON schema. Failures fall back to rule-based responses; we never ship a malformed AI reply to the user.

### 5.3 The 12 FastAPI Modules
`auth`, `users`, `family`, `check_ins`, `medicines`, `health_scores`, `emergency_sos`, `referrals_pdf`, `wearable_sync`, `lab_ocr`, `ai_insights`, `ai_session` — each ~300–500 LOC. Total backend: realistic for a 2-person team to build in 8–12 weeks.

### 5.4 Cost Per User Per Month (back-of-envelope)
- Claude Sonnet 4.6: ~₹3–6/user/month at 5 sessions/day, optimised prompts
- Bhashini: free (government API)
- Google Vision: ~₹1/user/month (1–2 OCRs per week average)
- Firebase: ~₹2/user/month (mostly FCM + minimal Firestore)
- **Total marginal cost: ~₹10/user/month.** PLUS tier at ₹149/month yields ~93% gross margin. Free tier subsidised by 5–8% paid conversion is sustainable.

---

## 6. Risks We Haven't Yet Addressed (and how we'd handle them)

### 6.1 Liability if our flag misses a heart attack
- We are *not* a medical device. Every screen, every voice reply, every PDF carries the disclaimer.
- We default to over-alerting, not under-alerting. False positives are tolerable; false negatives are not.
- Independent clinical advisory board (3 doctors) signs off on trigger thresholds before each major release.

### 6.2 Family abuse / coercion vector
- A controlling spouse could weaponise the family dashboard.
- Mitigation: every family link requires explicit, biometric-verified consent. Users can silently revoke any link from a hidden menu (no notification to the revoked party). A "duress code" wipes the local file on entry.

### 6.3 Regulatory risk in different geographies
- India: DPDP-compliant by architecture. No license needed for non-diagnostic AI tools.
- US: HIPAA compliance handled. We'd register as a "wellness" app, not a medical device, for v1. SaMD certification is a Phase 3 conversation.
- EU: GDPR-compliant by architecture. CE marking only required if we make diagnostic claims, which we don't.

### 6.4 Claude API dependency
- Single-vendor risk on Anthropic.
- Mitigation: abstract the LLM layer behind a provider-agnostic interface. We can swap to Llama 3.1 70B or Gemini in <2 weeks if needed. Claude is the best fit *today* for the medical safety guardrails we need.

### 6.5 The "elderly user can't onboard" problem
- A 70-year-old with no smartphone experience cannot install an APK, grant permissions, and create an account.
- Solution: family-led onboarding. The diaspora child sets up the parent's account remotely, ships them a phone with the app pre-installed, and the parent only ever needs to press one button: *talk*.

---

## 7. Sharper Roadmap

### Phase 0 — Hackathon MVP (Now, 6 weeks)
- Voice check-in (Hindi + English)
- Family dashboard (3 members)
- Medicine reminders
- One-tap SOS
- Encrypted local memory file
- 1 chronic disease program (diabetes)
- Doctor referral PDF generator

### Phase 1 — India launch (3–6 months)
- 11 Indic languages live
- ASHA worker mode with offline 2G sync
- WhatsApp bot fallback channel
- Pharmacy + lab partner integrations
- Pediatric and pregnancy modes
- Pilot with 2 ASHA districts (target: 5,000 families)

### Phase 2 — SE Asia + East Africa (6–12 months)
- Swahili, Hausa, Tagalog, Bahasa
- NGO partnerships (UNICEF, BRAC, PATH)
- Government pilots (Kenya, Indonesia)
- Mental health module live globally

### Phase 3 — Latin America + MENA (12–24 months)
- Spanish, Portuguese, Arabic
- White-label deployments for one government health system
- Doctor's Companion B2B launch

### Phase 4 — Global (24–36 months)
- Federated language expansion
- 7,100 languages via on-device fine-tuning
- Insurance and pharma research partnerships
- Published clinical outcomes paper

---

## 8. Why This Wins (Concise)

1. **It's not a chatbot. It's a longitudinal memory.** Every other AI health app is stateless. Kutumb is the only one where Claude actually *knows* you across six months.
2. **Voice-first is non-negotiable for our users.** Typing on a 5-inch screen excludes our entire core demographic. We exclude them only if we make typing mandatory.
3. **Privacy by architecture.** We can't be subpoenaed for health data we don't have. This is a moat, not a marketing line.
4. **The Indian doctor-patient ratio means the demand is structural, not optional.** This isn't a wellness fad. It's filling a gap WHO has flagged for decades.
5. **The diaspora pays.** ₹149/month is invisible to a software engineer in Chicago paying for her parents in Jaipur. The unit economics are the diaspora subsidising the rural use case — and we're proud of that design.

---

*Built by Amrit Lahari and Nishita Agarwal. BITS Pilani. April 2026.*
*Two builders. One mission. A billion families.*