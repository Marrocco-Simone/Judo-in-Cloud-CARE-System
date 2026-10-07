# Sistema AI di Scoring Automatico per Judo - Riassunto Completo

## 🎯 Visione Generale

Creare un sistema che **suggerisca automaticamente il punteggio** durante una gara judo, analizzando i movimenti dei judoka. Il sistema sfrutta una **combinazione di edge computing (locale) + cloud GPU (remoto)** per mantenere bassi i costi e il delay.

---

## 📊 Pipeline Completo

### **FASE 1: TRAINING (a casa tua)**

Dove: GPU locale (GTX 5070 o M4 Pro 48GB)

1. **Dataset**: YouTube videos di gare judo + labeling manuale di score
   - Ippon, Wazaari, Yuko, No Score, Penalità
   - Tipi di tecnica (seoi-nage, uchi-mata, osoto-gari, ecc.)

2. **Approccio phased** (minimizza sforzo labeling):
   - **Fase A**: Riconoscimento tecnica (seoi-nage? uchi-mata?)
   - **Fase B**: Valutazione qualità (throw pulito vs messy?)
   - **Fase C**: Predizione score finale (ippon vs wazaari?)

3. **Framework**: PyTorch/TensorFlow su GPU locale

---

### **FASE 2: INFERENCE (durante la gara)**

#### **Locale (Care System - notebook)**

Hardware: Laptop senza GPU (quello che usi normalmente)

```
Camera video della gara
    ↓
MediaPipe.js (pose extraction)
    ↓
Extrae 33 keypoint (x, y, z) per frame
    ↓
Buffer 2-3 secondi di pose sequence
    ↓
Converti a JSON e comprimi
    ↓
Manda via WebSocket al server
```

**Cosa accade localmente:**

- MediaPipe è **leggerissimo**, gira su CPU
- Estrae solo skeleton data (non analizza il video intero)
- Output: ~99 floats per frame (x,y,z per 33 punti)
- ~12 KB/sec di dati (manageable anche a connessione scadente)

#### **Remoto (Server con GPU)**

Hardware: GPU rental (RunPod EU, Lambda Labs, OVHcloud, ecc.)

```
Riceve pose sequence
    ↓
Action recognition model (PyTorch)
    ↓
Classifica: tecnica + qualità + score probabile
    ↓
Ritorna: { score_suggestion, confidence, technique_type }
```

**Latenza totale:**

