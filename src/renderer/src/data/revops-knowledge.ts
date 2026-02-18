/**
 * RevOps Knowledge Base
 * Comprehensive reference for Revenue Operations concepts, frameworks, metrics, and best practices.
 * This knowledge base is injected into Claude's system prompt to ground responses.
 */

export const REVOPS_KNOWLEDGE_BASE = `
# Revenue Operations (RevOps) Knowledge Base

## 1. CORE REVOPS PHILOSOPHY

Revenue Operations is the strategic alignment of Sales, Marketing, and Customer Success operations under a unified function with a shared goal: predictable, scalable revenue growth.

### Core Pillars
- **Process**: Standardize and optimize the end-to-end revenue process from lead to renewal
- **Data**: Single source of truth across all GTM functions; eliminate silos
- **Technology**: Rationalize and integrate the tech stack for maximum ROI
- **People**: Enable cross-functional teams with the right tools, training, and insights
- **Strategy**: Translate business goals into operational plans, territories, and quotas

### RevOps vs. Sales Ops vs. Marketing Ops
- **Sales Ops**: Pipeline management, forecasting, comp plans, territory design, enablement
- **Marketing Ops**: Campaign attribution, lead scoring, marketing automation, funnel reporting
- **CS Ops**: Health scoring, renewal process, expansion playbooks, NPS/CSAT tracking
- **RevOps**: Orchestrates all three; owns the full revenue lifecycle, data integrity, and GTM alignment

---

## 2. KEY METRICS & KPIs

### Revenue Metrics
- **ARR (Annual Recurring Revenue)**: Total annualized recurring revenue from active subscriptions
- **MRR (Monthly Recurring Revenue)**: ARR / 12; tracks monthly subscription revenue
- **NRR (Net Revenue Retention)**: (Beg ARR + Expansion - Contraction - Churn) / Beg ARR × 100. World-class: >120%
- **GRR (Gross Revenue Retention)**: Revenue retained excluding expansion. World-class: >90%
- **ACV (Annual Contract Value)**: Average annual value of a contract
- **TCV (Total Contract Value)**: Full lifetime value of a contract including one-time fees

### Acquisition Metrics
- **CAC (Customer Acquisition Cost)**: Total sales + marketing spend / new customers acquired
- **LTV (Lifetime Value)**: ACV × Average customer lifespan; or ARPU / Churn Rate
- **LTV:CAC Ratio**: Healthy benchmark is 3:1 or higher
- **Payback Period**: Months to recoup CAC; target <12 months for SMB, <18 months for Enterprise
- **Win Rate**: Closed-won / total closed opportunities. Track by segment, rep, and competitor
- **Sales Cycle Length**: Average days from opportunity creation to close; segment by deal size and tier

### Pipeline Metrics
- **Pipeline Coverage Ratio**: Total pipeline / quota. Target 3-4x for reliable forecasting
- **Pipeline Velocity**: (# Opportunities × Win Rate × ACV) / Sales Cycle Length
- **Stage Conversion Rates**: Track MQL→SAL→SQL→Opportunity→Proposal→Closed Won at each stage
- **Pipeline Created**: New pipeline generated per period; split by source (inbound, outbound, partner)
- **Quota Attainment**: % of reps at 100%+ quota; healthy orgs target 60-70% of reps attaining

### Funnel Metrics
- **MQL (Marketing Qualified Lead)**: Lead meeting threshold score for marketing-accepted lead
- **SAL (Sales Accepted Lead)**: MQL accepted by SDR/BDR as worth pursuing
- **SQL (Sales Qualified Lead)**: Opportunity created by AE after discovery call
- **Lead Velocity Rate (LVR)**: Month-over-month growth in qualified leads; leading indicator of future revenue

### Retention & Expansion
- **Logo Churn Rate**: % of customers lost; track monthly and annually
- **Revenue Churn Rate**: % of revenue lost from churned + contracted customers
- **Expansion Rate**: New ARR from upsells/cross-sells / beginning ARR
- **Health Score**: Composite score of product usage, support tickets, NPS, engagement
- **Time to Value (TTV)**: Days from contract signed to first meaningful outcome for customer
- **NPS (Net Promoter Score)**: Promoters % - Detractors %; benchmark: >40 for SaaS

---

## 3. GTM STRATEGY & PLANNING

### ICP (Ideal Customer Profile) Definition
Key dimensions: company size (employees, revenue), industry vertical, tech stack, geography, business model, growth stage. Quantify ICP by analyzing top 20% of customers who have highest LTV, lowest CAC, fastest TTV, and highest NPS.

### Market Segmentation Tiers
- **Enterprise**: 1,000+ employees; longer cycles, multi-stakeholder, procurement, security reviews
- **Mid-Market**: 100-999 employees; hybrid motion, some self-service discovery
- **SMB/Commercial**: <100 employees; high velocity, product-led, low-touch
- **PLG (Product-Led Growth)**: Free trial or freemium entry; usage-based expansion triggers

### Territory Design
- **Geographic**: Carve by metro, region, country
- **Named Accounts**: Assign top accounts by name regardless of geography
- **Industry Vertical**: Align reps to verticals for domain expertise
- **Whitespace Analysis**: Model total addressable accounts minus existing customers per territory
- Rebalance annually; use capacity models to ensure equitable coverage ratios

### Quota Setting Methodology
- Top-down: Board targets → CEO → CRO → VP → Manager → Rep
- Bottom-up: Rep capacity × expected productivity → aggregate to validate top-down
- Quota-to-OTE ratio: Target 5:1 (OTE is 20% of quota) for SaaS AEs
- Ramp schedules: Month 1 (25%), Month 2 (50%), Month 3 (75%), Month 4 (100%)
- Adjust for territory capacity, market maturity, and rep experience

---

## 4. TECH STACK

### CRM
- **Salesforce**: Industry standard enterprise CRM; highly customizable, large ecosystem; Flows, Apex, SOQL
- **HubSpot**: SMB/mid-market; all-in-one (CRM + Marketing + Service); easier setup, lower admin cost
- **Microsoft Dynamics**: Enterprise; strong for Microsoft-shops

### Marketing Automation
- **Marketo (Adobe)**: Enterprise; complex nurture, scoring, attribution; Marketo Engage
- **Pardot (Salesforce MC Account Engagement)**: Native Salesforce integration; B2B focused
- **HubSpot Marketing Hub**: Tightly integrated with HubSpot CRM; easier to use
- **Eloqua (Oracle)**: Large enterprise; complex, powerful

### Sales Engagement
- **Outreach**: Enterprise-grade; sequences, analytics, Kaia AI, deal management
- **SalesLoft**: Cadences, coaching, conversation intelligence, revenue intelligence
- **Apollo.io**: Data + engagement combined; popular for outbound-heavy teams
- **Salesloft vs. Outreach**: Outreach stronger analytics; Salesloft stronger coaching

### Conversation Intelligence
- **Gong**: Industry leader; call recording, AI analysis, deal intelligence, forecasting
- **Chorus (ZoomInfo)**: Conversation intelligence + ZoomInfo data integration
- **Clari Copilot**: Conversation intelligence within Clari revenue platform

### Revenue Intelligence & Forecasting
- **Clari**: AI-powered forecasting, pipeline management, activity capture; strong enterprise
- **Boostup.ai**: Forecasting and pipeline management; competitive with Clari
- **Salesforce Einstein**: Native AI forecasting within Salesforce
- **Aviso**: AI forecasting with what-if scenario modeling

### Data Enrichment
- **ZoomInfo**: B2B contact and company data; largest database
- **Apollo.io**: Data + engagement platform
- **Clearbit**: Real-time data enrichment; strong for PLG/inbound
- **Cognism**: GDPR-compliant; strong in Europe
- **Lusha**: LinkedIn-integrated enrichment

### CPQ & Deal Desk
- **Salesforce CPQ (Revenue Cloud)**: Native Salesforce quoting; complex pricing rules
- **DealHub**: CPQ + CLM; strong mid-market; guided selling
- **Conga**: Document generation + CPQ + CLM
- **PandaDoc**: eSignature + document management; popular for faster deals

### Business Intelligence & Analytics
- **Tableau**: Powerful visualization; Salesforce-owned
- **Looker (Google)**: Data exploration; strong for data teams; LookML
- **Power BI**: Microsoft ecosystem; strong in Microsoft shops
- **Mode**: SQL-based; favored by analysts
- **Metabase**: Open source BI; popular with startups

### CS Tech
- **Gainsight**: Enterprise CS platform; health scoring, playbooks, QBR workflows
- **ChurnZero**: CS platform; strong for SaaS companies
- **Totango**: Segmentation-based CS; strong for PLG
- **Vitally**: Modern CS platform; popular with mid-market SaaS

---

## 5. PROCESS DESIGN

### Lead-to-Revenue Process (L2R)
1. **Lead Capture**: Form fills, events, inbound, cold outbound, partner referrals
2. **Lead Enrichment**: Auto-enrich with ZoomInfo/Clearbit at point of capture
3. **Lead Scoring**: Demographic (fit) + behavioral (intent) scoring model
4. **Lead Routing**: Round-robin, geographic, or account-based routing rules in LeanData/Salesforce
5. **SDR Qualification (BANT/MEDDIC)**: Discovery, qualify, set AE meeting
6. **Opportunity Management**: Stage definitions with exit criteria; deal desk for large deals
7. **Proposal & Negotiation**: CPQ quoting, legal review, security questionnaire
8. **Close & Contract**: e-signature, order form, SOW
9. **Handoff to CS**: Customer onboarding playbook triggered; SFDC opportunity links to CS account
10. **Onboarding & Adoption**: TTV tracking; milestone-based onboarding
11. **Expansion**: Health-based triggers; QBRs; EBRs; upsell/cross-sell playbooks
12. **Renewal**: 90-day renewal process initiation; risk flagging; negotiation

### Lead Scoring Model Design
- **Fit Score (Demographic)**: Industry (0-30pts), Company size (0-20pts), Title/Role (0-25pts), Tech stack (0-15pts), Geography (0-10pts)
- **Engagement Score (Behavioral)**: Website visits, email opens/clicks, content downloads, webinar attendance, demo request
- **MQL Threshold**: Typically 60-80 combined score; calibrate monthly with sales feedback
- **Decay**: Score decays over time if no engagement; prevents stale MQLs

### Lead Routing Best Practices
- **LeanData**: Gold standard for complex routing logic (account matching, round-robin, ownership)
- **Distribution Engine**: Alternative; native Salesforce-based
- Rules: territory → named account check → SDR round-robin → fallback queue
- SLA: MQLs worked within 5 minutes (speed-to-lead is critical; <5 min = 21x higher contact rate)

### Opportunity Stage Definitions
- **Stage 1 - Discovery**: Initial meeting held; pain identified; MEDDIC/BANT partial
- **Stage 2 - Qualification**: MEDDIC complete; economic buyer identified; compelling event
- **Stage 3 - Technical Evaluation**: Demo/POC; technical win; champion confirmed
- **Stage 4 - Proposal**: Pricing delivered; legal review; multi-threading stakeholders
- **Stage 5 - Negotiation**: Verbal yes; contract red-lines; procurement
- **Closed Won / Closed Lost**: Clear loss reason taxonomy required

### Sales Methodologies
- **MEDDIC/MEDDPICC**: Metrics, Economic Buyer, Decision Criteria, Decision Process, Identify Pain, Champion, Competition
- **SPIN Selling**: Situation, Problem, Implication, Need-Payoff
- **Challenger Sale**: Teach, Tailor, Take Control
- **Value Selling**: Lead with business outcomes and ROI, not features

---

## 6. FORECASTING

### Forecast Categories
- **Commit**: Rep is committing to close this period; high confidence
- **Best Case**: Could close if everything goes right
- **Pipeline**: In funnel but not committed
- **Omit**: Pushed out or lost

### Forecasting Methodologies
- **Stage-weighted probability**: Each stage has % probability; sum of (ACV × probability)
- **AI/Machine learning**: Clari, Gong use activity data + historical patterns to predict close likelihood
- **Rep-level rollup**: Rep → Manager → VP → CRO → CEO; each layer adjusts
- **Sanity checks**: Compare to pipeline coverage ratio, historical win rates, deal velocity

### Forecasting Accuracy Improvement
- Drive CRM hygiene: required fields, stage exit criteria enforcement
- Weekly pipeline reviews with stage-by-stage inspection
- Activity capture (Gong/Outreach) to validate engagement
- Close date discipline: penalize deals with close date slippage >2 periods
- Mutual Action Plans (MAPs): align customer and rep on steps to close

---

## 7. DATA & ANALYTICS

### Data Governance
- **Single Source of Truth (SSOT)**: Salesforce as CRM SSOT; data warehouse (Snowflake/BigQuery) as analytics SSOT
- **Data Quality Rules**: Required fields, picklist standardization, duplicate prevention rules
- **CRM Hygiene Program**: Weekly hygiene reports; gamification; manager accountability
- **Data Enrichment Strategy**: Auto-enrich on record creation; periodic bulk enrichment

### Attribution Models
- **First Touch**: 100% credit to first marketing touchpoint; good for awareness measurement
- **Last Touch**: 100% credit to touchpoint before conversion; overstates bottom-funnel
- **Linear**: Equal credit to all touchpoints; simple but lacks nuance
- **Time Decay**: More credit to recent touchpoints before conversion
- **U-Shaped (Position-Based)**: 40% first touch, 40% last touch, 20% middle; popular for B2B
- **W-Shaped**: 30% each to first touch, lead creation, opportunity creation; 10% rest
- **Full Path/Custom ML**: Full-funnel; requires mature data infrastructure

### Reporting Cadence
- **Daily**: Pipeline created, leads in queue, SLA compliance
- **Weekly**: Pipeline review, forecast update, win/loss rate, activity metrics
- **Monthly**: Full funnel metrics, CAC/LTV, quota attainment, cohort analysis
- **Quarterly**: GTM strategy review, territory performance, comp plan effectiveness, tech stack ROI

---

## 8. COMPENSATION DESIGN

### Compensation Plan Elements
- **Base Salary**: Fixed; 40-60% of OTE for field AEs
- **Variable/Commission**: Performance-based; tied to quota attainment
- **Accelerators**: Multiplier above quota (e.g., 1.5x commission rate above 100%)
- **Decelerators**: Reduced rate below threshold (e.g., 0.5x below 50% attainment)
- **SPIFFs**: Short-term incentives for specific products, verticals, or behaviors
- **Kickers**: Bonuses for specific deal attributes (multi-year, strategic accounts)

### Compensation Plan Principles
- Keep it simple: no more than 3-4 metrics; reps should compute their own commission
- Align with company goals: if NRR is the priority, weight renewal and expansion
- Pay for performance: meaningful upside above quota drives motivation
- Clawback provisions: standard for enterprise SaaS (typically 90-180 day clawback)
- Quota relief for ramp, leaves, territory changes

### Role-Specific Benchmarks
- **AE (Account Executive)**: OTE 5:1 quota ratio; 50/50 base/variable split common
- **SDR/BDR**: OTE often 3:1 to 4:1; paid on meetings held or SQLs created
- **CSM (Customer Success Manager)**: OTE split on renewal + expansion; 60-70/30-40 base/variable
- **Channel/Partner Manager**: Influenced pipeline + sourced revenue

---

## 9. COMMON REVOPS INTERVIEW QUESTION TYPES

### Strategic/Leadership Questions
- "How would you build a RevOps function from scratch?"
- "How do you align Sales and Marketing?"
- "How do you measure RevOps success?"
- "What's your approach to GTM planning?"

### Process Questions
- "Walk me through your lead management process"
- "How do you design a lead scoring model?"
- "How do you handle the marketing-to-sales handoff?"
- "How do you reduce sales cycle length?"

### Analytical Questions
- "How do you approach sales forecasting?"
- "How do you diagnose a pipeline problem?"
- "What metrics do you track and why?"
- "How do you calculate and improve CAC?"

### Technical/Systems Questions
- "What's your Salesforce admin experience?"
- "How do you integrate tools in the RevOps stack?"
- "How do you ensure data quality?"
- "What BI tools have you used?"

### Behavioral Questions
- "Tell me about a time you improved a revenue process"
- "How do you handle conflict between Sales and Marketing?"
- "Describe a time you influenced without authority"
- "Tell me about a failed initiative and what you learned"

---

## 10. REVOPS BEST PRACTICES & FRAMEWORKS

### RevOps Charter Elements
1. Mission and mandate
2. Stakeholder map and RACI
3. OKRs aligned to company revenue targets
4. Tech stack ownership and roadmap
5. Data governance policies
6. Regular business review cadence

### Building RevOps from Scratch: 90-Day Plan
- **Days 1-30**: Listen and learn. Map current state of process, data, and tech. Interview stakeholders. Identify top 3 pain points.
- **Days 31-60**: Quick wins. Fix critical data issues. Establish reporting baseline. Standardize stage definitions.
- **Days 61-90**: Strategic roadmap. Present findings. Prioritize initiatives with business impact scoring. Align on 12-month OKRs.

### Change Management for RevOps
- Get executive sponsorship first (CRO, CMO, or CEO)
- Involve sales leadership early to reduce resistance
- Show the "what's in it for me" for reps (less admin, better leads, faster commission)
- Measure and communicate wins publicly
- Iterate in sprints, not big-bang rollouts

### RevOps Tech Stack Rationalization
1. Audit current tools: usage, cost, integration health, duplicative functionality
2. Score tools: business value vs. cost vs. complexity
3. Identify consolidation opportunities (reduce vendor sprawl)
4. Build 12-month roadmap with ROI for each investment
5. Manage contract renewals proactively (6-month lead time for negotiation)
`

export function getKnowledgeContext(topics?: string[]): string {
  // For now, return the full knowledge base
  // In future, could filter by relevant topics based on question type
  return REVOPS_KNOWLEDGE_BASE
}

export const REVOPS_COMPETENCIES = [
  'Revenue Strategy & GTM Planning',
  'Sales Operations & Pipeline Management',
  'Marketing Operations & Lead Management',
  'Customer Success Operations',
  'Data & Analytics',
  'Technology Stack Management',
  'Forecasting & Revenue Intelligence',
  'Compensation & Quota Design',
  'Process Design & Optimization',
  'Cross-Functional Alignment',
  'Change Management',
  'KPIs & Metrics'
]
