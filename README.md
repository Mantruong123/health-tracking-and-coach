# AuraFit - AI Health Tracking & Coach

AuraFit is an advanced AI-powered health tracking and coaching ecosystem consisting of a mobile application for users, a web application for administration, and a robust backend API. The platform leverages Machine Learning to track user exercises in real-time, provides customized nutrition plans, and manages user health data efficiently.

## 🚀 Features

- **AI Pose Tracking:** Uses Google MLKit to track and count repetitions, monitor correct posture, and evaluate exercise duration directly from the smartphone camera.
- **Personalized AI Coach:** Generates customized workout schedules and daily nutrition plans based on the user's body metrics (BMI, TDEE, BMR) and fitness goals.
- **Premium Subscription:** Seamlessly integrated with ZaloPay for secure premium upgrades, unlocking advanced diets and ad-free experiences.
- **Admin Dashboard (Web):** A React-based web dashboard for administrators to monitor user statistics and manage user accounts.
- **Multi-language Support:** Fully localized in English and Vietnamese.

## 🛠️ Tech Stack

- **Mobile App:** Flutter, Provider, Google ML Kit (Pose Detection), ZaloPay Integration
- **Web Frontend:** React, Vite, CSS
- **Backend:** FastAPI (Python), SQLAlchemy, PostgreSQL
- **Infrastructure:** Docker, Docker Compose, NeonDB

---

## 💻 Getting Started

Follow the instructions below to set up and run the project locally.

### 1. Backend Setup

The backend runs on FastAPI and uses a PostgreSQL database. The easiest way to get it running is via Docker.

```bash
# Navigate to the project root
cd health-tracking-and-coach

# Start the backend and database using Docker Compose
docker-compose up -d --build
```

*(Alternatively, to run the backend without Docker)*:
```bash
cd apps/backend
pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```
*Note: Ensure you have your `.env` variables or Database URL configured correctly.*

### 2. Web Frontend Setup

The web dashboard is built with React and Vite.

```bash
# Navigate to the frontend directory
cd apps/frontend

# Install dependencies
npm install

# Start the development server
npm run dev
```
The web app will be accessible at `http://localhost:5173`.

### 3. Mobile App Setup

The mobile application is built using Flutter.

```bash
# Navigate to the mobile directory
cd apps/mobile

# Get Flutter dependencies
flutter pub get

# Run the app on an attached device or emulator
flutter run
```

---

## 📱 Wireless Debugging (Mobile)

If you prefer to debug the mobile application without a USB cable:
1. Connect your phone and PC to the same Wi-Fi network.
2. Enable **Wireless Debugging** in your Android Developer Options.
3. Pair your device using `adb pair [IP:PORT]` with the provided pairing code.
4. Connect using `adb connect [IP:PORT]`.
5. Run `flutter run`.

## 📄 License

This project is created for educational and final project purposes. All rights reserved.