- Buffer locale: ~2-3 sec (necessario per catturare l'azione)
- Network round-trip: 100-500ms
- Inference GPU: 50-200ms
- **Totale: ~1-2 secondi dopo che l'azione finisce**
- ✅ Meglio dei riflessi umani per decisioni complesse

---

## 💾 Architettura Dati

### Local Buffer (JavaScript)

```typescript
interface PoseFrame {
  timestamp: number;
  keypoints: Array<{ x: number; y: number; z: number }>;
}

interface ActionRequest {
  frames: PoseFrame[]; // 2-3 secondi
  match_id: string;
  camera_angle?: string;
}
```

### Server Response

```typescript
interface ScoreSuggestion {
  technique: string; // "seoi-nage", "uchi-mata", etc.
  score: "ippon" | "wazaari" | "yuko" | "no_score" | "penalty";
  confidence: number; // 0-1
  quality_assessment: string; // "clean", "messy", "edge_case"
}
```

---

## 📡 Bandwidth & Network

| Scenario                  | Size/sec       | Viable?       |
| ------------------------- | -------------- | ------------- |
| Raw video 720p @ 15fps    | 1-2 Mbps       | ❌ No         |
| Raw video 1080p @ 30fps   | 3-8 Mbps       | ❌ No         |
| **Pose keypoints (JSON)** | **15-20 KB/s** | ✅ **Yes**    |
| Multi-camera (3 angoli)   | 60-80 KB/s     | ✅ Even on 4G |

**Riduzione**: ~100-500x più piccolo del video

---

## 💰 Costi Stimati

### Training (una tantum)

- GPU locale (già possiedi) → $0
- Cloud GPU alternativo: $3-5/hr × ~50-100 ore training = $150-500

### Inference Runtime (per gara)

**Su server remoto GPU (worst case):**

- Gara media: 50-100 match
- Per match: 2-3 secondi di GPU inference
- GPU H100 su RunPod EU: ~$3-5/ora
- **Per gara**: $1-2 in GPU costs (trascurabile)

**Alternative più economiche:**

- Quantizzazione del modello → gira su CPU remoto (0 costi GPU)
- Batch processing offline (analizza video dopo, non live)

---

## 🛠️ Tech Stack Proposto

| Componente          | Tecnologia                    | Note                         |
| ------------------- | ----------------------------- | ---------------------------- |
| **Pose extraction** | MediaPipe.js                  | CPU-friendly, standard       |
| **Local buffering** | JavaScript/React              | Già usi React in care system |
| **WebSocket**       | ws library (Node) o Socket.io | Real-time communication      |
| **Server backend**  | FastAPI (Python)              | Semplice, veloce             |
| **Model inference** | PyTorch/TorchScript           | Deploy model training        |
| **GPU hosting**     | RunPod EU / OVHcloud          | EU data residency            |

---

## 🎯 Next Steps Concreti

### **Step 1: Proof of Concept** (2-3 settimane)

- [ ] Raccogliere ~100 video clip da YouTube (chiare tecniche ippon)
- [ ] Labelarle manualmente
- [ ] Trainare classifier base "è ippon o no?"
- [ ] Testare accuracy

### **Step 2: Pipeline Setup** (1-2 settimane)

- [ ] Integrare MediaPipe.js nel care system
- [ ] Build simple WebSocket sender
- [ ] Deploy inference server su GPU remoto
- [ ] Test latency e bandwidth reale

### **Step 3: Expand Model** (4-6 settimane)

- [ ] Aggiungere classificazione tecnica (quale throw?)
- [ ] Aggiungere qualità assessment
- [ ] Fine-tune su più dati

### **Step 4: Integration in Care System** (1-2 settimane)

- [ ] UI per mostrare suggestion durante match
- [ ] Confidence threshold (suggerisci solo se confident > 80%)
- [ ] Fallback manuale (giudice always override)

---

## ✅ Vantaggi di questo Approccio

1. **Bassissimo latency** (~1-2 sec, quasi real-time)
2. **Banda minima** (15-20 KB/s, funziona anche su 4G scarso)
3. **Privacy-preserving** (nessun video raw inviato)
4. **Scalabile** (puoi aggiungere telecamere senza triplicare banda)
5. **Supporta care system** (risultati subito disponibili in UI)
6. **Costi hardware bassi** (laptop ordinario basta)
7. **Non invasivo** (giudice decide sempre, suggestion è opzionale)

---

## ⚠️ Sfide Principali

1. **Labeling dataset** → Richiede esperienza judo (✅ tu ce l'hai)
2. **Edge cases** → Alcune tecniche sono borderline, referee interpretation conta
3. **Angolo camera** → Model robusto a diversi angoli (MediaPipe aiuta qui)
4. **Reliability in produzione** → Testing estensivo necessario
5. **Integrazione care system** → UI/UX per suggerimenti durante match

---

## 🔄 Come si integra con JiC oggi

```
Care System (JavaScript)
├── Input video dalla camera
├── MediaPipe pose extraction (locale)
├── Buffer 3 sec
├── POST /api/suggestions a server GPU
└── Mostra suggestion nel UI (opzionale per giudice)

Server GPU
├── Riceve pose sequence
├── Inference PyTorch model
└── Ritorna { score, confidence, technique }

Database (MongoDB)
└── Salva suggestion con match data per audit trail
```
