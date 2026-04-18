# 🩺 AI-SP: The Next Gen Standardized Patient

**AI-SP** is a high-fidelity, multimodal simulation platform designed to replace expensive human actors in medical education. By combining **LLM-driven personas**, **low-latency voice interaction**, and an **interactive 3D anatomical interface**, we provide medical students with an on-demand, realistic clinical encounter experience.

## 🚀 Mission Statement
To democratize medical training by providing a scalable, low-cost, and immersive alternative to human Standardized Patients (SPs), enabling students to master diagnostic skills anytime, anywhere.

## ✨ Features (The "Wow" Factor)
*   **Dynamic Patient Personas:** No more rigid scripts. Our patients have moods, social backgrounds, and varying levels of health literacy powered by **GPT-4o**.
*   **Voice-to-Voice Realism:** Students speak naturally to the patient using **OpenAI Whisper (STT)** and receive emotive, low-latency responses via **ElevenLabs (TTS)**.
*   **3D Physical Exam Suite:** A rotatable 3D body map built with **Three.js**. Students can click specific organs to:
    *   **Auscultate:** Hear real heart/lung audio files.
    *   **Palpate:** Trigger haptic/voice pain reactions.
    *   **Inspect:** View AI-generated images of specific physical findings (rashes, swelling).
*   **Automated OSCE Feedback:** A separate "Proctor Agent" analyzes the transcript against gold-standard clinical checklists to provide an instant empathy and accuracy score.

## 🛠️ Technical Stack
*   **Frontend:** React.js + Tailwind CSS
*   **3D Engine:** Three.js (WebGL)
*   **AI Engine:** OpenAI GPT-4o / Claude 3.5 Sonnet
*   **Audio Pipeline:** OpenAI Whisper (STT) & ElevenLabs (Streaming TTS)
*   **Backend:** FastAPI (Python)
*   **Knowledge Base:** Pinecone (RAG for grounding cases in medical literature)

## 📋 MVP (Minimum Viable Product)
1.  **The Interviewer:** A voice-first web interface for history taking.
2.  **The Case:** One fully realized clinical scenario (e.g., Acute Appendicitis) with "hidden" red flags.
3.  **The Body:** A clickable anatomy map that triggers specific AI responses or audio clips.
4.  **The Debrief:** A post-session summary showing clinical hits/misses.

## 🧠 Challenges & Solutions
*   **Hallucination Control:** Using strict **System Prompting** and case-vignette grounding to ensure the AI never contradicts the medical facts of the scenario.
*   **Latency:** Utilizing **WebSocket streaming** for audio to ensure the "round-trip" time from student speech to patient response is under 1.5 seconds.
*   **Affect Modeling:** Passing emotional tags (e.g., `[pain]`, `[confusion]`) to the TTS engine to match the patient’s vocal tone with their current state.

## 📈 Future Roadmap
*   **VR/AR Support:** Bringing the 3D patient into a virtual exam room via WebXR.
*   **Bias Analytics:** Helping students identify unconscious biases in their questioning style based on patient demographics.
*   **EHR Integration:** Allowing students to "order" labs in a mock chart that populates based on the AI's state.

---
*Developed for [Hackathon Name] 2024*
