## 🎯 **Most Valuable for Your Use Case**

### 1. **PTS-baseline (Pose-based Temporal Spotting)**

Located at `/Users/marroccosimone/soccernet/PTS-baseline/` - this is the **most relevant** project to your pose-based approach!

**What it offers:**

- **ASFormer**: Transformer architecture specifically designed for action segmentation from pose sequences
  - Sliding window attention (handles long videos efficiently)
  - Multi-scale temporal modeling
  - Already works with pose/keypoint features
- **TCN**: Temporal Convolutional Networks with dilated convolutions
- **GRU**: Bidirectional recurrent models
- **Multi-stage architectures**: MSTCN with cascading stages

**Why perfect for you**: Unlike other SoccerNet projects that use ResNet video features, PTS works with **pose/keypoint sequences** - exactly like your MediaPipe 33-keypoint approach.

### 2. **Action Spotting Techniques (sn-spotting)**

**CALF (Context-Aware Loss Function)** - Most relevant model:

- **Context-aware loss**: Novel loss function with 6 temporal zones around actions
  - Models uncertainty before actions happen (perfect for throw "setup" phases)
  - Clear boundary detection (good for throw completion)
- **Pyramidal convolutions**: Multiple kernel sizes capture actions at different speeds (throws vs groundwork)
- **Dual-branch**: Segmentation + detection heads

**Transferable to judo**: The loss function concept could improve your throw detection by modeling the "approach" phase differently from the "execution" phase.

---

## 🏗️ **Architectural Insights**

### **TrackLab Framework (sn-gamestate)**

While soccer-specific, it demonstrates excellent **modular pipeline design**:

```
Your Judo System (inspired by TrackLab):
┌─────────────────────────────────────────────────────┐
│  DetectionLevelModule                               │
│  ├── YOLO/Judoka Detector → Detect 2 athletes       │
│  └── Pose Extractor → MediaPipe 33 keypoints        │
├─────────────────────────────────────────────────────┤
│  TrackLevelModule                                   │
│  └── StrongSORT → Track both judokas across frames │
├─────────────────────────────────────────────────────┤
│  VideoLevelModule                                   │
│  ├── Action Recognizer → ASFormer on pose sequences │
│  ├── Quality Assessor → TCN/CNN                     │
│  └── Score Predictor → Classifier                   │
└─────────────────────────────────────────────────────┘
```

**Key takeaway**: Organize your inference pipeline into these module levels for clean separation of concerns.

---

## ⚙️ **Specific Techniques to Adopt**

| SoccerNet Technique          | Your Application                                                      |
| ---------------------------- | --------------------------------------------------------------------- |
| **Sliding window inference** | Process 3-5 sec pose buffers with overlap                             |
| **ASFormer attention**       | Replace simple sequence classifier with sliding-window transformer    |
| **Context-aware loss**       | Design loss that penalizes pre-throw uncertainty less than post-throw |
| **Multi-scale convolutions** | Capture both fast throws (2-3 sec) and slow groundwork (10+ sec)      |
| **Tracklet aggregation**     | Vote on action/quality over multiple frames for stability             |

---

## 💻 **Code You Could Reuse**

1. **ASFormer implementation** (`PTS-baseline/model/impl/asformer.py`)
   - 600 lines, well-structured
   - Works with sequence data (your pose keypoints fit perfectly)

2. **TCN/MSTCN** (`PTS-baseline/model/common.py`)
   - 150 lines, pure PyTorch
   - Excellent for temporal modeling of pose sequences

3. **Evaluation metrics** (`sn-spotting/Evaluation/`)
   - mAP calculation for sparse action detection
   - Confidence threshold tuning

4. **Dataloader patterns** (all projects)
   - Window-based sampling
   - Temporal data augmentation

---

## 🚧 **What Won't Transfer**

| SoccerNet Feature      | Why Not for Judo                      |
| ---------------------- | ------------------------------------- |
| Soccer pitch detection | Judo mat is simple rectangle          |
| Team clustering        | Only 2 judokas, fixed or by gi color  |
| Jersey number OCR      | Not applicable                        |
| Camera calibration     | Static camera angle usually           |
| ResNet video features  | You're using pose keypoints (better!) |

---

## 🎯 **Recommended Action Plan**

Based on SoccerNet insights, evolve your current plan:

### **Phase 1: Model Architecture (NEW - from SoccerNet)**

```python
# Instead of simple classifier:
Input: Pose sequence (3 sec × 33 keypoints × 3 coords)
↓
ASFormer/TCN (from PTS-baseline)  ← ADOPT THIS
↓
Technique classifier (seoi-nage, uchi-mata, etc.)
↓
Quality regressor (clean/messy)
↓
Score predictor (ippon/wazaari/yuko)
```

### **Phase 2: Loss Function (NEW - from CALF)**

- Implement context-aware loss
- Treat "before throw" and "after throw" differently
- Reduce penalty for uncertainty during setup phase

### **Phase 3: Training Data Strategy**

- Follow SoccerNet's **sparse action** approach
- Negative sampling: Include "no action" sequences (grip fighting, standing)
- Positive sampling: Focus on throw execution windows

---

## 📊 **Realistic Assessment**

**What SoccerNet WILL give you:**

- ✅ Battle-tested temporal models (ASFormer, TCN)
- ✅ Training strategies for sparse action detection
- ✅ Evaluation metrics and validation approaches
- ✅ Modular pipeline architecture patterns

**What you'll still need to build:**

- 🛠️ Judo-specific dataset collection/labeling
- 🛠️ Pose → action mapping (your core innovation)
- 🛠️ Quality assessment criteria (what makes a "clean" throw?)
- 🛠️ Integration with care_system UI

---

## ✅ **Final Verdict**

**SoccerNet can significantly help**, especially:

1. **PTS-baseline** for pose-based action recognition models
2. **CALF's context-aware loss** for temporal modeling
3. **Evaluation frameworks** for measuring performance

**However**, SoccerNet is soccer-specific in implementation. You'll need to **adapt the architectures** (ASFormer, TCN) to work with your MediaPipe pose sequences, but the patterns and approaches are directly transferable.

**My recommendation**: Study the ASFormer and TCN implementations from PTS-baseline - they're the closest match to your pose-based approach and could immediately improve your action recognition accuracy.
