# ⚖️️ Enterprise AHP Decision Engine & Vendor Selection Matrix

**A mathematical Decision Support System (DSS) utilizing the Analytic Hierarchy Process (AHP) and Simple Additive Weighting (SAW) to evaluate IT vendors, software investments, and strategic enterprise choices without cognitive bias.**

[![Live Application](https://img.shields.io/badge/Live_AHP_Engine-Launch_Calculator-3b82f6?style=for-the-badge&logo=githubpages)](https://edgarcia-id.github.io/ahp-decision-engine/)
[![Algorithm](https://img.shields.io/badge/Algorithm-AHP_%2B_SAW_Hybrid-10b981?style=for-the-badge)](#)
[![Architecture](https://img.shields.io/badge/Architecture-100%25_Client--Side-f59e0b?style=for-the-badge)](#)
[![Maintained By](https://img.shields.io/badge/Maintained_By-NusaIT-0f172a?style=for-the-badge)](https://nusait.com)

---

## 🌐 Interactive Mathematical Modeling Lab
Do not make multi-million dollar procurement decisions based on "gut feeling" or unstructured spreadsheets. 

We have deployed an interactive client-side AHP engine where IT Leaders, Procurement Officers, and C-Level Executives can dynamically calculate objective criteria weights, validate logical consistency, and rank alternatives:  
👉 **[Launch the Enterprise AHP Decision Engine](https://edgarcia-id.github.io/ahp-decision-engine/)**

---

## 🧐 Executive Overview: Why Enterprise Procurement Fails
In enterprise IT procurement (e.g., selecting an ERP vendor, hiring a cloud provider, or purchasing server hardware), decision-makers often struggle to weigh conflicting criteria such as **Security, Price, and Scalability**. 

Subjective decision-making often leads to vendor lock-in, budget overruns, and audit compliance failures.

By utilizing the **Analytic Hierarchy Process (AHP)** developed by Thomas L. Saaty, this tool forces decision-makers to perform mathematical **pairwise comparisons**. The engine then calculates the Eigenvector (priority weights) and mathematically proves whether the decision-maker's logic is sound using the **Consistency Ratio (CR)**.

---

## 🏛️ The 3-Stage Decision Architecture

This tool automates the complex matrix algebra required for objective decision-making:

```text
[ Business Needs & Vendor Options ]
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│ STAGE 1: Pairwise Comparison & Eigenvector Calculation │
│ • Evaluates criteria using Saaty's 1-9 Scale.          │
│ • Calculates exact priority percentage (Weights).      │
└────────────────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│ STAGE 2: Consistency Ratio (CR) Guardrail              │
│ • Validates human logic mathematically.                │
│ • Flags the matrix if CR > 0.1 (Inconsistent Logic).   │
└────────────────────────────────────────────────────────┘
                 │
                 ▼
┌────────────────────────────────────────────────────────┐
│ STAGE 3: Alternative Ranking & PDF Dossier             │
│ • Normalizes vendor data (Cost vs. Benefit criteria).  │
│ • Ranks vendors objectively based on AHP weights.      │
│ • Exports an audit-ready PDF justification report.     │
└────────────────────────────────────────────────────────┘
```

---

## 🛠️ Core Features for C-Level & Procurement Managers

### 1. Dynamic Pairwise Matrix
Users can dynamically add unlimited criteria (e.g., *Price, Support SLA, Uptime, Security Compliance*). The engine automatically constructs the triangular comparison matrix and handles the reciprocal math in real-time.

### 2. The Consistency Guardrail (CR > 0.1)
If a decision-maker states that A is better than B, and B is better than C, but later claims C is better than A, the human logic is flawed. The engine calculates the **Consistency Index (CI)** and **Random Index (RI)** to generate a **Consistency Ratio (CR)**. If the CR exceeds 10% (0.1), the system alerts the user that their decision logic is mathematically invalid.

### 3. Benefit vs. Cost Normalization (SAW Integration)
Once criteria weights are established, users can input real-world data for their alternatives (e.g., *Vendor A, Vendor B, Vendor C*). The system intelligently handles:
* **Cost Criteria:** Lower values are better (e.g., Subscription Price, Latency).
* **Benefit Criteria:** Higher values are better (e.g., SLA Uptime %, Security Features).

### 4. Audit-Ready PDF Export
Generates a highly professional, native PDF report outlining the criteria weights, the mathematical consistency proof, and the final vendor ranking. This document serves as formal evidence for procurement audits.

---

## 💻 Technical Architecture
This application is built with the "Reachable Code" philosophy and strict privacy standards:
* **100% Client-Side:** Written in Vanilla JavaScript (ES6+). No data is sent to external servers, ensuring extreme confidentiality for internal corporate data.
* **No Backend Dependencies:** PDF generation utilizes optimized browser-native print API mappings with specialized `@media print` CSS, avoiding heavy JavaScript PDF libraries.
* **UI Framework:** Tailwind CSS via CDN for an enterprise-grade, responsive user interface.

---

## 👨‍💻 About the Author & Enterprise Architecture Partner

Procurement math is only **10% of the IT transformation journey**; the remaining **90% is secure architecture, change management, and defensible execution**.

If your organization requires a seasoned technology partner to conduct an **IT Vendor Audit**, harden **IT Infrastructure**, or develop custom **ERP & HRIS platforms engineered with automated resilience controls**:

**Alfredo (Ed) Garcia** is a Senior ERP Architect, IT Infrastructure Lead, and Principal Consultant at **[Nusa Industri Teknologi (NusaIT)](https://nusait.com)**. He brings deep practical expertise in bridging complex governance mandates with reachable, maintainable software architecture.

* 👔 **LinkedIn:** [Alfredo (Ed) Garcia](https://www.linkedin.com/in/alfredo-garcia-elbarta-tarigan/)
* 🏢 **Consulting Firm:** [PT Nusa Industri Teknologi (NusaIT)](https://nusait.com)
* 📧 **Consultation Inquiries:** [NusaIT Contact & Advisory](https://nusait.com/contact)

---
*© 2026 Alfredo Garcia / NusaIT. Released under the MIT License.*
